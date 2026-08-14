import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Easing, SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Mode immersif des écrans carte : un tap sur une zone vide de la carte efface le
 * mobilier (TabBar, contrôles, carrousel, feuille) pour ne laisser que la carte.
 *
 * La TabBar est rendue par le navigateur d'onglets, pas par l'écran : le seul
 * ancêtre commun est le layout des onglets, d'où ce contexte. On y fait transiter
 * une `SharedValue` et non un booléen d'état — la barre s'anime alors sur le thread
 * UI sans re-rendre ni la barre ni la carte à chaque image.
 */

/**
 * Courbe unique de la bascule immersive.
 *
 * Tout ce qui bouge — barre d'onglets, feuille, carrousel, contrôles, FAB — la
 * partage, sinon la scène se disloque : la barre filait en 220 ms pendant que la
 * feuille mettait 250 ms à descendre, et on la voyait flotter au-dessus du vide,
 * son ombre traînant derrière. Ce sont les valeurs par défaut de gorhom, qu'on ne
 * peut pas resynchroniser autrement pour la feuille.
 */
export const IMMERSIVE_ANIMATION = {
  duration: 250,
  easing: Easing.out(Easing.exp),
};

interface MapImmersiveContextValue {
  /** 0 = mobilier bas en place, 1 = entièrement sorti de l'écran. */
  immersiveProgress: SharedValue<number>;
  setImmersive: (immersive: boolean) => void;
}

const MapImmersiveContext = createContext<MapImmersiveContextValue | undefined>(undefined);

export function MapImmersiveProvider({ children }: { children: ReactNode }) {
  const immersiveProgress = useSharedValue(0);

  const setImmersive = useCallback((immersive: boolean) => {
    immersiveProgress.value = withTiming(immersive ? 1 : 0, IMMERSIVE_ANIMATION);
    // `immersiveProgress` est stable pour la durée de vie du provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ immersiveProgress, setImmersive }),
    [immersiveProgress, setImmersive]
  );

  return <MapImmersiveContext.Provider value={value}>{children}</MapImmersiveContext.Provider>;
}

function useMapImmersiveContext(): MapImmersiveContextValue {
  const context = useContext(MapImmersiveContext);
  if (!context) {
    throw new Error('useMapImmersiveContext doit être utilisé dans un MapImmersiveProvider');
  }
  return context;
}

/**
 * Progression du retrait, partagée par tout le mobilier bas.
 *
 * La barre d'onglets et la feuille de résultats l'appliquent à la même distance :
 * jointives à l'écran, elles doivent le rester en glissant, comme un seul bloc.
 */
export function useImmersiveProgress(): SharedValue<number> {
  return useMapImmersiveContext().immersiveProgress;
}

/**
 * État immersif d'un écran carte, avec ses garde-fous.
 *
 * Sortir du mode à la perte de focus n'est pas cosmétique : la TabBar masquée, on
 * ne peut plus changer d'onglet, et une barre laissée escamotée en revenant depuis
 * une fiche rando bloquerait la navigation.
 */
export function useMapImmersiveMode() {
  const { setImmersive } = useMapImmersiveContext();
  const [isImmersive, setIsImmersive] = useState(false);

  useEffect(() => {
    setImmersive(isImmersive);
  }, [isImmersive, setImmersive]);

  const exitImmersive = useCallback(() => setIsImmersive(false), []);
  const toggleImmersive = useCallback(() => setIsImmersive((previous) => !previous), []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsImmersive(false);
        // Redonné aussi directement : sur un démontage, l'effet de synchronisation
        // ci-dessus ne repassera pas et la barre resterait escamotée.
        setImmersive(false);
      };
    }, [setImmersive])
  );

  // Sur Android, le retour matériel doit rendre le mobilier plutôt que quitter
  // l'application : c'est le geste réflexe pour sortir d'un plein écran.
  useEffect(() => {
    if (Platform.OS !== 'android' || !isImmersive) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsImmersive(false);
      return true;
    });
    return () => subscription.remove();
  }, [isImmersive]);

  return { isImmersive, toggleImmersive, exitImmersive };
}
