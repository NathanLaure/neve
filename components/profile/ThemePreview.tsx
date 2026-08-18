import React from 'react';
import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';

export type ThemePreviewVariant = 'light' | 'dark' | 'system';

/* Gabarit de la vignette. Proportions d'un écran de téléphone, en assez petit
   pour que les trois tiennent côte à côte sur la largeur d'une page. */
const WIDTH = 80;
const HEIGHT = 152;
const RADIUS = 14;

/**
 * Palette d'une vignette, prise sur les vraies couleurs de l'application et non
 * sur des gris décoratifs : l'aperçu ne vaut que s'il montre ce qu'on aura.
 */
function paletteOf(scheme: 'light' | 'dark') {
  const theme = Colors[scheme];
  return { background: theme.background, surface: theme.card, line: theme.border };
}

/** Contenu de la vignette : une page d'app réduite à son squelette. */
function PreviewBody({ scheme }: { scheme: 'light' | 'dark' }) {
  const palette = paletteOf(scheme);

  return (
    <View style={[styles.body, { backgroundColor: palette.background }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: palette.line }]} />
        <View style={styles.rowLines}>
          <View style={[styles.bar, { backgroundColor: palette.line }]} />
          <View style={[styles.bar, styles.barShort, { backgroundColor: palette.line }]} />
        </View>
      </View>

      <View style={[styles.block, { backgroundColor: palette.surface }]}>
        <View style={[styles.bar, { backgroundColor: palette.line }]} />
        <View style={[styles.bar, styles.barShort, { backgroundColor: palette.line }]} />
      </View>

      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: palette.line }]} />
        <View style={styles.rowLines}>
          <View style={[styles.bar, { backgroundColor: palette.line }]} />
          <View style={[styles.bar, styles.barShort, { backgroundColor: palette.line }]} />
        </View>
      </View>

      <View style={[styles.block, { backgroundColor: palette.surface }]}>
        <View style={[styles.bar, { backgroundColor: palette.line }]} />
        <View style={[styles.bar, styles.barShort, { backgroundColor: palette.line }]} />
      </View>
    </View>
  );
}

/**
 * Vignette d'aperçu d'un thème.
 *
 * La variante `system` superpose deux copies du même squelette et n'en découvre
 * que la moitié droite en sombre : le contenu se poursuit d'un côté à l'autre
 * de la césure, ce qui montre bien un seul écran qui bascule — et non deux
 * écrans posés côte à côte.
 */
export default function ThemePreview({ variant }: { variant: ThemePreviewVariant }) {
  if (variant !== 'system') {
    return (
      <View style={styles.frame}>
        <PreviewBody scheme={variant} />
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <PreviewBody scheme="light" />
      <View style={styles.darkHalf}>
        <View style={styles.darkHalfInner}>
          <PreviewBody scheme="dark" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  body: {
    width: WIDTH,
    height: HEIGHT,
    padding: 8,
    gap: 8,
  },
  /* Fenêtre sur la moitié droite. Le squelette sombre qu'elle contient garde la
     largeur entière et se cale à droite : ses barres tombent donc exactement sur
     celles du squelette clair en dessous. */
  darkHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: WIDTH / 2,
    overflow: 'hidden',
  },
  darkHalfInner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: WIDTH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 100,
  },
  rowLines: {
    flex: 1,
    gap: 3,
  },
  block: {
    height: 42,
    borderRadius: 6,
    padding: 6,
    justifyContent: 'flex-end',
    gap: 3,
  },
  bar: {
    height: 3,
    borderRadius: 2,
  },
  barShort: {
    width: '60%',
  },
});
