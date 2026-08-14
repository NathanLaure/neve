import React from 'react';
import { StyleSheet, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface FilterChipProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip filtre déroulant (Figma 570:5595, « chips select »). Réutilisé pour
 * l'heure de départ et le mode de transport sur les écrans de résultats.
 */
export default function FilterChip({ label, onPress, style }: FilterChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={[
        styles.chip,
        {
          backgroundColor: theme.card,
          overflow: 'hidden' as const,
        },
        style,
      ]}>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={14} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  label: {
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
});
