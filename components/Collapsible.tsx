import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Durée et courbe communes aux ouvertures/fermetures et aux chevrons qui les
 * annoncent : le pictogramme et le contenu doivent bouger ensemble, sinon la
 * flèche arrive avant le panneau et l'ouverture paraît saccadée.
 */
export const COLLAPSE_DURATION = 240;
export const COLLAPSE_EASING = Easing.out(Easing.cubic);

const TIMING = { duration: COLLAPSE_DURATION, easing: COLLAPSE_EASING };

export interface CollapsibleProps {
  expanded: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Conteneur qui déplie son contenu en hauteur plutôt que de l'afficher d'un coup.
 *
 * La hauteur est mesurée et non codée en dur : elle dépend du texte, de la taille
 * de police système et du nombre d'étapes. Tant qu'elle est inconnue, l'animation
 * vise 0 ; la première mesure la re-cible et `withTiming` repart de la valeur
 * courante, il n'y a donc pas de saut au premier dépliage.
 *
 * Le contenu est démonté une fois replié : dans une liste de résultats, garder
 * une timeline complète montée par carte coûte cher pour quelque chose
 * d'invisible, et un enfant de hauteur nulle consommerait quand même le `gap`
 * du conteneur parent.
 */
export function Collapsible({ expanded, children, style }: CollapsibleProps) {
  /*
   * Écrire dans une shared value est le mode d'emploi normal de Reanimated, mais
   * la règle y voit une mutation pendant le rendu.
   */
  /* eslint-disable react-hooks/immutability */

  const contentHeight = useSharedValue(0);
  // Cible d'ouverture portée par une shared value, et non lue depuis les props :
  // seule la mise à jour d'une shared value réveille le worklet. Un worklet qui
  // ne lirait que `expanded` resterait figé sur sa valeur de départ.
  const isOpen = useSharedValue(expanded ? 1 : 0);
  const [isMounted, setIsMounted] = useState(expanded);

  useEffect(() => {
    isOpen.value = expanded ? 1 : 0;

    if (expanded) {
      setIsMounted(true);
      return;
    }
    // On attend la fin du repli avant de démonter, sinon le contenu disparaît
    // instantanément et il ne reste qu'un cadre vide à animer.
    const timer = setTimeout(() => setIsMounted(false), COLLAPSE_DURATION);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stables
  }, [expanded]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height === contentHeight.value) return;
    contentHeight.value = height;
  };

  const animatedStyle = useAnimatedStyle(() => {
    const open = isOpen.value === 1;
    return {
      height: withTiming(open ? contentHeight.value : 0, TIMING),
      opacity: withTiming(open ? 1 : 0, TIMING),
    };
  });

  if (!isMounted) return null;

  return (
    <Animated.View
      style={[styles.clip, animatedStyle, style]}
      // Le contenu rogné reste dans l'arbre pendant le repli : sans ça, il
      // resterait cliquable une fraction de seconde après sa disparition.
      pointerEvents={expanded ? 'auto' : 'none'}>
      {/*
        Vue de mesure sortie du flux, et c'est indispensable : en flux, sa hauteur
        est contrainte par celle du parent — qu'on anime justement à 0. `onLayout`
        renverrait alors la hauteur rognée, qui réécrirait `contentHeight`, qui
        deviendrait la nouvelle cible de l'animation. La hauteur convergerait vers
        zéro et le panneau resterait fermé. En absolu, l'enfant garde sa hauteur
        naturelle quoi que fasse le parent.
      */}
      <View style={styles.measured} onLayout={handleLayout}>
        {children}
      </View>
    </Animated.View>
  );
}

export default Collapsible;

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  measured: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
