import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.5, 1]),
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: theme.card },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
