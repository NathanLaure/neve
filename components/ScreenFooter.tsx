import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// Espace conservé entre les boutons et la barre système. En edge-to-edge celle-ci
// est transparente : sans ce dégagement, les boutons de l'app viennent se coller
// aux boutons Android.
const SAFE_AREA_GAP = 16;
// Plancher pour les appareils qui ne remontent aucun inset bas (Android ancien,
// iPhone sans encoche) : l'inset seul y vaudrait 0 et le footer toucherait le bord.
const MIN_BOTTOM_PADDING = 34;

export const FOOTER_HORIZONTAL_PADDING = 20;
export const FOOTER_TOP_PADDING = 12;
export const FOOTER_GAP = 12;

/**
 * Padding bas résolu du footer. Exporté à part pour que les écrans à footer
 * `floating` puissent réserver la même hauteur dans leur `contentContainerStyle`
 * sans redupliquer le calcul.
 */
export function useScreenFooterPadding() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom + SAFE_AREA_GAP, MIN_BOTTOM_PADDING);
}

export type ScreenFooterProps = {
  children: ReactNode;
  /**
   * `floating` épingle le footer par-dessus le contenu et ajoute bordure et ombre ;
   * `inline` le laisse dans le flux, sans séparateur.
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
  const paddingBottom = useScreenFooterPadding();

  // La bordure suit la surface : un séparateur clair sur `background`, plus marqué
  // sur `card` qui contraste moins avec le corps de page.
  const backgroundColor =
    surface === 'transparent' ? 'transparent' : surface === 'card' ? theme.card : theme.background;
  const borderTopColor = surface === 'card' ? theme.border : theme.borderLight;

  return (
    <View
      style={[
        styles.base,
        { paddingBottom },
        surface !== 'transparent' && { backgroundColor },
        variant === 'floating' && [styles.floating, { borderTopColor }],
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
