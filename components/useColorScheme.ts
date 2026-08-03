import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'user_theme_preference';

// Global state to store the overridden theme
let themeOverride: 'light' | 'dark' | null = null;
let isLoadedFromStorage = false;

// Registry of hook instances to trigger re-renders on override changes
const listeners = new Set<(override: 'light' | 'dark' | null) => void>();

// Pre-load theme preference from AsyncStorage at module startup
AsyncStorage.getItem(STORAGE_KEY)
  .then((val) => {
    if (val === 'light' || val === 'dark') {
      themeOverride = val;
    } else if (val === 'system') {
      themeOverride = null;
    }
    isLoadedFromStorage = true;
    listeners.forEach((listener) => listener(themeOverride));
  })
  .catch((err) => {
    console.warn('Failed to load theme preference:', err);
  });

/**
 * Custom hook to get the active color scheme.
 * Guarantees a strict return type of 'light' | 'dark' to prevent indexing issues.
 * Dynamically reacts to system preferences and persisted user settings.
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemTheme = useNativeColorScheme() === 'dark' ? 'dark' : 'light';

  // Local state to track manual theme override
  const [override, setOverride] = useState<'light' | 'dark' | null>(themeOverride);

  // Subscribe to manual override changes
  useEffect(() => {
    const listener = (newOverride: 'light' | 'dark' | null) => {
      setOverride(newOverride);
    };
    listeners.add(listener);

    // Sync immediately if storage loading completed
    if (isLoadedFromStorage && override !== themeOverride) {
      setOverride(themeOverride);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Return manual override if set, otherwise follow system theme dynamically
  return override ?? systemTheme;
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

  // Notify all registered hook instances of the new override value
  listeners.forEach((listener) => listener(newOverride));
}

/**
 * Gets the current manual theme override.
 */
export function getThemeOverride(): 'light' | 'dark' | null {
  return themeOverride;
}
