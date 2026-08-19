import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export const FOOTER_HORIZONTAL_PADDING = 20;
export const FOOTER_TOP_PADDING = 12;
export const FOOTER_GAP = 12;

/** Hauteur de base de la rangée de boutons (hors barre système), alignée sur la TabBar. */
export const FOOTER_BASE_HEIGHT = 80;

/** Rembourrage bas du footer, aligné sur la barre système du téléphone (identique à la TabBar). */
export function useScreenFooterPadding() {
  const insets = useSafeAreaInsets();
  const rawBottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;
  const effectiveBottomInset = rawBottom > 0 ? rawBottom : Platform.OS === 'android' ? 48 : 24;

  return Platform.OS === 'ios'
    ? (insets.bottom > 0 ? insets.bottom + 12 : 24)
    : effectiveBottomInset + 16;
}

/**
 * Hauteur totale occupée par le footer flottant, barre système comprise (identique à useTabBarHeight).
 */
export function useScreenFooterHeight() {
  return FOOTER_BASE_HEIGHT + useScreenFooterPadding();
}

export type ScreenFooterProps = {
  children: ReactNode;
  /**
   * `floating` épingle le footer par-dessus le contenu et ajoute bordure et ombre ;
   * `inline` le laisse dans le flux, sans séparateur, pour les pages à contenu dynamique.
   */
  variant?: 'floating' | 'inline';
  /** Surface peinte par le footer. `transparent` laisse voir l'écran dessous. */
  surface?: 'background' | 'card' | 'transparent';
  /** Dispose les enfants en rangée — le cas courant d'une barre à un ou deux boutons. */
  row?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenFooter({
  children,
  variant = 'floating',
  surface = 'background',
  row = false,
  style,
}: ScreenFooterProps) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const bottomPadding = useScreenFooterPadding();
  const isFloating = variant === 'floating';

  // La bordure suit la surface : un séparateur clair sur `background`, plus marqué
  // sur `card` qui contraste moins avec le corps de page.
  const backgroundColor =
    surface === 'transparent' ? 'transparent' : surface === 'card' ? theme.card : theme.background;
  const borderTopColor = surface === 'card' ? theme.border : theme.borderLight;

  return (
    <View
      style={[
        styles.base,
        isFloating ? styles.floating : styles.inline,
        {
          paddingBottom: bottomPadding,
        },
        isFloating && {
          minHeight: FOOTER_BASE_HEIGHT + bottomPadding,
          borderTopColor,
        },
        surface !== 'transparent' && { backgroundColor },
        row && styles.row,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: FOOTER_HORIZONTAL_PADDING,
    paddingTop: FOOTER_TOP_PADDING,
    gap: FOOTER_GAP,
  },
  floating: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  inline: {
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
