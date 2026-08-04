import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { NeveLogo } from '@/components/NeveLogo';

export interface SplashScreenViewProps {
  onFinish?: () => void;
  isReady?: boolean; // Wait for background loading (auth, data, fonts)
  minDuration?: number; // Fast display time for seamless splash transition (default 350ms)
}

export function SplashScreenView({
  onFinish,
  isReady = true,
  minDuration = 350,
}: SplashScreenViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Exact native splash background match from app.json (#FFF7F2 in light, #111111 in dark)
  const splashBgColor = colorScheme === 'dark' ? '#111111' : '#FFF7F2';
  const logoOrangeColor = theme.primary;

  // Container Fade Out
  const [containerOpacity] = useState(() => new Animated.Value(1));

  // Quick subtle logo pulse/scale animation (starts at 1.0 -> 1.05 -> 1.0)
  const [logoScale] = useState(() => new Animated.Value(1));
  const [logoOpacity] = useState(() => new Animated.Value(1));

  const animationFinishedRef = useRef(false);

  const checkFinish = useCallback(() => {
    if (animationFinishedRef.current && isReady) {
      // Ultra-fast smooth fade out container overlay
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }
  }, [containerOpacity, isReady, onFinish]);

  useEffect(() => {
    // Quick subtle pulse animation to smooth out the native-to-JS bridge transition
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.05,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Fast minimum animation timer
    const minTimer = setTimeout(() => {
      animationFinishedRef.current = true;
      checkFinish();
    }, minDuration);

    return () => {
      clearTimeout(minTimer);
    };
  }, [checkFinish, logoScale, minDuration]);

  useEffect(() => {
    checkFinish();
  }, [checkFinish, isReady]);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: splashBgColor, opacity: containerOpacity },
      ]}>
      <View style={styles.centerContainer}>
        {/* Seamless Orange Logo Icon Only */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <NeveLogo variant="icon" size={140} color={logoOrangeColor} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
