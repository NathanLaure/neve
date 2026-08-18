import React from 'react';
import { StyleSheet, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface FilterChipProps {
  /** Valeur retenue, pas l'intitulé du réglage : « Départ à 08h », pas « Heure ». */
  label: string;
  onPress: () => void;
  /**
   * `default` occupe sa part d'une ligne de filtres (écrans d'itinéraire).
   * `compact` se range au bout d'une ligne déjà occupée, à côté du décompte de
   * résultats : plus petit, dimensionné par son contenu (Figma 49:2895).
   */
  size?: 'default' | 'compact';
  /** Décrit le réglage pour les lecteurs d'écran, que le seul libellé ne dit pas. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip filtre déroulant (Figma 570:5595, « chips select »). Réutilisé pour
 * l'heure de départ et le mode de transport sur les écrans de résultats
 * d'itinéraire, et pour les zones tarifaires et le tri sur la liste de
 * randonnées.
 */
export default function FilterChip({
  label,
  onPress,
  size = 'default',
  accessibilityLabel,
  style,
}: FilterChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isCompact = size === 'compact';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={[
        styles.chip,
        isCompact ? styles.chipCompact : styles.chipDefault,
        {
          backgroundColor: theme.card,
          overflow: 'hidden' as const,
        },
        style,
      ]}>
      <Text
        style={[styles.label, isCompact ? styles.labelCompact : null, { color: theme.text }]}
        numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={14} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
  },
  /* Étalé sur la ligne de filtres, d'où le `flex` et le libellé poussé à
     l'opposé du chevron. */
  chipDefault: {
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  /* Dimensionné par son contenu. Le remplissage asymétrique vient du Figma : le
     chevron porte sa propre marge optique et demande moins d'air que le texte. */
  chipCompact: {
    justifyContent: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  label: {
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  labelCompact: {
    fontSize: 14,
  },
});
