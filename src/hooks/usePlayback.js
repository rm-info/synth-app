import { useCallback, useEffect, useRef, useState } from 'react'
import { pointsToPeriodicWave, audioBufferToWav, downloadWav } from '../audio'

const BEATS_PER_MEASURE = 4

function beatToSeconds(beats, bpm) {
  return (beats * 60) / bpm
}

function clipBeatOffset(clip) {
  return (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
}

function scheduleClips(ctx, clips, savedSounds, startTime, destination, bpm) {
  const nodes = []
  for (const clip of clips) {
    const sound = savedSounds.find((s) => s.id === clip.soundId)
    if (!sound) continue

    const wave = pointsToPeriodicWave(sound.points, ctx)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(wave)

    const beatOffset = clipBeatOffset(clip)
    const clipStart = startTime + beatToSeconds(beatOffset, bpm)
    const a = (sound.attack ?? 10) / 1000
    const d = (sound.decay ?? 100) / 1000
    const r = (sound.release ?? 100) / 1000
    const sus = sound.sustain ?? 0.7
    const amp = sound.amplitude
    const sustainLevel = sus * amp
    const placedDuration = beatToSeconds(clip.duration, bpm)
    const minDuration = a + d + r
    const totalDuration = Math.max(placedDuration, minDuration)
    const releaseStart = clipStart + totalDuration - r

    osc.frequency.setValueAtTime(sound.frequency, clipStart)
    gain.gain.setValueAtTime(0, clipStart)
    gain.gain.linearRampToValueAtTime(amp, clipStart + a)
    gain.gain.linearRampToValueAtTime(sustainLevel, clipStart + a + d)
    gain.gain.linearRampToValueAtTime(sustainLevel, releaseStart)
    gain.gain.linearRampToValueAtTime(0, clipStart + totalDuration)

    osc.connect(gain)
    gain.connect(destination)
    osc.start(clipStart)
    osc.stop(clipStart + totalDuration)

    nodes.push({ osc, gain })
  }
  return nodes
}

/**
 * Hook moteur de lecture timeline : partagé entre le Mini-player (Designer)
 * et la Toolbar (Composer). UNE seule instance dans App, pour qu'un Play depuis
 * Designer puisse être stoppé depuis Composer (et inversement) — et surtout
 * pour ne pas dupliquer l'AudioContext.
 */
export function usePlayback({ clips, savedSounds, bpm, totalDurationSec }) {
  const audioCtxRef = useRef(null)
  const scheduledNodesRef = useRef([])
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const analyserGainRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const stop = useCallback(() => {
    for (const node of scheduledNodesRef.current) {
      try { node.osc.stop() } catch { /* already stopped */ }
      try { node.osc.disconnect() } catch { /* already disconnected */ }
      try { node.gain.disconnect() } catch { /* already disconnected */ }
    }
    scheduledNodesRef.current = []
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (analyserGainRef.current) {
      try { analyserGainRef.current.disconnect() } catch { /* idem */ }
      analyserGainRef.current = null
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect() } catch { /* idem */ }
      analyserRef.current = null
    }
    setIsPlaying(false)
    setCursorPos(0)
    setCurrentTime(0)
  }, [])

  const play = useCallback(() => {
    if (clips.length === 0) return

    const ctx = audioCtxRef.current || new AudioContext()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()

    const analyserGain = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserGain.connect(analyser)
    analyserGain.connect(ctx.destination)
    analyserRef.current = analyser
    analyserGainRef.current = analyserGain

    const startTime = ctx.currentTime + 0.05
    const nodes = scheduleClips(ctx, clips, savedSounds, startTime, analyserGain, bpm)
    scheduledNodesRef.current = nodes
    setIsPlaying(true)
    setCursorPos(0)
    setCurrentTime(0)

    const animate = () => {
      const elapsed = ctx.currentTime - startTime
      if (elapsed >= totalDurationSec) {
        stop()
        return
      }
      setCursorPos(elapsed / totalDurationSec)
      setCurrentTime(elapsed)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [clips, savedSounds, bpm, totalDurationSec, stop])

  const exportWav = useCallback(async () => {
    if (clips.length === 0 || isExporting) return
    setIsExporting(true)
    try {
      const sampleRate = 44100
      const offlineCtx = new OfflineAudioContext(
        2,
        Math.ceil(sampleRate * totalDurationSec),
        sampleRate,
      )
      scheduleClips(offlineCtx, clips, savedSounds, 0, offlineCtx.destination, bpm)
      const renderedBuffer = await offlineCtx.startRendering()
      const wav = audioBufferToWav(renderedBuffer)
      downloadWav(wav, 'composition.wav')
    } finally {
      setIsExporting(false)
    }
  }, [clips, savedSounds, bpm, totalDurationSec, isExporting])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      for (const node of scheduledNodesRef.current) {
        try { node.osc.stop() } catch { /* already stopped */ }
        try { node.osc.disconnect() } catch { /* idem */ }
        try { node.gain.disconnect() } catch { /* idem */ }
      }
    }
  }, [])

  return {
    isPlaying,
    cursorPos,
    currentTime,
    isExporting,
    analyserRef,
    play,
    stop,
    exportWav,
  }
}
