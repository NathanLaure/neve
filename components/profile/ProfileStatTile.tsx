import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ProfileStatTileProps {
  /** Grandeur déjà mise en forme, unité comprise — « 84 kg », « 320 km ». */
  value: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBgColor?: string;
  iconColor?: string;
}

/**
 * Tuile du bilan de l'éco-randonneur (Figma 718:14226).
 *
 * Hauteur fixe et non dictée par le contenu : les quatre tuiles se rangent en
 * grille, et un libellé qui passe à deux lignes ne doit pas décaler sa voisine.
 */
export default function ProfileStatTile({
  value,
  label,
  Icon,
  iconBgColor,
  iconColor,
}: ProfileStatTileProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View
      accessible
      accessibilityLabel={`${value}, ${label}`}
      style={[styles.tile, { backgroundColor: theme.card }]}>
      <View style={styles.head}>
        <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
          {value}
        </Text>
        {iconBgColor ? (
          <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
            <Icon size={14} color={iconColor ?? '#FFFFFF'} />
          </View>
        ) : (
          <Icon size={20} color={iconColor ?? theme.textMuted} />
        )}
      </View>
      <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 94,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 15,
  },
});
