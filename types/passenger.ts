/**
 * Voyageurs d'une aventure planifiée.
 *
 * Les tranches d'âge sont calquées sur les catégories tarifaires SNCF (gratuité
 * jusqu'à 3 ans, tarif jeune, plein tarif, senior à partir de 60 ans).
 *
 * IMPORTANT — en Île-de-France, l'âge NE CHANGE PAS le prix : le ticket
 * Métro-Train-RER est à 2,55 € pour tout le monde. La tranche est donc collectée
 * mais sans effet sur le tarif tant que l'app reste francilienne. Elle deviendra
 * significative au passage au national (TGV/TER), où les grilles dépendent de
 * l'âge. Voir estimateFare() dans supabase/functions/transit-journeys/index.ts.
 */

export type AgeBracketId = 'infant' | 'young' | 'adult' | 'senior';

export interface AgeBracket {
  id: AgeBracketId;
  /** Libellé affiché, ex. « 4 - 29 ans ». */
  label: string;
}

export const AGE_BRACKETS: AgeBracket[] = [
  { id: 'infant', label: '0 - 3 ans' },
  { id: 'young', label: '4 - 29 ans' },
  { id: 'adult', label: '30 - 59 ans' },
  { id: 'senior', label: '60 ans et +' },
];

export const DEFAULT_AGE_BRACKET: AgeBracketId = 'young';

export interface Passenger {
  id: string;
  bracket: AgeBracketId;
}

export function getAgeBracketLabel(id: AgeBracketId): string {
  return AGE_BRACKETS.find((bracket) => bracket.id === id)?.label ?? id;
}

/** Un voyageur par défaut : on ne planifie jamais une aventure pour zéro personne. */
export function createDefaultPassengers(): Passenger[] {
  return [{ id: 'passenger-0', bracket: DEFAULT_AGE_BRACKET }];
}

/**
 * Regroupe les voyageurs par tranche, dans l'ordre de AGE_BRACKETS.
 * L'écran affiche une ligne par tranche avec un compteur, pas une ligne par personne.
 */
export function groupByBracket(passengers: Passenger[]): { bracket: AgeBracket; count: number }[] {
  return AGE_BRACKETS.map((bracket) => ({
    bracket,
    count: passengers.filter((passenger) => passenger.bracket === bracket.id).length,
  })).filter((entry) => entry.count > 0);
}

/** « 1 pers. » / « 3 pers. » — le libellé de la puce d'en-tête. */
export function formatPassengerCount(passengers: Passenger[]): string {
  return `${passengers.length} pers.`;
}
