import { useCallback, useEffect, useRef, useState } from 'react'
import { pointsToPeriodicWave, audioBufferToWav, normalizePeak, downloadWav, MIN_ATTACK, MIN_RELEASE, createMasterBus } from '../audio'
import { clipFrequency } from '../reducer'
import { applyModulation } from '../lib/modulation'
import { configureBiquad } from '../lib/filter'
import { connectDistortion } from '../lib/distortion'

// Stoppe/déconnecte les nœuds LFO d'un record de voix (symétrique à osc/gain).
// `m.stop()` n'existe que sur les OscillatorNode → try/catch absorbe les GainNode.
function stopModNodes(mod) {
  if (!mod) return
  for (const m of mod) {
    try { m.stop() } catch { /* GainNode ou déjà stoppé */ }
    try { m.disconnect() } catch { /* déjà déconnecté */ }
  }
}

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
 *
 * La hauteur est portée par le clip (clipFrequency) — le patch ne définit
 * que la forme (points + ADSR + amplitude + preset).
 */
function scheduleOneClip(ctx, clip, patch, startTime, trackGainNodes, defaultDest, bpm, tracks, a4Ref, xEdoN) {
  const track = tracks.find(t => t.id === clip.trackId)
  const anySolo = tracks.some(t => t.solo)
  if (track && !trackPlays(track, anySolo)) return null

  const dest = trackGainNodes?.[clip.trackId] ?? defaultDest

  // patch.cap borne les harmoniques à la synthèse (sinon 256 par défaut → leakage
  // spectral [cap+1..256] audible, exacerbé par les pics > ±1). scheduleAllClips
  // le passe déjà ; scheduleOneClip l'oubliait.
  const wave = pointsToPeriodicWave(patch.canonical, ctx, patch.cap)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.setPeriodicWave(wave)

  const beatOffset = clipBeatOffset(clip)
  const clipStart = startTime + beatToSeconds(beatOffset, bpm)
  const a = Math.max((patch.attack ?? 10) / 1000, MIN_ATTACK)
  const h = (patch.hold ?? 0) / 1000
  const d = (patch.decay ?? 100) / 1000
  const r = Math.max((patch.release ?? 100) / 1000, MIN_RELEASE) // S.audio.2 : plancher anti-clic (releaseStart < stopTime)
  const sus = patch.sustain ?? 0.7
  const amp = patch.amplitude
  const sustainLevel = sus * amp
  const placedDuration = beatToSeconds(clip.duration, bpm)
  const minDuration = a + h + d + r
  const totalDuration = Math.max(placedDuration, minDuration)
  const releaseStart = clipStart + totalDuration - r

  osc.frequency.setValueAtTime(clipFrequency(clip, a4Ref, xEdoN), clipStart)
  gain.gain.setValueAtTime(0, clipStart)
  gain.gain.linearRampToValueAtTime(amp, clipStart + a)
  gain.gain.linearRampToValueAtTime(amp, clipStart + a + h)
  gain.gain.linearRampToValueAtTime(sustainLevel, clipStart + a + h + d)
  gain.gain.linearRampToValueAtTime(sustainLevel, releaseStart)
  gain.gain.linearRampToValueAtTime(0, clipStart + totalDuration)

  // Filtre statique (itération T, T.4) : BiquadFilter inséré conditionnellement
  // selon la convention VCO→VCF→VCA — osc → biquad → gain. Désactivé → aucun nœud,
  // chaîne bit-identique. À résonance haute le biquad AJOUTE du gain au cutoff
  // (~+26 dB) ; le filet est le master headroom-bas + soft-clip sans mémoire
  // (iter S) → pas de pompage.
  const flt = patch.filter
  let biquad = null
  if (flt && flt.enabled) {
    biquad = ctx.createBiquadFilter()
    configureBiquad(biquad, flt)
    biquad.connect(gain)
  }
  // Distorsion (T.6) : insérée AVANT le filtre. La source (osc) alimente le shaper
  // (split wet/dry) puis le filtre (ou directement le gain si pas de filtre). Off →
  // osc → chainHead direct (chaîne bit-identique). Nœuds dans `mod` (cleanup symétrique).
  const chainHead = biquad ?? gain
  const distNodes = connectDistortion(ctx, osc, chainHead, patch.distortion)

  // Auto-pan (itération T) : 1ᵉʳ effet stéréo. Le panner n'est inséré QUE si
  // l'effet est actif et a une excursion — sinon chaîne bit-identique à avant
  // (mono, zéro coût). osc → gain → panner → dest.
  const ap = patch.autoPan
  let panner = null
  if (ap && ap.enabled && ap.depth > 0) {
    panner = ctx.createStereoPanner()
    gain.connect(panner)
    panner.connect(dest)
  } else {
    gain.connect(dest)
  }

  // Modulations LFO (itération P) : branchées après la programmation de
  // l'enveloppe, avant osc.start(). stopTime fourni → extinction programmée.
  const { nodes: mod } = applyModulation(ctx, {
    osc, gain, panner, biquad,
    vibrato: patch.vibrato, tremolo: patch.tremolo, autoPan: patch.autoPan, pitchEnv: patch.pitchEnv,
    filterEnv: patch.filterEnv, wah: patch.wah,
    startTime: clipStart, stopTime: clipStart + totalDuration, releaseStart, baseAmplitude: amp,
  })
  // Cleanup symétrique : panner, biquad ET les nœuds de distorsion sont déconnectés
  // partout où l'osc l'est (stopModNodes tolère l'absence de .stop(), comme le panner).
  if (panner) mod.push(panner)
  if (biquad) mod.push(biquad)
  mod.push(...distNodes)

  osc.start(clipStart)
  osc.stop(clipStart + totalDuration)

  return { osc, gain, clipId: clip.id, endTime: clipStart + totalDuration, mod }
}

