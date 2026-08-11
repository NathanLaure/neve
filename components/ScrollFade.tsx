import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** En deçà, le reliquat de contenu est trop mince pour valoir un fondu. */
const SCROLL_EPSILON = 8;

const FADE_DURATION = 160;

export interface ScrollFadeProps {
  /** Vrai tant qu'il reste du contenu sous la zone visible. */
  visible: boolean;
  /** Couleur de la surface vers laquelle le contenu s'efface. */
  color: string;
  /** Hauteur du fondu. */
  height?: number;
}

/**
 * Suit une zone défilante pour savoir s'il reste du contenu dessous.
 *
 * Le fondu n'a de sens que dans ce cas : affiché en permanence, il suggérerait
 * qu'on peut défiler alors qu'on est déjà en bas.
 */
export function useScrollFade() {
  const [hasMore, setHasMore] = useState(false);

  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const offsetY = useRef(0);

  const refresh = useCallback(() => {
    const remaining = contentHeight.current - viewportHeight.current - offsetY.current;
    setHasMore(remaining > SCROLL_EPSILON);
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = event.nativeEvent.contentOffset.y;
      refresh();
    },
    [refresh]
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      refresh();
    },
    [refresh]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      refresh();
    },
    [refresh]
  );

  return {
    hasMore,
    /** À étaler sur la `ScrollView` — les trois mesures sont nécessaires. */
    scrollProps: { scrollEventThrottle: 16, onScroll, onContentSizeChange, onLayout },
  };
}

/**
 * Fondu en bas d'une liste, pour signaler qu'elle continue.
 *
 * À poser en dernier enfant d'un conteneur qui porte la zone défilante : il se
 * cale sur le bas de ce conteneur et laisse passer les appuis.
 */
export function ScrollFade({ visible, color, height = 56 }: ScrollFadeProps) {
  /* eslint-disable react-hooks/immutability */
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: FADE_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value stable
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { height }, animatedStyle]}>
      <LinearGradient
        // `transparent` littéral plutôt qu'une couleur à alpha nul : sur Android,
        // dégrader vers `#RRGGBB00` vire au gris en cours de route.
        colors={['transparent', color]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default ScrollFade;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
