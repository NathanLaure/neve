import '../global.css';
import React from 'react';
import { DevSettings, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

import { useColorScheme, setThemeOverride } from '@/components/useColorScheme';

// Suppress known upstream library deprecation warnings in React Native 0.85+
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

// Register custom development menu entries immediately when bundle loads at the module level
if (__DEV__) {
  try {
    DevSettings.addMenuItem('☀️ Theme : Mode Clair', () => {
      setThemeOverride('light');
    });
    DevSettings.addMenuItem('🌙 Theme : Mode Sombre', () => {
      setThemeOverride('dark');
    });
    DevSettings.addMenuItem('🔄 Theme : Suivre Système', () => {
      setThemeOverride(null);
    });
  } catch (e) {
    console.warn('Failed to register DevSettings menu items:', e);
  }
}

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ title: 'Modal', presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
