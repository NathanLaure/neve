import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ChoiceChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Contenu optionnel placé avant le libellé (icône, pastille de ligne…). */
  leading?: React.ReactNode;
  /** Contenu optionnel poussé à droite (coche, prix, pictogramme…). */
  trailing?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Item d'une liste de choix, tel qu'il apparaît dans les feuilles de sélection
 * (âge du randonneur, heure de départ). Figma le nomme « Chips ».
 *
 * L'état sélectionné se lit à la bordure : 2px en couleur de marque au lieu d'1px
 * en `border/strong`. Le remplissage reste blanc dans les deux cas — c'est le
 * fond gris de la feuille qui fait ressortir les items.
 */
export default function ChoiceChip({
  label,
  selected = false,
  onPress,
  leading,
  trailing,
  disabled = false,
  style,
}: ChoiceChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /*
   * Tableau de styles calculé en amont et passé tel quel, plutôt que la forme
   * `style={({ pressed }) => [...]}` : celle-ci était purement et simplement
   * ignorée ici, les items se rendant en texte nu. L'opacité d'appui passe donc
   * par `android_ripple` et l'état désactivé par une entrée explicite.
   */
  const chipStyle = [
    styles.chip,
    {
      backgroundColor: theme.card,
      borderColor: selected ? theme.primary : theme.border,
      borderWidth: selected ? 1.5 : 1,
      opacity: disabled ? 0.4 : 1,
    },
    style,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      android_ripple={{ color: theme.surfaceSecondary }}
      style={chipStyle}>
      {leading ? <View style={styles.adornment}>{leading}</View> : null}
      <Text style={[styles.label, { color: theme.text, fontWeight: selected ? '700' : '500' }]}>
        {label}
      </Text>
      {trailing ? <View style={styles.adornment}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Gabarit repris de la feuille « Zone de recherche », qui fait référence :
  // hauteur minimale plutôt que remplissage vertical, ce qui absorbe au passage
  // le demi-pixel de bordure supplémentaire de l'état sélectionné.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
  },
  // Bricolage Grotesque : la police de titrage, pas celle du corps de texte.
  label: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 16,
  },
  // Encarts latéraux : ils gardent leur taille, seul le libellé se comprime.
  adornment: {
    flexShrink: 0,
  },
});
