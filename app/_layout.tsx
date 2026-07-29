import '../global.css';
import React, { useEffect } from 'react';
import { DevSettings, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AdventureProvider } from '@/context/AdventureContext';
import { useColorScheme, setThemeOverride } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AuthProvider } from '@/context/AuthContext';
import { SplashScreenView } from '@/components/SplashScreenView';

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
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const themeColors = Colors[scheme];

  const customTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: themeColors.background,
      card: themeColors.card,
      border: themeColors.border,
      text: themeColors.text,
      primary: themeColors.primary,
    },
  };

  const [loaded, error] = useFonts({
    BricolageGrotesque: require('../assets/fonts/BricolageGrotesque-SemiBold.ttf'),
    'BricolageGrotesque-Regular': require('../assets/fonts/BricolageGrotesque-Regular.ttf'),
    'BricolageGrotesque-Medium': require('../assets/fonts/BricolageGrotesque-Medium.ttf'),
    'BricolageGrotesque-SemiBold': require('../assets/fonts/BricolageGrotesque-SemiBold.ttf'),
    'BricolageGrotesque-Bold': require('../assets/fonts/BricolageGrotesque-Bold.ttf'),
    Satoshi: require('../assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.otf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AdventureProvider>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <ThemeProvider value={customTheme}>
                <View style={{ flex: 1 }}>
                  <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} animated />
                  <Stack screenOptions={{ contentStyle: { backgroundColor: themeColors.background } }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="onboarding"
                      options={{
                        headerShown: false,
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen
                      name="(auth)"
                      options={{
                        headerShown: false,
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen name="splash" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="search"
                      options={{
                        headerShown: false,
                        presentation: 'transparentModal',
                        animation: 'fade',
                      }}
                    />
                    <Stack.Screen
                      name="rando/[id]"
                      options={{
                        headerShown: false,
                        detachPreviousScreen: false,
                        animation: 'none',
                      }}
                    />
                  </Stack>
                </View>
              </ThemeProvider>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </AdventureProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
