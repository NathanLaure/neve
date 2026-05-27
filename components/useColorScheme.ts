import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

// Global state to store the overridden theme
let themeOverride: 'light' | 'dark' | null = null;

// Registry of hook instances to trigger re-renders on override changes
const listeners = new Set<(override: 'light' | 'dark' | null) => void>();

/**
 * Custom hook to get the active color scheme.
 * Guarantees a strict return type of 'light' | 'dark' to prevent indexing issues.
 * Dynamically reacts to system preferences and developer menu overrides.
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemTheme = useNativeColorScheme() === 'dark' ? 'dark' : 'light';

  // Local state to track manual developer overrides
  const [override, setOverride] = useState<'light' | 'dark' | null>(themeOverride);

  // Subscribe to manual override changes
  useEffect(() => {
    const listener = (newOverride: 'light' | 'dark' | null) => {
      setOverride(newOverride);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Return manual override if set, otherwise follow system theme dynamically
  return override ?? systemTheme;
}

/**
 * Sets a manual theme override and triggers live UI updates across all components.
 * Pass null to restore system theme alignment.
 */
export function setThemeOverride(newOverride: 'light' | 'dark' | null) {
  themeOverride = newOverride;

  // Notify all registered hook instances of the new override value
  listeners.forEach((listener) => listener(newOverride));
}

/**
 * Gets the current manual theme override.
 */
export function getThemeOverride(): 'light' | 'dark' | null {
  return themeOverride;
}
