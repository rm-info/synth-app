import { useCallback, useEffect, useRef, useState } from 'react'
import { pointsToPeriodicWave, audioBufferToWav, downloadWav } from '../audio'

const BEATS_PER_MEASURE = 4
const LOOK_AHEAD = 0.1    // seconds of audio to schedule ahead
const SCHED_INTERVAL = 25 // ms between scheduler ticks

function beatToSeconds(beats, bpm) {
  return (beats * 60) / bpm
}

function clipBeatOffset(clip) {
  return (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
}

function trackPlays(track, anySolo) {
  if (track.muted) return false
  if (anySolo && !track.solo) return false
  return true
}

/**
 * Schedule a single clip into the audio context. Returns { osc, gain, clipId }
 * or null if the clip's track is muted.
 */
function scheduleOneClip(ctx, clip, sound, startTime, trackGainNodes, defaultDest, bpm, tracks) {
  const track = tracks.find(t => t.id === clip.trackId)
  const anySolo = tracks.some(t => t.solo)
  if (track && !trackPlays(track, anySolo)) return null

  const dest = trackGainNodes?.[clip.trackId] ?? defaultDest

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
  gain.connect(dest)
  osc.start(clipStart)
  osc.stop(clipStart + totalDuration)

  return { osc, gain, clipId: clip.id, endTime: clipStart + totalDuration }
}

/**
 * One-shot schedule all clips (used for WAV export only).
 */
function scheduleAllClips(ctx, clips, savedSounds, startTime, trackGainNodes, defaultDest, bpm, tracks) {
  const nodes = []
  const anySolo = tracks.some(t => t.solo)
  for (const clip of clips) {
    const sound = savedSounds.find(s => s.id === clip.soundId)
    if (!sound) continue
    const track = tracks.find(t => t.id === clip.trackId)
    if (track && !trackPlays(track, anySolo)) continue

    const dest = trackGainNodes?.[clip.trackId] ?? defaultDest
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
    gain.connect(dest)
    osc.start(clipStart)
    osc.stop(clipStart + totalDuration)

    nodes.push({ osc, gain })
  }
  return nodes
}

/**
 * Hook moteur de lecture timeline avec scheduler look-ahead.
 *
 * Au lieu de programmer tous les clips d'un coup au play(), un scheduler
 * tourne en boucle (setInterval 25ms) et programme les clips dans une
 * fenêtre d'avance de 100ms. Cela permet de réagir aux modifications
 * du state (clips, tracks, sons) en temps réel pendant la lecture.
 */
export function usePlayback({ clips, savedSounds, tracks, bpm, totalDurationSec }) {
  const audioCtxRef = useRef(null)
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const analyserGainRef = useRef(null)
  const trackGainNodesRef = useRef({})

  // Scheduler state (refs for access inside setInterval)
  const schedulerTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const scheduledClipIdsRef = useRef(new Set())
  const activeNodesRef = useRef([]) // [{ osc, gain, clipId, endTime }]
  const prevClipsRef = useRef(null) // for change detection

  // Refs for fresh state inside scheduler tick
  const clipsRef = useRef(clips)
  useEffect(() => { clipsRef.current = clips }, [clips])
  const tracksRef = useRef(tracks)
  useEffect(() => { tracksRef.current = tracks }, [tracks])
  const savedSoundsRef = useRef(savedSounds)
  useEffect(() => { savedSoundsRef.current = savedSounds }, [savedSounds])
  const bpmRef = useRef(bpm)
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  const totalDurationRef = useRef(totalDurationSec)
  useEffect(() => { totalDurationRef.current = totalDurationSec }, [totalDurationSec])

  const [isPlaying, setIsPlaying] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const stopScheduler = useCallback(() => {
    if (schedulerTimerRef.current != null) {
      clearInterval(schedulerTimerRef.current)
      schedulerTimerRef.current = null
    }
    // Stop all active oscillators
    for (const node of activeNodesRef.current) {
      try { node.osc.stop() } catch { /* already stopped */ }
      try { node.osc.disconnect() } catch { /* disconnected */ }
      try { node.gain.disconnect() } catch { /* disconnected */ }
    }
    activeNodesRef.current = []
    scheduledClipIdsRef.current.clear()
    prevClipsRef.current = null
  }, [])

  const stop = useCallback(() => {
    stopScheduler()
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    for (const gn of Object.values(trackGainNodesRef.current)) {
      try { gn.disconnect() } catch { /* idem */ }
    }
    trackGainNodesRef.current = {}
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
  }, [stopScheduler])

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

    // Create per-track gain nodes
    const anySolo = tracks.some(t => t.solo)
    const tgNodes = {}
    for (const track of tracks) {
      const gn = ctx.createGain()
      gn.gain.value = trackPlays(track, anySolo) ? track.volume : 0
      gn.connect(analyserGain)
      tgNodes[track.id] = gn
    }
    trackGainNodesRef.current = tgNodes

    const startTime = ctx.currentTime + 0.05
    startTimeRef.current = startTime
    scheduledClipIdsRef.current.clear()
    activeNodesRef.current = []
    prevClipsRef.current = clipsRef.current

    setIsPlaying(true)
    setCursorPos(0)
    setCurrentTime(0)

    // --- Scheduler look-ahead ---
    const schedulerTick = () => {
      const now = ctx.currentTime
      const elapsed = now - startTime
      if (elapsed >= totalDurationRef.current) {
        // Will be caught by the animation loop
        return
      }

      const currentClips = clipsRef.current
      const currentTracks = tracksRef.current
      const currentSounds = savedSoundsRef.current
      const currentBpm = bpmRef.current

      // Detect clip changes: invalidate scheduled clips that were modified/removed
      if (currentClips !== prevClipsRef.current) {
        const currentIds = new Set(currentClips.map(c => c.id))
        // Build a signature map for current clips to detect modifications
        const currentSigMap = new Map()
        for (const c of currentClips) {
          currentSigMap.set(c.id, `${c.measure}:${c.beat}:${c.duration}:${c.soundId}:${c.trackId}`)
        }
        const prevSigMap = new Map()
        if (prevClipsRef.current) {
          for (const c of prevClipsRef.current) {
            prevSigMap.set(c.id, `${c.measure}:${c.beat}:${c.duration}:${c.soundId}:${c.trackId}`)
          }
        }

        // Find removed or modified clip IDs
        const invalidIds = new Set()
        for (const id of scheduledClipIdsRef.current) {
          if (!currentIds.has(id)) {
            invalidIds.add(id) // removed
          } else if (currentSigMap.get(id) !== prevSigMap.get(id)) {
            invalidIds.add(id) // modified
          }
        }

        // Cancel oscillators for invalid clips
        if (invalidIds.size > 0) {
          for (const id of invalidIds) {
            scheduledClipIdsRef.current.delete(id)
          }
          const toRemove = []
          for (let i = activeNodesRef.current.length - 1; i >= 0; i--) {
            const node = activeNodesRef.current[i]
            if (invalidIds.has(node.clipId)) {
              try { node.osc.stop() } catch { /* already stopped */ }
              try { node.osc.disconnect() } catch { /* disconnected */ }
              try { node.gain.disconnect() } catch { /* disconnected */ }
              toRemove.push(i)
            }
          }
          for (const idx of toRemove) {
            activeNodesRef.current.splice(idx, 1)
          }
        }

        prevClipsRef.current = currentClips
      }

      // Purge ended oscillators
      for (let i = activeNodesRef.current.length - 1; i >= 0; i--) {
        if (activeNodesRef.current[i].endTime <= now) {
          activeNodesRef.current.splice(i, 1)
        }
      }

      // Schedule clips in the look-ahead window
      const scheduleUntilSec = elapsed + LOOK_AHEAD
      for (const clip of currentClips) {
        if (scheduledClipIdsRef.current.has(clip.id)) continue
        const clipStartSec = beatToSeconds(clipBeatOffset(clip), currentBpm)
        if (clipStartSec >= elapsed && clipStartSec < scheduleUntilSec) {
          const sound = currentSounds.find(s => s.id === clip.soundId)
          if (!sound) continue
          const result = scheduleOneClip(
            ctx, clip, sound, startTime, tgNodes, analyserGain, currentBpm, currentTracks,
          )
          if (result) {
            activeNodesRef.current.push(result)
          }
          scheduledClipIdsRef.current.add(clip.id)
        }
      }
    }

    // Run first tick immediately
    schedulerTick()
    schedulerTimerRef.current = setInterval(schedulerTick, SCHED_INTERVAL)

    // --- Cursor animation (unchanged) ---
    const animate = () => {
      const elapsed = ctx.currentTime - startTime
      if (elapsed >= totalDurationRef.current) {
        stop()
        return
      }
      setCursorPos(elapsed / totalDurationRef.current)
      setCurrentTime(elapsed)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [clips, tracks, stop])

  // Update track gains in real-time when tracks change (mute/solo/volume)
  const updateTrackGains = useCallback((currentTracks) => {
    const tgNodes = trackGainNodesRef.current
    if (!tgNodes || Object.keys(tgNodes).length === 0) return
    const anySolo = currentTracks.some(t => t.solo)
    for (const track of currentTracks) {
      const gn = tgNodes[track.id]
      if (gn) {
        gn.gain.value = trackPlays(track, anySolo) ? track.volume : 0
      }
    }
  }, [])

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

      const anySolo = tracks.some(t => t.solo)
      const tgNodes = {}
      for (const track of tracks) {
        const gn = offlineCtx.createGain()
        gn.gain.value = trackPlays(track, anySolo) ? track.volume : 0
        gn.connect(offlineCtx.destination)
        tgNodes[track.id] = gn
      }

      scheduleAllClips(offlineCtx, clips, savedSounds, 0, tgNodes, offlineCtx.destination, bpm, tracks)
      const renderedBuffer = await offlineCtx.startRendering()
      const wav = audioBufferToWav(renderedBuffer)
      downloadWav(wav, 'composition.wav')
    } finally {
      setIsExporting(false)
    }
  }, [clips, savedSounds, tracks, bpm, totalDurationSec, isExporting])

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current != null) clearInterval(schedulerTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      for (const node of activeNodesRef.current) {
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
    updateTrackGains,
  }
}
