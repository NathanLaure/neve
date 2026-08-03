import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

import { NeveLogo } from '@/components/NeveLogo';

export interface SplashScreenViewProps {
  onFinish?: () => void;
  isReady?: boolean; // Wait for background loading (auth, data, fonts)
  minDuration?: number; // Minimum display time for smooth splash animation (default 1800ms)
}

export function SplashScreenView({
  onFinish,
  isReady = true,
  minDuration = 1800,
}: SplashScreenViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Container Fade Out
  const [containerOpacity] = useState(() => new Animated.Value(1));

  // Phase 1: Logo Scale & Fade
  const [logoScale] = useState(() => new Animated.Value(0.7));
  const [logoOpacity] = useState(() => new Animated.Value(0));

  // Phase 2: "Névé" Text Slide & Fade Up (Splash 02)
  const [textTranslateY] = useState(() => new Animated.Value(20));
  const [textOpacity] = useState(() => new Animated.Value(0));

  const animationFinishedRef = useRef(false);

  const checkFinish = useCallback(() => {
    if (animationFinishedRef.current && isReady) {
      // Smooth fade out container overlay
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }
  }, [containerOpacity, isReady, onFinish]);

  useEffect(() => {
    // Sequence Phase 1: Logo Fade & Scale in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Sequence Phase 2: Text "Névé" Slide & Fade in after 400ms delay
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Minimum animation timer
    const minTimer = setTimeout(() => {
      animationFinishedRef.current = true;
      checkFinish();
    }, minDuration);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(minTimer);
    };
  }, [checkFinish, logoOpacity, logoScale, minDuration, textOpacity, textTranslateY]);

  useEffect(() => {
    checkFinish();
  }, [checkFinish, isReady]);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.background, opacity: containerOpacity },
      ]}>
      <View style={styles.centerContainer}>
        {/* Splash 01: Centered Official Vector Curve Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <NeveLogo variant="icon" size={160} color={theme.text} />
        </Animated.View>

        {/* Splash 02: Official "Névé" Typo Vector below Logo */}
        <Animated.View
          style={[
            styles.textWrapper,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}>
          <NeveLogo variant="typo" size={140} color={theme.text} />
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
  textWrapper: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
