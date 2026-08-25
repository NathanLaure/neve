import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight, ExternalLink } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/**
 * Ce que la ligne annonce en fin de course : une page de l'app (`chevron`), une
 * sortie vers le navigateur (`external`), ou rien du tout quand elle agit sur
 * place — une déconnexion n'emmène nulle part.
 */
export type ProfileMenuRowTrailing = 'chevron' | 'external' | 'none';

export type ProfileMenuRowVariant = 'default' | 'plain' | 'flush';

export interface ProfileMenuRowProps {
  label: string;
  /** Texte explicatif secondaire sous le libellé principal. */
  subtitle?: string;
  /** Valeur ou statut textuel affiché à droite avant l'icône de fin. */
  value?: string;
  /**
   * Pictogramme lucide, colorié par la ligne selon sa tonalité.
   *
   * Réservé au sommaire du profil, où il aide à repérer une rubrique parmi des
   * intitulés de natures différentes. Les pages de réglages s'en passent : leurs
   * lignes sont déjà rassemblées sous un titre de catégorie, et une colonne
   * d'icônes n'y ajouterait que du bruit.
   */
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Ligne purement informative quand il est absent : ni appui, ni ondulation. */
  onPress?: () => void;
  trailing?: ProfileMenuRowTrailing;
  /** `danger` passe la ligne en rouge — action destructrice. */
  tone?: 'default' | 'danger';
  accessibilityHint?: string;
  /**
   * Variante visuelle :
   * - `default` : padding horizontal (12px), adapté aux cartes
   * - `plain` / `flush` : sans padding latéral (0px) et sans fond, aligné avec les bords du conteneur
   */
  variant?: ProfileMenuRowVariant;
  /** Raccourci pour `variant="plain"` (sans padding latéral ni fond). */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ligne d'un des blocs de réglages du profil (Figma 727:14489).
 *
 * En variante `default`, la ligne ne peint pas son fond : elle est empilée dans
 * une carte qui porte déjà le sien.
 * En variante `plain` (ou `flush`), elle n'a aucun padding horizontal ni fond,
 * permettant de s'aligner directement au bord de son conteneur.
 */
export default function ProfileMenuRow({
  label,
  subtitle,
  value,
  Icon,
  onPress,
  trailing = 'chevron',
  tone = 'default',
  accessibilityHint,
  variant = 'default',
  flush = false,
  style,
}: ProfileMenuRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isFlush = flush || variant === 'plain' || variant === 'flush';
  const contentColor = tone === 'danger' ? theme.statusBgError : theme.text;
  const TrailingIcon = trailing === 'external' ? ExternalLink : ChevronRight;

  const containerStyle = [
    styles.row,
    isFlush && styles.rowFlush,
    style,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={
        accessibilityHint ?? (trailing === 'external' ? "Ouvre le navigateur" : undefined)
      }
      onPress={onPress}
      disabled={!onPress}
      android_ripple={
        onPress ? { color: theme.ripple, borderless: false, foreground: true } : undefined
      }
      style={containerStyle}>
      {Icon ? <Icon size={20} color={contentColor} /> : null}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: contentColor }]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: theme.textMuted }]}>
          {value}
        </Text>
      ) : null}
      {trailing === 'none' ? null : (
        <View style={styles.trailing}>
          <TrailingIcon size={trailing === 'external' ? 18 : 20} color={theme.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* 48 et non les 40 du Figma : sous les 44 px recommandés, la ligne se rate au
     pouce — et la maquette ne perd rien à respirer un peu plus. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    /* La hauteur minimale suffit à une ligne seule ; avec une valeur en dessous,
       c'est ce remplissage qui laisse la ligne grandir proprement. */
    paddingVertical: 16,
    overflow: 'hidden',
  },
  rowFlush: {
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    paddingVertical: 18,
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  // Seul le libellé se comprime, les encarts latéraux gardent leur taille.
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 0,
  },
  trailing: {
    flexShrink: 0,
  },
});
