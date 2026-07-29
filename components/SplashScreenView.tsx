import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing, Image } from 'react-native';
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
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Phase 1: Logo Scale & Fade
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: "Névé" Text Slide & Fade Up (Splash 02)
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const animationFinishedRef = useRef(false);

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
  }, [logoOpacity, logoScale, minDuration, textOpacity, textTranslateY]);

  const checkFinish = () => {
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
  };

  useEffect(() => {
    checkFinish();
  }, [isReady]);

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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
});
