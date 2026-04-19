import { BEATS_PER_MEASURE } from '../reducer'

export const SNAP_RESOLUTION = 0.25 // 16ᵉ
export const MIN_CLIP_DURATION = 0.25

function clipBeatOffset(clip) {
  return (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
}

/**
 * Lane assignment greedy pour la polyphonie visuelle. Les clips sont triés
 * par position puis placés dans la première lane qui se libère. Retourne les
 * items enrichis avec { clip, patch, start, end, lane }.
 */
export function layoutClips(clips, patches) {
  const enriched = clips
    .map((clip) => {
      const patch = patches.find((p) => p.id === clip.patchId)
      if (!patch) return null
      const start = clipBeatOffset(clip)
      const end = start + clip.duration
      return { clip, patch, start, end }
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)

  const lanes = []
  const result = []
  for (const item of enriched) {
    let lane = 0
    while (lane < lanes.length && lanes[lane] > item.start) lane++
    if (lane === lanes.length) lanes.push(item.end)
    else lanes[lane] = item.end
    result.push({ ...item, lane })
  }
  return { items: result, laneCount: Math.max(1, lanes.length) }
}

/**
 * Vérifie si les clips sélectionnés peuvent être fusionnés :
 * - >= 2 clips sélectionnés
 * - Même patchId
 * - Même hauteur (tuningSystem + note/octave ou frequency)
 * - Exactement adjacents (fin de l'un = début du suivant, triés par position)
 */
export function canMergeClips(clips, selectedIds) {
  if (!selectedIds || selectedIds.length < 2) {
    return { canMerge: false, reason: 'Sélectionnez au moins 2 clips' }
  }
  const idSet = new Set(selectedIds)
  const selected = clips.filter((c) => idSet.has(c.id))
  if (selected.length < 2) {
    return { canMerge: false, reason: 'Sélectionnez au moins 2 clips' }
  }

  const firstTrackId = selected[0].trackId
  if (!selected.every((c) => c.trackId === firstTrackId)) {
    return { canMerge: false, reason: 'Pistes différentes' }
  }

  const firstPatchId = selected[0].patchId
  if (!selected.every((c) => c.patchId === firstPatchId)) {
    return { canMerge: false, reason: 'Patches différents' }
  }

  const first = selected[0]
  const sameNote = selected.every((c) =>
    c.tuningSystem === first.tuningSystem &&
    c.noteIndex === first.noteIndex &&
    c.octave === first.octave &&
    c.frequency === first.frequency,
  )
  if (!sameNote) {
    return { canMerge: false, reason: 'Hauteurs différentes' }
  }

  const sorted = selected
    .map((c) => ({
      id: c.id,
      start: (c.measure - 1) * BEATS_PER_MEASURE + c.beat,
      duration: c.duration,
    }))
    .sort((a, b) => a.start - b.start)

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].start + sorted[i - 1].duration
    const curStart = sorted[i].start
    if (Math.abs(prevEnd - curStart) > 1e-9) {
      return { canMerge: false, reason: 'Clips non adjacents' }
    }
  }

  return { canMerge: true }
}

/**
 * Bornes de resize pour un clip :
 *   - minStartLeft : fin du clip précédent dans la même lane (ou 0)
 *   - maxDurationRight : espace disponible jusqu'au clip suivant (ou fin)
 * `excludeIds` : ids ignorés (utile pour le multi-resize où les autres
 * membres du groupe ne doivent pas contraindre).
 */
export function computeBounds(targetClipId, laidOutItems, totalBeats, excludeIds = null) {
  const target = laidOutItems.find((it) => it.clip.id === targetClipId)
  if (!target) return { minStartLeft: 0, maxDurationRight: totalBeats }
  const { lane, start, clip } = target
  let minStartLeft = 0
  let maxEnd = totalBeats
  for (const it of laidOutItems) {
    if (it.clip.id === targetClipId) continue
    if (excludeIds && excludeIds.has(it.clip.id)) continue
    if (it.lane !== lane) continue
    if (it.end <= start && it.end > minStartLeft) minStartLeft = it.end
    if (it.start >= start + clip.duration && it.start < maxEnd) maxEnd = it.start
  }
  return {
    minStartLeft,
    maxDurationRight: Math.max(MIN_CLIP_DURATION, maxEnd - start),
  }
}
