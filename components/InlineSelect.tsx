import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, ChevronDown } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useOverlay } from '@/components/OverlayHost';

export interface InlineSelectOption {
  value: string;
  label: string;
}

export interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onSelect: (value: string) => void;
  accessibilityLabel?: string;
}

/** Hauteur d'une ligne du menu, pour décider de l'ouvrir vers le haut ou le bas. */
const ITEM_HEIGHT = 44;
const MENU_PADDING = 8;
/** Espace entre la pastille et le menu, et marge minimale gardée aux bords. */
const GAP = 6;
const SCREEN_MARGIN = 16;

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fin de phrase réglable : « Je voudrais [signaler un problème] ».
 *
 * Le menu s'ouvre ancré sous la pastille et non en feuille par le bas. Le doigt
 * vient de taper la pastille : il est déjà là, et la liste apparaît sous lui au
 * lieu de l'obliger à redescendre. Quand le clavier est ouvert, une feuille se
 * disputerait la place avec lui ; un menu ancré, non.
 *
 * Écrit en JavaScript plutôt qu'avec le `DropdownMenu` de `@expo/ui` : ce
 * dernier n'accepte que des enfants natifs, la pastille devrait donc être
 * rebâtie en primitives Compose — sans la police ni les jetons de l'app — puis
 * une seconde fois en SwiftUI pour iOS.
 *
 * Le menu est posé sur le calque de `OverlayProvider` et non dans une `Modal` :
 * une modale ouvre sa propre fenêtre, dont l'origine ne coïncide pas avec le
 * repère de `measureInWindow`. Les coordonnées s'appliquent ici telles quelles.
 */
export default function InlineSelect({
  value,
  options,
  onSelect,
  accessibilityLabel,
}: InlineSelectProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const setOverlay = useOverlay();

  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  /*
   * `measureInWindow` et non `onLayout` : il faut la position à l'écran, pas
   * dans le parent — la pastille vit dans une page qui défile.
   */
  const open = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  const handleSelect = useCallback(
    (next: string) => {
      close();
      onSelect(next);
    },
    [close, onSelect]
  );

  /* Le retour système referme le menu au lieu de quitter l'écran. */
  useEffect(() => {
    if (!anchor) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [anchor, close]);

  /*
   * Le menu descend sous la pastille, sauf s'il n'y tient pas — auquel cas il
   * remonte au-dessus. Hauteur estimée plutôt que mesurée : la mesurer
   * imposerait un premier rendu invisible, donc un clignotement à l'ouverture.
   */
  const menuHeight = options.length * ITEM_HEIGHT + MENU_PADDING * 2;
  const spaceBelow = anchor ? windowHeight - (anchor.y + anchor.height) - SCREEN_MARGIN : 0;
  const opensDownward = !anchor || menuHeight <= spaceBelow;

  const menuTop = anchor
    ? opensDownward
      ? anchor.y + anchor.height + GAP
      : Math.max(SCREEN_MARGIN, anchor.y - GAP - menuHeight)
    : 0;

  /*
   * Aligné sur le bord gauche de la pastille, ramené dans l'écran s'il déborde.
   * La borne droite se calcule sur la largeur de la pastille — le menu fait au
   * moins la sienne — et non sur la largeur maximale : celle-ci ramenait le
   * garde-fou à la marge d'écran, où le menu se collait donc toujours.
   */
  const menuLeft = anchor
    ? Math.max(SCREEN_MARGIN, Math.min(anchor.x, windowWidth - SCREEN_MARGIN - anchor.width))
    : 0;

  const maxMenuWidth = anchor ? windowWidth - SCREEN_MARGIN - menuLeft : windowWidth;

  /*
   * Posé sur le calque depuis un effet, et non depuis le gestionnaire d'appui :
   * le contenu dépend de `anchor`, qui n'est connu qu'après la mesure. Le
   * retrait au démontage évite de laisser un menu orphelin si l'on quitte
   * l'écran pendant qu'il est ouvert.
   */
  useEffect(() => {
    if (!anchor) {
      setOverlay(null);
      return;
    }

    setOverlay(
      /* Appuyer à côté referme, sans voile sombre : le menu est un
         prolongement de la phrase, pas une couche par-dessus l'écran. */
      <Pressable style={styles.backdrop} onPress={close}>
        <Animated.View
          entering={FadeIn.duration(120)}
          style={[
            styles.menu,
            {
              top: menuTop,
              left: menuLeft,
              minWidth: anchor.width,
              maxWidth: maxMenuWidth,
              maxHeight: menuHeight,
              backgroundColor: theme.card,
              borderColor: theme.borderLight,
            },
          ]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  android_ripple={{ color: theme.ripple, foreground: true }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  style={styles.item}>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemLabel, { color: isSelected ? theme.tint : theme.text }]}>
                    {option.label}
                  </Text>
                  {/* La coche dit où l'on en est sans avoir à relire toute la
                      liste — utile quand le doigt masque le haut. */}
                  {isSelected && <Check size={16} color={theme.tint} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Pressable>
    );

    return () => setOverlay(null);
  }, [
    anchor,
    close,
    handleSelect,
    maxMenuWidth,
    menuHeight,
    menuLeft,
    menuTop,
    options,
    setOverlay,
    theme,
    value,
  ]);

  return (
    <Pressable
      ref={anchorRef}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: selected?.label }}
      style={[styles.chip, { backgroundColor: theme.card }]}>
      <Text style={[styles.chipLabel, { color: theme.tint }]}>{selected?.label}</Text>
      <ChevronDown size={20} color={theme.tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: MENU_PADDING,
    overflow: 'hidden',
    /* Le menu flotte au-dessus de la page : il lui faut une ombre pour s'en
       détacher, le voile étant volontairement absent. */
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    /* Plus haut que le pied flottant d'un écran, qui monte à 10 : sur Android
       l'élévation décide de l'ordre de tracé, et le menu doit rester dessus
       s'il descend jusque-là. */
    elevation: 16,
  },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  itemLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    flexShrink: 1,
  },
});
