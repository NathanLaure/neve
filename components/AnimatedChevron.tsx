import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { COLLAPSE_DURATION, COLLAPSE_EASING } from '@/components/Collapsible';

export interface AnimatedChevronProps {
  expanded: boolean;
  /** Sens au repos : le chevron finit toujours par pointer vers le contenu ouvert. */
  direction?: 'down' | 'right';
  size?: number;
  color: string;
}

/**
 * Chevron qui pivote au rythme du panneau qu'il commande — mêmes durée et courbe
 * que `Collapsible`, sans quoi la flèche arriverait avant le contenu.
 */
export const AnimatedChevron: React.FC<AnimatedChevronProps> = ({
  expanded,
  direction = 'down',
  size = 16,
  color,
}) => {
  // Le chevron « bas » se retourne, le chevron « droite » bascule d'un quart de
  // tour — dans les deux cas il finit en pointant vers le contenu déplié.
  const openAngle = direction === 'down' ? 180 : 90;

  // L'animation est pilotée depuis l'effet : un worklet qui lirait `expanded`
  // directement resterait figé sur la valeur du premier rendu.
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: COLLAPSE_DURATION,
      easing: COLLAPSE_EASING,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stables
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * openAngle}deg` }],
  }));

  const Icon = direction === 'down' ? ChevronDown : ChevronRight;

  return (
    <Animated.View style={animatedStyle}>
      <Icon size={size} color={color} />
    </Animated.View>
  );
};

export default AnimatedChevron;
