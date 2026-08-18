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

export type TransportPassId = 'navigo' | 'sncf_avantage' | 'sncf_liberte' | 'ter';

export interface TransportPass {
  id: TransportPassId;
  label: string;
  /** Forme courte, pour les lignes où plusieurs abonnements se côtoient. */
  shortLabel: string;
  /** Ce que l'abonnement change concrètement, affiché sous le libellé. */
  hint: string;
}

/**
 * Les abonnements qu'un randonneur peut détenir. Un même voyageur peut en
 * cumuler plusieurs — Navigo pour les trajets franciliens et Carte Avantage
 * pour le TER du week-end, c'est le cas courant —, d'où une liste et non un
 * choix unique. L'absence d'abonnement se code par une liste vide, pas par une
 * entrée « aucun » : `['none', 'navigo']` n'aurait aucun sens.
 */
export const TRANSPORT_PASSES: TransportPass[] = [
  {
    id: 'navigo',
    label: 'Pass Navigo',
    shortLabel: 'Navigo',
    hint: 'Trajets illimités en Île-de-France',
  },
  {
    id: 'sncf_avantage',
    label: 'Carte Avantage SNCF',
    shortLabel: 'Avantage',
    hint: 'Réductions sur les TGV et Intercités',
  },
  {
    id: 'sncf_liberte',
    label: 'Carte Liberté SNCF',
    shortLabel: 'Liberté',
    hint: 'Tarifs réduits et échanges sans frais',
  },
  {
    id: 'ter',
    label: 'Abonnement TER régional',
    shortLabel: 'TER',
    hint: 'Trajets régionaux à tarif abonné',
  },
];

const TRANSPORT_PASS_IDS = new Set<string>(TRANSPORT_PASSES.map((pass) => pass.id));

export function getTransportPassLabel(id: TransportPassId): string {
  return TRANSPORT_PASSES.find((pass) => pass.id === id)?.label ?? id;
}

/**
 * Nettoie une liste d'abonnements venue de l'extérieur — colonne Supabase
 * `text[]`, aventure enregistrée en JSONB, paramètre de navigation. Écarte les
 * identifiants inconnus, dédoublonne, et remet la liste dans l'ordre de
 * `TRANSPORT_PASSES` pour que deux voyageurs équipés pareil se regroupent
 * quel que soit l'ordre de saisie.
 */
export function normalizePasses(raw: unknown): TransportPassId[] {
  if (!Array.isArray(raw)) return [];
  const kept = new Set<TransportPassId>();
  raw.forEach((value) => {
    if (typeof value === 'string' && TRANSPORT_PASS_IDS.has(value)) {
      kept.add(value as TransportPassId);
    }
  });
  return TRANSPORT_PASSES.filter((pass) => kept.has(pass.id)).map((pass) => pass.id);
}

/**
 * Étiquette des abonnements d'une ligne : `null` quand il n'y en a aucun, le
 * libellé complet pour un seul, les formes courtes séparées par des points
 * médians au-delà — « Navigo · Avantage » tient là où deux libellés entiers
 * déborderaient.
 */
export function formatPassesLabel(passes: TransportPassId[]): string | null {
  if (passes.length === 0) return null;
  if (passes.length === 1) return getTransportPassLabel(passes[0]);
  return passes
    .map((id) => TRANSPORT_PASSES.find((pass) => pass.id === id)?.shortLabel ?? id)
    .join(' · ');
}

/**
 * Résumé d'une sélection d'abonnements pour une puce de filtre : le premier en
 * toutes lettres, le reste en compteur — « Pass Navigo +1 » (Figma 49:2895).
 *
 * Une puce doit tenir sur une ligne partagée : au-delà du premier intitulé, il
 * vaut mieux annoncer combien il en reste que tronquer une énumération.
 */
export function formatPassesSummary(passes: TransportPassId[], emptyLabel = 'Aucun pass'): string {
  const ordered = normalizePasses(passes);
  if (ordered.length === 0) return emptyLabel;
  const first = getTransportPassLabel(ordered[0]);
  return ordered.length === 1 ? first : `${first} +${ordered.length - 1}`;
}

export interface Passenger {
  id: string;
  bracket: AgeBracketId;
  /** Abonnements détenus. Liste vide = aucun abonnement. */
  passes: TransportPassId[];
}

