import { ViewStyle } from 'react-native';

/**
 * Encadré en pointillés — le motif des zones « à remplir » du parcours de
 * planification : choix de date, ajout de randonneur, saisie d'un nouveau
 * randonneur.
 *
 * Extrait ici parce que ces valeurs étaient recopiées dans trois `StyleSheet` de
 * deux fichiers : rien n'empêchait l'une d'évoluer sans les autres, et elles
 * doivent se lire comme un seul et même objet d'interface.
 *
 * Ne porte que la géométrie. La couleur reste appliquée en ligne par chaque
 * appelant, `theme.borderStrong` dépendant du thème actif.
 */
export const DASHED_BOX: ViewStyle = {
  borderWidth: 1,
  borderStyle: 'dashed',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 12,
  gap: 8,
};

/** Hauteur des variantes en ligne cliquable — pas de la carte de saisie. */
export const DASHED_BOX_ROW_HEIGHT = 48;
