import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SORT_OPTION, SortOptionId } from '@/constants/SortOptions';

const STORAGE_KEY = '@neve_preferences';

export type MapStylePreference = 'default' | 'satellite';

export interface Preferences {
  /** Fond de carte de l'explorateur et des résultats. */
  mapStyle: MapStylePreference;
  /** Critère de classement appliqué à l'ouverture des résultats. */
  sortOption: SortOptionId;
  /** Rayon autour de la position, en km, dans lequel les randonnées sont chargées. */
  searchRadiusKm: number;
}

export const SEARCH_RADIUS_CHOICES = [15, 30, 60, 100];

const DEFAULTS: Preferences = {
  mapStyle: 'default',
  sortOption: DEFAULT_SORT_OPTION,
  searchRadiusKm: 30,
};

/*
 * Même mécanique que le thème (`components/useColorScheme`) : un état de module
 * relu par `useSyncExternalStore`, plutôt qu'un contexte de plus à traverser.
 *
 * Ces préférences n'appartiennent pas au compte mais à l'appareil — elles
 * survivent à une déconnexion et ne partent pas en base.
 */
let preferences: Preferences = DEFAULTS;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return preferences;
}

/** Écarte ce qui ne correspond à rien de connu : le contenu du disque n'est pas typé. */
function sanitize(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  const source = raw as Record<string, unknown>;

  return {
    mapStyle: source.mapStyle === 'satellite' ? 'satellite' : DEFAULTS.mapStyle,
    sortOption:
      typeof source.sortOption === 'string'
        ? (source.sortOption as SortOptionId)
        : DEFAULTS.sortOption,
    searchRadiusKm:
      typeof source.searchRadiusKm === 'number' && SEARCH_RADIUS_CHOICES.includes(source.searchRadiusKm)
        ? source.searchRadiusKm
        : DEFAULTS.searchRadiusKm,
  };
}

// Relecture au démarrage du module, avant même le premier rendu.
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (!stored) return;
    preferences = sanitize(JSON.parse(stored));
    listeners.forEach((listener) => listener());
  })
  .catch((error) => {
    console.warn('Failed to load preferences:', error);
  });

/**
 * Lecture ponctuelle, hors rendu.
 *
 * À réserver aux endroits qui consultent la valeur au moment d'agir — le
 * chargement des randonnées, par exemple, qui n'a pas à se relancer parce qu'un
 * réglage a changé. Partout ailleurs, `usePreferences()`.
 */
export function getPreferences(): Preferences {
  return preferences;
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Écrit une préférence, prévient l'écran en cours et persiste en tâche de fond. */
export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  preferences = { ...preferences, [key]: value };
  listeners.forEach((listener) => listener());

  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch((error) => {
    console.warn('Failed to save preferences:', error);
  });
}
