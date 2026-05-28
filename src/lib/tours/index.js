// src/lib/tours/index.js — Mappe tabId → séquence d'étapes du Tour guidé
// (iter-L phase-4). Point d'extension unique pour le moteur Tour.jsx.
//
// L'ordre du tableau TOUR_TABS = ordre de proposition de chaînage en fin de
// tour. Les libellés servent aux boutons « Continuer vers … ».

import { libraryTour } from './library'
import { designerTour } from './designer'
import { composerTour } from './composer'
import { documentationTour } from './documentation'

export const TOURS = {
  library: libraryTour,
  designer: designerTour,
  composer: composerTour,
  documentation: documentationTour,
}

export const TOUR_TABS = [
  { id: 'library', label: 'Bibliothèque' },
  { id: 'designer', label: 'Designer' },
  { id: 'composer', label: 'Composer' },
  { id: 'documentation', label: 'Documentation' },
]

export function getTour(tabId) {
  return TOURS[tabId] ?? []
}
