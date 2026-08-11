import '../global.css';
import React, { useEffect } from 'react';
import { DevSettings, LogBox, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

import { AdventureProvider } from '@/context/AdventureContext';
import { PlanDraftProvider } from '@/context/PlanDraftContext';
import { useColorScheme, setThemeOverride } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AuthProvider } from '@/context/AuthContext';
import { SplashScreenView } from '@/components/SplashScreenView';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ToastConfig';

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
  initialRouteName: 'index',
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

  // Android button navigation: keep the bar background transparent (handled by the
  // `enforceContrast: false` plugin option in app.json) and contrast the buttons
  // against the app theme. `'dark'` means dark buttons, `'light'` means light ones.
  // `'auto'` is not usable here: it reads `Appearance.getColorScheme()` and would
  // ignore the in-app theme override handled by `useColorScheme`.
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle(scheme === 'dark' ? 'light' : 'dark');
    }
  }, [scheme]);

  // Root view background. Left unset, the Android window keeps AppCompat's default
  // white, which shows through anywhere no screen paints over it — most visibly in
  // the transparent navigation bar strip below the tab bar.
  useEffect(() => {
    // The native side resolves through the current Android activity and rejects when
    // it is gone — Fast Refresh, backgrounding, teardown. Nothing to repair in that
    // case: the window we were painting no longer exists, and the effect runs again
    // on the next mount. Only that rejection is swallowed; anything else is logged.
    SystemUI.setBackgroundColorAsync(themeColors.background).catch((e) => {
      if (!String(e?.message).includes('activity is no longer available')) {
        console.warn('SystemUI.setBackgroundColorAsync failed:', e);
      }
    });
  }, [themeColors.background]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AdventureProvider>
          <PlanDraftProvider>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <ThemeProvider value={customTheme}>
                <View style={{ flex: 1 }}>
                  <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} animated />
                  <Stack screenOptions={{ contentStyle: { backgroundColor: themeColors.background } }}>
                    <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
                    <Stack.Screen
                      name="(tabs)"
                      options={{
                        headerShown: false,
                        animation: 'fade_from_bottom',
                      }}
                    />
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
                        // Overrides the global contentStyle: without this the stack paints an
                        // opaque background over the screen behind, killing the glass effect.
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    {/* Calendrier : une route à part plutôt qu'une section
                        dépliée dans la page. Trois mois de grille dans le corps
                        défilant écrasaient le défilement de l'écran de
                        planification ; en modale, le calendrier a son propre
                        défileur et toute la hauteur. */}
                    <Stack.Screen
                      name="plan/dates"
                      options={{
                        headerShown: false,
                        presentation: 'fullScreenModal',
                      }}
                    />
                    <Stack.Screen
                      name="rando/[id]"
                      options={{
                        headerShown: false,
                        detachPreviousScreen: false,
                        animation: 'default',
                      }}
                    />
                  </Stack>
                  <Toast config={toastConfig} />
                </View>
              </ThemeProvider>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
          </PlanDraftProvider>
        </AdventureProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