/**
 * One-shot schedule all clips (used for WAV export only).
 */
function scheduleAllClips(ctx, clips, patches, startTime, trackGainNodes, defaultDest, bpm, tracks, a4Ref, xEdoN) {
  const nodes = []
  const anySolo = tracks.some(t => t.solo)
  for (const clip of clips) {
    const patch = patches.find(p => p.id === clip.patchId)
    if (!patch) continue
    const track = tracks.find(t => t.id === clip.trackId)
    if (track && !trackPlays(track, anySolo)) continue

    const dest = trackGainNodes?.[clip.trackId] ?? defaultDest
    const wave = pointsToPeriodicWave(patch.canonical, ctx, patch.cap)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(wave)

    const beatOffset = clipBeatOffset(clip)
    const clipStart = startTime + beatToSeconds(beatOffset, bpm)
    const a = Math.max((patch.attack ?? 10) / 1000, MIN_ATTACK)
    const h = (patch.hold ?? 0) / 1000
    const d = (patch.decay ?? 100) / 1000
    const r = Math.max((patch.release ?? 100) / 1000, MIN_RELEASE) // S.audio.2 : plancher anti-clic (releaseStart < stopTime)
    const sus = patch.sustain ?? 0.7
    const amp = patch.amplitude
    const sustainLevel = sus * amp
    const placedDuration = beatToSeconds(clip.duration, bpm)
    const minDuration = a + h + d + r
    const totalDuration = Math.max(placedDuration, minDuration)
    const releaseStart = clipStart + totalDuration - r

    osc.frequency.setValueAtTime(clipFrequency(clip, a4Ref, xEdoN), clipStart)
    gain.gain.setValueAtTime(0, clipStart)
    gain.gain.linearRampToValueAtTime(amp, clipStart + a)
    gain.gain.linearRampToValueAtTime(amp, clipStart + a + h)
    gain.gain.linearRampToValueAtTime(sustainLevel, clipStart + a + h + d)
    gain.gain.linearRampToValueAtTime(sustainLevel, releaseStart)
    gain.gain.linearRampToValueAtTime(0, clipStart + totalDuration)

    // Filtre statique (T.4) : MÊME insertion conditionnelle qu'en lecture, sinon
    // l'export WAV diverge. Pas de cleanup (ctx jeté après rendu).
    const flt = patch.filter
    let biquad = null
    if (flt && flt.enabled) {
      biquad = ctx.createBiquadFilter()
      configureBiquad(biquad, flt)
      biquad.connect(gain)
    }
    // Distorsion (T.6) : MÊME insertion conditionnelle qu'en lecture (avant le filtre),
    // sinon l'export WAV diverge. Pas de cleanup (ctx jeté après rendu).
    connectDistortion(ctx, osc, biquad ?? gain, patch.distortion)

    // Auto-pan (itération T) : même insertion conditionnelle qu'en lecture.
    // L'OfflineAudioContext est stéréo (2 canaux) → le WAV exporté porte la
    // stéréo. Pas de cleanup (ctx jeté après rendu).
    const ap = patch.autoPan
    let panner = null
    if (ap && ap.enabled && ap.depth > 0) {
      panner = ctx.createStereoPanner()
      gain.connect(panner)
      panner.connect(dest)
    } else {
      gain.connect(dest)
    }

    // Modulations LFO (itération P) — MÊME helper que scheduleOneClip, sinon
    // l'export WAV diverge de la lecture timeline (régression classique du code
    // dupliqué). Pas de cleanup manuel : l'OfflineAudioContext est jeté après
    // rendu, seul lfo.start/stop programmé suffit.
    applyModulation(ctx, {
      osc, gain, panner, biquad,
      vibrato: patch.vibrato, tremolo: patch.tremolo, autoPan: patch.autoPan, pitchEnv: patch.pitchEnv,
      filterEnv: patch.filterEnv, wah: patch.wah,
      startTime: clipStart, stopTime: clipStart + totalDuration, releaseStart, baseAmplitude: amp,
    })

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
 * du state (clips, tracks, patches) en temps réel pendant la lecture.
 */
export function usePlayback({ clips, patches, tracks, bpm, a4Ref, xEdoN, totalDurationSec }) {
  const audioCtxRef = useRef(null)
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const analyserGainRef = useRef(null)
  const masterBusRef = useRef(null) // S.audio : headroom + limiteur master (lecture)
  const trackGainNodesRef = useRef({})

  // Scheduler state (refs for access inside setInterval)
  const schedulerTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const scheduledClipIdsRef = useRef(new Set())
  const activeNodesRef = useRef([]) // [{ osc, gain, clipId, endTime }]
  const prevClipsRef = useRef(null) // for change detection
  // F.3.12.1 : on tracke aussi les patches pour détecter les changements
  // d'enveloppe (attack, hold, decay, sustain, release, amplitude) en cours
  // de lecture — les clips affectés sont re-schedulés à la volée.
  const prevPatchesRef = useRef(null)

  // Refs for fresh state inside scheduler tick
  const clipsRef = useRef(clips)
  useEffect(() => { clipsRef.current = clips }, [clips])
  const tracksRef = useRef(tracks)
  useEffect(() => { tracksRef.current = tracks }, [tracks])
  const patchesRef = useRef(patches)
  useEffect(() => { patchesRef.current = patches }, [patches])
  const bpmRef = useRef(bpm)
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  // a4Ref lu au tick du scheduler. Un changement d'A4 pendant la lecture
  // prendra effet sur les clips schedulés après le changement (lag maxi =
  // fenêtre de look-ahead, 100ms). Les oscillators déjà démarrés gardent leur
  // fréquence initiale.
  const a4RefRef = useRef(a4Ref)
  useEffect(() => { a4RefRef.current = a4Ref }, [a4Ref])
  // F.8.1.3 : nombre de degrés du système X-EDO. Même contrainte que a4Ref :
  // changement pris en compte sur les clips schedulés après modification (lag
  // ≤ 100ms), les oscillators déjà démarrés gardent leur fréquence.
  const xEdoNRef = useRef(xEdoN)
  useEffect(() => { xEdoNRef.current = xEdoN }, [xEdoN])
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
    for (const node of activeNodesRef.current) {
      try { node.osc.stop() } catch { /* already stopped */ }
      try { node.osc.disconnect() } catch { /* disconnected */ }
      try { node.gain.disconnect() } catch { /* disconnected */ }
      stopModNodes(node.mod)
    }
    activeNodesRef.current = []
    scheduledClipIdsRef.current.clear()
    prevClipsRef.current = null
    prevPatchesRef.current = null
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
    if (masterBusRef.current) {
      try { masterBusRef.current.input.disconnect() } catch { /* idem */ }
      try { masterBusRef.current.output.disconnect() } catch { /* idem */ }
      masterBusRef.current = null
    }
    setIsPlaying(false)
    setCursorPos(0)
    setCurrentTime(0)
  }, [stopScheduler])

  const play = useCallback(() => {
    if (clips.length === 0) return

    // S.audio.4.2 — latencyHint numérique (s) : plus petit tampon qui garde
    // l'underrun de tenue mort, sans la latence excessive de 'playback'. Départ
    // 0.02, à monter par paliers si besoin. (OfflineAudioContext export non concerné.)
    const ctx = audioCtxRef.current || new AudioContext({ latencyHint: 0.02 })
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()

    const analyserGain = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserGain.connect(analyser) // analyser EN AMONT du master → spectro honnête
    // S.audio : master bus (headroom + limiteur) entre la somme des pistes et la sortie.
    const bus = createMasterBus(ctx)
    analyserGain.connect(bus.input)
    bus.output.connect(ctx.destination)
    analyserRef.current = analyser
    analyserGainRef.current = analyserGain
    masterBusRef.current = bus

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
    prevPatchesRef.current = patchesRef.current

    setIsPlaying(true)
    setCursorPos(0)
    setCurrentTime(0)

    const schedulerTick = () => {
      const now = ctx.currentTime
      const elapsed = now - startTime
      if (elapsed >= totalDurationRef.current) {
        return
      }

      const currentClips = clipsRef.current
      const currentTracks = tracksRef.current
      const currentPatches = patchesRef.current
      const currentBpm = bpmRef.current

      if (currentClips !== prevClipsRef.current || currentPatches !== prevPatchesRef.current) {
        // La signature inclut l'enveloppe du patch référencé (F.3.12.1) ET ses
        // modulations LFO (itération P/T) : changer hold/attack/decay/sustain/
        // release/amplitude OU le vibrato/trémolo/auto-pan d'un patch utilisé en
        // cours de lecture re-schedule les clips à venir (même mécanique que l'AHDSR).
        const sigOfLfo = (l) => l ? `${l.enabled ? 1 : 0}:${l.rate}:${l.depth}:${l.onset}:${l.shape}` : ''
        // T.3/T.5 : ParamEnv (pitchEnv | filterEnv) — champs amount/time/invert/curve.
        const sigOfParamEnv = (pe) => pe ? `${pe.enabled ? 1 : 0}:${pe.amount}:${pe.time}:${pe.invert ? 1 : 0}:${pe.curve ?? 'linear'}` : ''
        // T.4 : filtre statique (type/cutoff/q). Éditer le filtre d'un patch en cours
        // de lecture re-schedule les clips à venir (le biquad est posé à la création
        // de la voix → seul un re-schedule applique le changement). T.5 : idem env de
        // filtre + wah (modulent biquad.detune, posés à la création de la voix).
        const sigOfFilter = (f) => f ? `${f.enabled ? 1 : 0}:${f.type}:${f.cutoff}:${f.q}` : ''
        // T.6 : distorsion (curve/drive/mix). Le shaper est posé à la création de la voix
        // → seul un re-schedule applique le changement (comme le filtre).
        const sigOfDistortion = (d) => d ? `${d.enabled ? 1 : 0}:${d.curve}:${d.drive}:${d.mix}` : ''
        const sigOf = (c, patchList) => {
          const p = patchList?.find(p => p.id === c.patchId)
          const env = p
            ? `${p.attack}:${p.hold ?? 0}:${p.decay}:${p.sustain}:${p.release}:${p.amplitude}|${sigOfLfo(p.vibrato)}|${sigOfLfo(p.tremolo)}|${sigOfLfo(p.autoPan)}|${sigOfParamEnv(p.pitchEnv)}|${sigOfFilter(p.filter)}|${sigOfParamEnv(p.filterEnv)}|${sigOfLfo(p.wah)}|${sigOfDistortion(p.distortion)}`
            : ''
          return `${c.measure}:${c.beat}:${c.duration}:${c.patchId}:${c.trackId}:${c.tuningSystem}:${c.noteIndex}:${c.octave}:${c.frequency}|${env}`
        }
        const currentIds = new Set(currentClips.map(c => c.id))
        const currentSigMap = new Map()
        for (const c of currentClips) {
          currentSigMap.set(c.id, sigOf(c, currentPatches))
        }
        const prevSigMap = new Map()
        if (prevClipsRef.current) {
          for (const c of prevClipsRef.current) {
            prevSigMap.set(c.id, sigOf(c, prevPatchesRef.current))
          }
        }

        const invalidIds = new Set()
        for (const id of scheduledClipIdsRef.current) {
          if (!currentIds.has(id)) {
            invalidIds.add(id)
          } else if (currentSigMap.get(id) !== prevSigMap.get(id)) {
            invalidIds.add(id)
          }
        }

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
              stopModNodes(node.mod)
              toRemove.push(i)
            }
          }
          for (const idx of toRemove) {
            activeNodesRef.current.splice(idx, 1)
          }
        }

        prevClipsRef.current = currentClips
        prevPatchesRef.current = currentPatches
      }

      for (let i = activeNodesRef.current.length - 1; i >= 0; i--) {
        if (activeNodesRef.current[i].endTime <= now) {
          activeNodesRef.current.splice(i, 1)
        }
      }

      const scheduleUntilSec = elapsed + LOOK_AHEAD
      for (const clip of currentClips) {
        if (scheduledClipIdsRef.current.has(clip.id)) continue
        const clipStartSec = beatToSeconds(clipBeatOffset(clip), currentBpm)
        if (clipStartSec >= elapsed && clipStartSec < scheduleUntilSec) {
          const patch = currentPatches.find(p => p.id === clip.patchId)
          if (!patch) continue
          const result = scheduleOneClip(
            ctx, clip, patch, startTime, tgNodes, analyserGain, currentBpm, currentTracks, a4RefRef.current, xEdoNRef.current,
          )
          if (result) {
            activeNodesRef.current.push(result)
          }
          scheduledClipIdsRef.current.add(clip.id)
        }
      }
    }

    schedulerTick()
    schedulerTimerRef.current = setInterval(schedulerTick, SCHED_INTERVAL)

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

      // S.audio : même master bus que le live (headroom + limiteur) → export ==
      // ce qu'on entend. TOUT ce qui visait offlineCtx.destination passe par bus.input.
      const bus = createMasterBus(offlineCtx)

      const anySolo = tracks.some(t => t.solo)
      const tgNodes = {}
      for (const track of tracks) {
        const gn = offlineCtx.createGain()
        gn.gain.value = trackPlays(track, anySolo) ? track.volume : 0
        gn.connect(bus.input)
        tgNodes[track.id] = gn
      }

      // defaultDest = bus.input (clips orphelins sans piste passent aussi par le master).
      scheduleAllClips(offlineCtx, clips, patches, 0, tgNodes, bus.input, bpm, tracks, a4Ref, xEdoN)
      bus.output.connect(offlineCtx.destination)
      const renderedBuffer = await offlineCtx.startRendering()
      normalizePeak(renderedBuffer)            // <-- AVANT l'encodage : rend propre & fort
      const wav = audioBufferToWav(renderedBuffer)
      downloadWav(wav, 'composition.wav')
    } finally {
      setIsExporting(false)
    }
  }, [clips, patches, tracks, bpm, a4Ref, xEdoN, totalDurationSec, isExporting])

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current != null) clearInterval(schedulerTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      for (const node of activeNodesRef.current) {
        try { node.osc.stop() } catch { /* already stopped */ }
        try { node.osc.disconnect() } catch { /* idem */ }
        try { node.gain.disconnect() } catch { /* idem */ }
        stopModNodes(node.mod)
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
