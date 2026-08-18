import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'user_theme_preference';

// Global state to store the overridden theme
let themeOverride: 'light' | 'dark' | null = null;

// Registry of subscribers for React's useSyncExternalStore
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return themeOverride;
}

// Pre-load theme preference from AsyncStorage at module startup
AsyncStorage.getItem(STORAGE_KEY)
  .then((val) => {
    if (val === 'light' || val === 'dark') {
      themeOverride = val;
    } else if (val === 'system') {
      themeOverride = null;
    }
    listeners.forEach((listener) => listener());
  })
  .catch((err) => {
    console.warn('Failed to load theme preference:', err);
  });

/**
 * Custom hook to get the active color scheme.
 * Guarantees a strict return type of 'light' | 'dark' to prevent indexing issues.
 * Uses React 18/19's useSyncExternalStore to safely subscribe to theme overrides
 * without triggering unmounted component state updates or cascading renders.
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemTheme = useNativeColorScheme() === 'dark' ? 'dark' : 'light';
  const override = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return override ?? systemTheme;
}

/**
 * Réglage d'affichage choisi par l'utilisateur, `null` valant « suivre le
 * système ».
 *
 * Même abonnement que `useColorScheme`, mais renvoie la préférence et non le
 * thème effectif : c'est ce dont a besoin l'écran qui affiche le réglage, à qui
 * `getThemeOverride()` seul ne dirait rien des changements.
 */
export function useThemeOverride(): 'light' | 'dark' | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Sets a manual theme override and triggers live UI updates across all components,
 * while saving the preference permanently in AsyncStorage.
 * Pass null to restore system theme alignment.
 */
export function setThemeOverride(newOverride: 'light' | 'dark' | null) {
  themeOverride = newOverride;

  // Persist preference to AsyncStorage
  const storageValue = newOverride ?? 'system';
  AsyncStorage.setItem(STORAGE_KEY, storageValue).catch((err) => {
    console.warn('Failed to save theme preference:', err);
  });

  // Notify all registered subscribers of the new override value
  listeners.forEach((listener) => listener());
}

/**
 * Gets the current manual theme override.
 */
export function getThemeOverride(): 'light' | 'dark' | null {
  return themeOverride;
}
