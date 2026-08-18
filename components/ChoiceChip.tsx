import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/* Figma 657:38550 : bordure fine au repos, épaissie en couleur de marque une
   fois l'item sélectionné. */
const BORDER_IDLE = 1;
const BORDER_SELECTED = 1.5;
const PADDING_VERTICAL = 12;
/* Hauteur de ligne du libellé, imposée plutôt que laissée aux métriques de la
   police : les fichiers Medium et Bold de Bricolage Grotesque ne mesurent pas
   pareil, et la ligne changerait de hauteur à la sélection. */
const LABEL_LINE_HEIGHT = 24;

export interface ChoiceChipProps {
  label: string;
  /**
   * Précision affichée sous le libellé, en corps de texte atténué. Pour les
   * listes où le seul intitulé ne suffit pas à décider (ce qu'un abonnement
   * couvre, ce qu'une option de tri change).
   */
  description?: string;
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
  description,
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

  const borderWidth = selected ? BORDER_SELECTED : BORDER_IDLE;

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
      borderWidth,
      /* Le supplément de bordure de l'état sélectionné est repris sur le
         remplissage. Les dimensions se comptent bordure comprise en React
         Native : sans cette reprise, cocher un item le ferait grandir et
         pousserait toute la liste sous le doigt. Invisible tant que la hauteur
         minimale l'emporte, déterminant dès qu'une description l'a dépassée. */
      paddingVertical: PADDING_VERTICAL - (borderWidth - BORDER_IDLE),
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
      <View style={styles.labelGroup}>
        <Text
          style={[
            styles.label,
            {
              color: theme.text,
              /* La graisse passe par la famille et non par `fontWeight` : les
                 variantes de Bricolage Grotesque sont des fichiers distincts,
                 que le moteur ne dérive pas d'une police déjà chargée. */
              fontFamily: selected ? 'BricolageGrotesque-Bold' : 'BricolageGrotesque-Medium',
            },
          ]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
        ) : null}
      </View>
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
    /* Sans description, la hauteur minimale l'emporte et le rendu est inchangé ;
       avec, c'est ce remplissage qui laisse le chip grandir proprement. */
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
  },
  // Seul le bloc de texte se comprime, les encarts latéraux gardent leur taille.
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  /* Bricolage Grotesque : la police de titrage, pas celle du corps de texte.
     La famille est surchargée au rendu selon l'état sélectionné ; la hauteur de
     ligne, elle, reste fixe pour que ce passage en gras ne décale rien. */
  label: {
    fontSize: 16,
    lineHeight: LABEL_LINE_HEIGHT,
  },
  // Satoshi : la précision relève du corps de texte, pas du titrage.
  description: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 16,
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
