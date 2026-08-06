import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface DividerProps {
  style?: ViewStyle;
}

export default function Divider({ style }: DividerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return <View style={[styles.divider, { backgroundColor: theme.borderStrong }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1.5,
    width: '100%',
  },
});
