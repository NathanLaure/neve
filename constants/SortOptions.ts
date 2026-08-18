import type { RandoData } from '@/constants/RandosData';

/**
 * Critères de tri de la liste de résultats (Figma 49:4766 « Trier par »).
 *
 * L'ordre de cette liste est celui de la feuille, et `relevance` est le repli :
 * c'est l'ordre dans lequel la recherche a rendu ses résultats, celui qu'on
 * retrouve tant que l'utilisateur n'a rien choisi.
 */
export type SortOptionId =
  | 'nearest'
  | 'fastest_access'
  | 'least_elevation'
  | 'most_popular'
  | 'newest'
  | 'relevance'
  | 'longest'
  | 'shortest';

export interface SortOption {
  id: SortOptionId;
  label: string;
}

/* Les icônes ne sont pas ici : ce module est du TypeScript pur, importé aussi
   bien par la feuille que par l'écran de résultats. C'est `SortBottomSheet` qui
   les associe, à l'endroit où elles se dessinent. */
export const SORT_OPTIONS: SortOption[] = [
  { id: 'nearest', label: 'Le plus proche' },
  { id: 'fastest_access', label: "Le plus rapide d'accès" },
  { id: 'least_elevation', label: 'Le moins de dénivelé' },
  { id: 'most_popular', label: 'Le plus populaire' },
  { id: 'newest', label: 'Nouveautés' },
  { id: 'relevance', label: 'Pertinence' },
  { id: 'longest', label: 'Le plus long' },
  { id: 'shortest', label: 'Le plus court' },
];

export const DEFAULT_SORT_OPTION: SortOptionId = 'relevance';

export function getSortOptionLabel(id: SortOptionId): string {
  return SORT_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

/**
 * Valeur de comparaison d'une randonnée pour un critère donné, toujours
 * croissante : le tri se fait en ordre naturel et les critères « le plus » sont
 * exprimés en négatif. `null` signifie « donnée absente » et renvoie la
 * randonnée en fin de liste plutôt que de la faire passer pour un zéro.
 */
function sortValue(
  hike: RandoData,
  id: SortOptionId,
  distanceFromUserKm: (hike: RandoData) => number | null
): number | null {
  switch (id) {
    case 'nearest':
      return distanceFromUserKm(hike);
    case 'fastest_access':
      return hike.trainDurationMinutes ?? null;
    case 'least_elevation':
      return hike.elevationGainM ?? null;
    case 'most_popular': {
      // Une moyenne sans avis ne veut rien dire : on ne classe que ce qui est noté.
      if (!hike.ratingCount || hike.ratingAvg == null) return null;
      return -hike.ratingAvg;
    }
    case 'newest': {
      if (!hike.createdAt) return null;
      const time = new Date(hike.createdAt).getTime();
      return Number.isNaN(time) ? null : -time;
    }
    case 'longest':
      return hike.distanceKm != null ? -hike.distanceKm : null;
    case 'shortest':
      return hike.distanceKm ?? null;
    case 'relevance':
    default:
      return null;
  }
}

/**
 * Trie les résultats selon le critère choisi, sans modifier le tableau reçu.
 *
 * `distanceFromUserKm` est fourni par l'appelant : la distance dépend de la
 * position courante, que ce module n'a pas à connaître. Elle renvoie `null`
 * quand la position est inconnue, ce qui neutralise le tri « le plus proche »
 * au lieu de produire un classement arbitraire.
 */
export function sortHikes(
  hikes: RandoData[],
  id: SortOptionId,
  distanceFromUserKm: (hike: RandoData) => number | null = () => null
): RandoData[] {
  if (id === 'relevance') return hikes;

  return [...hikes].sort((a, b) => {
    const va = sortValue(a, id, distanceFromUserKm);
    const vb = sortValue(b, id, distanceFromUserKm);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return va - vb;
  });
}
