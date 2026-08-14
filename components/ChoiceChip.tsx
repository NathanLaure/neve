import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ChoiceChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Contenu optionnel placé avant le libellé (icône, pastille de ligne…). */
  leading?: React.ReactNode;
  /**
   * Contenu optionnel poussé à droite (coche, prix, pictogramme…). Ignoré
   * quand `checkbox` ou `radio` est actif.
   */
  trailing?: React.ReactNode;
  /**
   * Affiche une case à cocher à droite, pilotée par `selected` (Figma
   * 657:38595 / composant 550:5267 « checkboxe »). Pensée pour les sélections multiples.
   */
  checkbox?: boolean;
  /**
   * Affiche un bouton radio circulaire à droite, piloté par `selected`.
   * Pensé pour les choix uniques (ex: tri, options exclusives).
   */
  radio?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Item d'une liste de choix, tel qu'il apparaît dans les feuilles de sélection
 * (âge du randonneur, heure de départ, options de tri). Figma le nomme « Chips ».
 *
 * L'état sélectionné se lit à la bordure : 2px en couleur de marque au lieu d'1px
 * en `border/strong`, et au poids du texte (Figma 657:38550). Le remplissage
 * reste blanc dans les deux cas — c'est le fond gris de la feuille qui fait
 * ressortir les items. Vaut aussi en variante `checkbox` et `radio`.
 */
export default function ChoiceChip({
  label,
  selected = false,
  onPress,
  leading,
  trailing,
  checkbox = false,
  radio = false,
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
      borderColor: selected ? theme.primary : theme.borderStrong || theme.border || '#989898',
      borderWidth: selected ? 1.5 : 1,
      opacity: disabled ? 0.4 : 1,
      overflow: 'hidden' as const,
    },
    style,
  ];

  let trailingContent = trailing;
  if (radio) {
    trailingContent = (
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.primary : theme.border,
          },
        ]}>
        {selected && (
          <View
            style={[
              styles.radioInner,
              {
                backgroundColor: theme.primary,
              },
            ]}
          />
        )}
      </View>
    );
  } else if (checkbox) {
    trailingContent = (
      <View
        style={[
          styles.checkbox,
          selected
            ? { backgroundColor: theme.text, borderColor: theme.text }
            : { borderColor: theme.text },
        ]}>
        {selected && <Check size={14} color={theme.background} />}
      </View>
    );
  }

  const a11yRole = radio ? 'radio' : checkbox ? 'checkbox' : 'button';
  const a11yState = radio
    ? { selected, disabled }
    : checkbox
    ? { checked: selected, disabled }
    : { selected, disabled };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={a11yRole}
      accessibilityState={a11yState}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={chipStyle}>
      {leading ? <View style={styles.adornment}>{leading}</View> : null}
      <Text style={[styles.label, { color: theme.text, fontWeight: selected ? '700' : '500' }]}>
        {label}
      </Text>
      {trailingContent ? <View style={styles.adornment}>{trailingContent}</View> : null}
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
  // Figma 550:5267 « checkboxe » : 20×20, radius xs (4). Non cochée = bordure
  // seule ; cochée = remplissage plein + coche, sans bordure.
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Radio button : 20×20, radius cercle (10). Non sélectionné = bordure seule ;
  // sélectionné = bordure active + pastille centrale de 10×10.
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