export function getAgeBracketLabel(id: AgeBracketId): string {
  return AGE_BRACKETS.find((bracket) => bracket.id === id)?.label ?? id;
}

/**
 * Un voyageur par défaut : on ne planifie jamais une aventure pour zéro personne.
 *
 * Le premier voyageur, c'est l'utilisateur : il part avec les abonnements
 * déclarés à l'inscription, sans quoi il les ressaisirait à chaque aventure.
 */
export function createDefaultPassengers(ownPasses: TransportPassId[] = []): Passenger[] {
  return [{ id: 'passenger-0', bracket: DEFAULT_AGE_BRACKET, passes: normalizePasses(ownPasses) }];
}

/**
 * Relit une liste de voyageurs venue d'un paramètre de navigation ou d'une
 * aventure enregistrée en base. Renvoie `null` quand il n'y a rien d'exploitable,
 * pour laisser l'appelant retomber sur `createDefaultPassengers()`.
 *
 * Les aventures enregistrées avant le passage au multi-abonnement portent un
 * `discountPass` unique, `'none'` compris : il est converti ici, faute de quoi
 * elles se rouvriraient sans aucun abonnement.
 */
export function normalizePassengers(raw: unknown): Passenger[] | null {
  const list = typeof raw === 'string' ? safeParse(raw) : raw;
  if (!Array.isArray(list) || list.length === 0) return null;

  const passengers = list.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const source = entry as Record<string, unknown>;
    const legacyPass = source.discountPass;

    return [
      {
        id: typeof source.id === 'string' ? source.id : `passenger-${index}`,
        bracket: AGE_BRACKETS.some((bracket) => bracket.id === source.bracket)
          ? (source.bracket as AgeBracketId)
          : DEFAULT_AGE_BRACKET,
        passes: source.passes !== undefined ? normalizePasses(source.passes) : normalizePasses([legacyPass]),
      },
    ];
  });

  return passengers.length > 0 ? passengers : null;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Une ligne de la carte « Qui part ? » : les voyageurs qui partagent la même
 * tranche d'âge ET les mêmes abonnements, comptés ensemble (Figma 650:33984).
 */
export interface PassengerGroup {
  /** Identité de la ligne — change dès que la tranche ou les abonnements changent. */
  key: string;
  bracket: AgeBracketId;
  passes: TransportPassId[];
  /** Voyageurs du groupe, dans l'ordre de la liste. */
  ids: string[];
  count: number;
  /** Le groupe contient le premier voyageur, celui qui planifie l'aventure. */
  includesSelf: boolean;
}

/** Clé d'un groupe. `normalizePasses` ayant trié la liste, deux équipements
 *  identiques produisent la même chaîne quel que soit l'ordre de saisie. */
function groupKey(bracket: AgeBracketId, passes: TransportPassId[]): string {
  return `${bracket}|${passes.join(',')}`;
}

/**
 * Regroupe les voyageurs par (tranche, abonnements), dans l'ordre d'apparition.
 * L'écran affiche une ligne par groupe avec un compteur, pas une ligne par
 * personne : deux randonneurs identiques n'ont rien à distinguer.
 */
export function groupPassengers(passengers: Passenger[]): PassengerGroup[] {
  const groups: PassengerGroup[] = [];

  passengers.forEach((passenger, index) => {
    const passes = normalizePasses(passenger.passes);
    const key = groupKey(passenger.bracket, passes);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.ids.push(passenger.id);
      existing.count += 1;
      return;
    }

    groups.push({
      key,
      bracket: passenger.bracket,
      passes,
      ids: [passenger.id],
      count: 1,
      includesSelf: index === 0,
    });
  });

  return groups;
}

/** « 1 pers. » / « 3 pers. » — le libellé de la puce d'en-tête. */
export function formatPassengerCount(passengers: Passenger[]): string {
  return `${passengers.length} pers.`;
}

/**
 * Tout le groupe détient-il cet abonnement ?
 *
 * Une liste vide répond non : rien n'est couvert quand personne ne voyage. Sert
 * à décider ce qui s'annonce pour le trajet entier — un « Inclus Navigo » n'est
 * vrai que si aucun randonneur n'a de billet à acheter.
 */
export function allPassengersHave(passengers: Passenger[], pass: TransportPassId): boolean {
  return passengers.length > 0 && passengers.every((passenger) => passenger.passes.includes(pass));
}
