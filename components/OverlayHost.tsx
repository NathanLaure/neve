import React, { createContext, ReactNode, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type SetOverlay = (node: ReactNode | null) => void;

const OverlayContext = createContext<SetOverlay>(() => {});

/**
 * Calque posé à la racine de l'application, pour ce qui doit s'ancrer sur une
 * position d'écran.
 *
 * Une `Modal` React Native ouvre sa **propre fenêtre**, dont l'origine ne
 * coïncide pas avec celle que `measureInWindow` prend pour repère : sur Android
 * en affichage bord à bord, la fenêtre de l'application passe sous la barre
 * d'état, celle de la modale se pose dessous. Un menu positionné avec des
 * coordonnées mesurées d'un côté et appliquées de l'autre tombe donc à côté, et
 * l'écart n'est pas une constante qu'on puisse retrancher une bonne fois.
 *
 * Ce calque vit dans la même fenêtre que le reste de l'app : les coordonnées
 * rendues par `measureInWindow` s'y appliquent telles quelles, sans correction.
 *
 * Un seul contenu à la fois — un menu ancré est exclusif par nature, et cela
 * évite d'avoir à gérer une pile.
 */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode | null>(null);

  return (
    <OverlayContext.Provider value={setNode}>
      {/*
        `children` garde la même identité d'élément d'un rendu à l'autre : React
        saute donc le sous-arbre quand seul le calque change. Poser un menu ne
        redessine pas l'application.
      */}
      {children}
      {node !== null && <View style={StyleSheet.absoluteFill}>{node}</View>}
    </OverlayContext.Provider>
  );
}

/** Pose un contenu sur le calque, ou le retire avec `null`. */
export function useOverlay(): SetOverlay {
  return useContext(OverlayContext);
}
