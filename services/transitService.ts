import idfStationsData from '@/data/idf-train-stations.json';
import type { TrainOption } from '@/constants/RandosData';
import { supabase } from '@/utils/supabase';

export interface Station {
  id: string;
  name: string;
  shortCode?: string;
  latitude: number;
  longitude: number;
  insee?: string;
  uic?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface IntermediateStop {
  name: string;
  time?: string;
}

/**
 * Perturbation telle que publiée par Île-de-France Mobilités, déjà mise en forme
 * par l'Edge Function (HTML aplati, période lisible, ligne concernée).
 */
export interface Disruption {
  id: string;
  severity: 'blocking' | 'warning' | 'info';
  title: string;
  message: string;
  period?: string;
  lineName?: string;
  mode?: TransitLeg['mode'];
}

export interface TransitLeg {
  mode: 'train' | 'rer' | 'metro' | 'tram' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  fromName: string;
  toName: string;
  durationMinutes: number;
  /**
   * Nature d'un tronçon à pied : rejoindre le réseau depuis le point de départ
   * (`access`), changer de quai (`transfer`), rejoindre la destination (`egress`).
   */
  walkType?: 'access' | 'transfer' | 'egress';
  departureTime?: string;
  arrivalTime?: string;
  direction?: string;
  intermediateStopsCount?: number;
  intermediateStops?: (IntermediateStop | string)[];
}

export interface TransitOption {
  id: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  durationFormatted: string;
  transfers: number;
  lineName: string;
  /** Mode du premier tronçon en transport (`rer`, `train`, `bus`…), tel que normalisé côté serveur. */
  lineType: string;
  priceEstimate: number;
  isLastTrain?: boolean;
  co2Grams?: number;
  hasPerturbations?: boolean;
  perturbationsCount?: number;
  disruptionLabel?: string;
  disruptionSeverity?: 'blocking' | 'warning' | 'info';
  disruptions?: Disruption[];
  legs: TransitLeg[];
}

/**
 * D'où viennent les horaires affichés.
 * `live`/`cache` : calculateur Île-de-France Mobilités, horaires réels.
 * `fallback` : estimation locale, à signaler comme indicative dans l'UI.
 */
export type TransitSource = 'live' | 'cache' | 'fallback';

export interface TransitResult {
  options: TransitOption[];
  source: TransitSource;
}

export interface Co2Impact {
  carCo2Kg: number;
  trainCo2Kg: number;
  savedCo2Kg: number;
  treesEquivalent: number;
}

const STATIONS: Station[] = idfStationsData as Station[];

/**
 * Searches for train stations matching a query string (e.g. "Montparnasse", "Fontainebleau", "Lyon")
 */
export function searchStations(query: string, limit = 8): Station[] {
  if (!query || query.trim().length === 0) return STATIONS.slice(0, limit);
  const q = query.toLowerCase().trim();
  return STATIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.shortCode && s.shortCode.toLowerCase().includes(q))
  ).slice(0, limit);
}

/**
 * Returns the `limit` closest stations to a point, nearest first, dropping any
 * beyond `maxDistanceKm`. Used to offer the user a realistic departure station
 * instead of a hardcoded list of Paris terminals.
 */
export function findNearestStations(
  lat: number,
  lng: number,
  limit = 3,
  maxDistanceKm = 10.0
): Station[] {
  return STATIONS.map((station) => ({
    station,
    distanceKm: getDistanceKm(lat, lng, station.latitude, station.longitude),
  }))
    .filter((entry) => entry.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((entry) => entry.station);
}

/**
 * Find station by name or closest to coordinates
 */
export function findNearestStation(lat: number, lng: number, maxDistanceKm = 10.0): Station | null {
  return findNearestStations(lat, lng, 1, maxDistanceKm)[0] ?? null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats duration in minutes to readable text (e.g. 45 min or 1h15)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Calculates CO2 emission comparison between driving and taking the train
 */
export function calculateCo2Impact(distanceKm: number): Co2Impact {
  // Car average in France: ~120g CO2 / km
  const carCo2GramsPerKm = 120;
  // Train average (SNCF / Transilien électricité de France): ~3.2g CO2 / km
  const trainCo2GramsPerKm = 3.2;

  const carCo2Kg = Number(((distanceKm * carCo2GramsPerKm) / 1000).toFixed(2));
  const trainCo2Kg = Number(((distanceKm * trainCo2GramsPerKm) / 1000).toFixed(2));
  const savedCo2Kg = Number((carCo2Kg - trainCo2Kg).toFixed(2));

  // Average tree absorbs ~20kg CO2 per year (~0.05kg / day)
  const treesEquivalent = Number((savedCo2Kg / 0.05).toFixed(1));

  return {
    carCo2Kg,
    trainCo2Kg,
    savedCo2Kg,
    treesEquivalent,
  };
}

// Tarif Île-de-France 2026, ticket Métro-Train-RER à l'unité. Doit rester aligné
// sur FARE_RAIL_EUR dans supabase/functions/transit-journeys/index.ts.
const FALLBACK_FARE_EUR = 2.55;

/** `HH:MM` -> minutes depuis minuit. */
function parseHHMM(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes depuis minuit -> `HH:MM`, borné à la journée. */
function formatHHMM(minutesFromMidnight: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutesFromMidnight)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Horaires de repli, utilisés quand le calculateur IDFM est indisponible (clé non
 * configurée, panne, hors couverture). Ce sont des ESTIMATIONS : la durée dérive
 * de la distance à vol d'oiseau, et les départs sont supposés horaires. L'appelant
 * doit les signaler comme indicatifs — jamais les présenter comme de vrais horaires.
 *
 * Aucune perturbation ici : l'info trafic vient d'IDFM et n'a pas d'équivalent
 * estimable localement. Annoncer un trafic interrompu qu'on n'a pas constaté
 * serait pire qu'un silence.
 */
const FALLBACK_PATTERNS = [
  {
    transfers: 1,
    legs: [
      { mode: 'rer' as const, lineName: 'A', lineColor: '#FF1400', durationMinutes: 25 },
      { mode: 'walk' as const, durationMinutes: 5 },
      { mode: 'metro' as const, lineName: '6', lineColor: '#82DC73', durationMinutes: 15 },
    ],
  },
  {
    transfers: 1,
    legs: [
      { mode: 'train' as const, lineName: 'L', lineColor: '#D282BE', durationMinutes: 30 },
      { mode: 'walk' as const, durationMinutes: 8 },
      { mode: 'bus' as const, lineName: '94', lineColor: '#760C6B', durationMinutes: 20 },
    ],
  },
  {
    transfers: 0,
    legs: [
      { mode: 'rer' as const, lineName: 'B', lineColor: '#3C91DC', durationMinutes: 40 },
    ],
  },
  {
    transfers: 1,
    legs: [
      { mode: 'metro' as const, lineName: '1', lineColor: '#FFBE00', durationMinutes: 18 },
      { mode: 'walk' as const, durationMinutes: 4 },
      { mode: 'tram' as const, lineName: 'T2', lineColor: '#0055C8', durationMinutes: 22 },
    ],
  },
  {
    transfers: 0,
    legs: [
      { mode: 'train' as const, lineName: 'J', lineColor: '#D2D200', durationMinutes: 45 },
    ],
  },
];

export function generateFallbackOptions(
  from: Coordinates,
  to: Coordinates,
  fromName: string,
  toName: string,
  time: string,
  timeMode: TimeMode = 'departure',
  direction: 'go' | 'back' = 'go'
): TransitOption[] {
  const distanceKm = getDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
  const durationMinutes = Math.max(15, Math.min(180, Math.round(distanceKm * 1.4 + 12)));

  const reference = parseHHMM(time);
  const firstDeparture =
    timeMode === 'arrival' ? reference - durationMinutes - 4 * 60 : reference;

  return Array.from({ length: 5 }, (_, idx) => {
    const pattern = FALLBACK_PATTERNS[idx % FALLBACK_PATTERNS.length];
    const departureMinutes = firstDeparture + idx * 60;
    const legs: TransitLeg[] = pattern.legs.map((l) => ({
      mode: l.mode,
      lineName: l.lineName,
      lineColor: l.lineColor,
      fromName: fromName,
      toName: toName,
      durationMinutes: Math.round(durationMinutes / pattern.legs.length),
    }));

    return {
      id: `fallback-${direction}-${idx}`,
      departureTime: formatHHMM(departureMinutes),
      arrivalTime: formatHHMM(departureMinutes + durationMinutes),
      durationMinutes,
      durationFormatted: formatDuration(durationMinutes),
      transfers: pattern.transfers,
      lineName: legs[0]?.lineName || '',
      lineType: legs[0]?.mode || 'train',
      priceEstimate: FALLBACK_FARE_EUR,
      hasPerturbations: false,
      legs,
    };
  });
}

/**
 * `departure` : « je pars après cette heure ». `arrival` : « je veux être arrivé
 * avant cette heure ».
 */
export type TimeMode = 'departure' | 'arrival';

export interface TransitQuery {
  from: Coordinates;
  to: Coordinates;
  fromName: string;
  toName: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, interprété selon `timeMode`. */
  time: string;
  timeMode?: TimeMode;
  direction?: 'go' | 'back';
}

/** Repli quand l'horizon PRIM n'est pas lisible : on borne à 30 jours. */
const FALLBACK_HORIZON_DAYS = 365;

/**
 * Dernière date pour laquelle le calculateur a des horaires (`YYYY-MM-DD`).
 *
 * C'est `end_production_date` de la couverture Navitia : au-delà, il n'existe
 * aucune donnée. Le calendrier s'en sert pour griser les jours plutôt que de
 * laisser l'utilisateur demander une date qui ne peut rien retourner.
 */
export async function fetchTransitHorizon(): Promise<string> {
  const fallback = () => {
    const date = new Date();
    date.setDate(date.getDate() + FALLBACK_HORIZON_DAYS);
    return date.toISOString().slice(0, 10);
  };

  try {
    const { data, error } = await supabase.functions.invoke('transit-journeys', {
      body: { mode: 'horizon' },
    });
    if (error || typeof data?.horizon !== 'string') return fallback();
    return data.horizon;
  } catch {
    return fallback();
  }
}

/**
 * Fetches real journeys from the Île-de-France Mobilités calculator, through the
 * `transit-journeys` Edge Function (which holds the API key and the shared cache).
 *
 * Never rejects: any failure downgrades to local estimates flagged as `fallback`,
 * so the planning screen always has something to show.
 */
export async function fetchTransitOptions(query: TransitQuery): Promise<TransitResult> {
  const { from, to, fromName, toName, date, time, timeMode = 'departure', direction = 'go' } = query;

  const fallback = (): TransitResult => ({
    options: generateFallbackOptions(from, to, fromName, toName, time, timeMode, direction),
    source: 'fallback',
  });

  try {
    const { data, error } = await supabase.functions.invoke('transit-journeys', {
      body: {
        from: { lat: from.latitude, lng: from.longitude },
        to: { lat: to.latitude, lng: to.longitude },
        date,
        time,
        timeMode,
        direction,
      },
    });

    if (error) {
      console.warn('transit-journeys function failed, using local estimates:', error);
      return fallback();
    }

    // La fonction signale explicitement « calculateur indisponible » : on estime.
    if (data?.reason === 'unavailable') {
      return fallback();
    }

    const options: TransitOption[] = Array.isArray(data?.options) ? data.options : [];
    // Zéro itinéraire est une réponse légitime (dernier train passé, pas de
    // desserte ce jour-là) : on la remonte telle quelle plutôt que d'inventer
    // des trains qui n'existent pas.
    return { options, source: data?.source === 'cache' ? 'cache' : 'live' };
  } catch (err) {
    console.warn('Could not reach the transit calculator, using local estimates:', err);
    return fallback();
  }
}

/**
 * Coordonnées reçues en paramètres de navigation, donc sous forme de chaînes.
 * Renvoie `null` dès qu'il manque quoi que ce soit, pour que l'appelant retombe
 * explicitement sur son défaut plutôt que de router vers l'île de Null (0, 0).
 */
export function parseCoordinates(lat?: string, lng?: string): Coordinates | null {
  if (!lat || !lng) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** Deux points sont considérés comme identiques en deçà d'une dizaine de mètres. */
function isSamePoint(a: Coordinates, b: Coordinates): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4;
}

/**
 * Itinéraires vers un point précis, avec repli sur un point de secours quand le
 * calculateur ne trouve rien.
 *
 * Un départ de randonnée est souvent loin de toute voie desservie : viser le
 * sentier exact donne l'itinéraire le plus juste quand ça marche, mais PRIM peut
 * aussi ne rien renvoyer du tout. Proposer alors le trajet jusqu'à la gare vaut
 * mieux qu'un écran vide.
 *
 * L'appel de repli n'a lieu que si le point de secours diffère réellement du
 * point visé — sinon on paierait deux fois le même quota pour le même résultat.
 */
export async function fetchTransitOptionsWithFallback(
  primary: TransitQuery,
  fallback: TransitQuery
): Promise<TransitResult> {
  // Mesuré sur PRIM : un point en plein massif ne renvoie pas « zéro itinéraire »
  // mais une erreur, que `fetchTransitOptions` traduit en estimations locales.
  // Tester la seule longueur de la liste prendrait donc l'échec pour un succès.
  const hasRealOptions = (r: TransitResult) => r.source !== 'fallback' && r.options.length > 0;

  const result = await fetchTransitOptions(primary);

  if (hasRealOptions(result)) return result;
  if (isSamePoint(primary.from, fallback.from) && isSamePoint(primary.to, fallback.to)) {
    return result;
  }

  const fallbackResult = await fetchTransitOptions(fallback);
  // Si le repli n'apporte pas de vrais horaires non plus, on garde la réponse du
  // point demandé : une liste vide honnête vaut mieux qu'un doublon d'estimations.
  return hasRealOptions(fallbackResult) ? fallbackResult : result;
}

/**
 * Adapts a journey to the `TrainOption` shape persisted in planned adventures.
 * `time` stays `HH:MM`: recap.tsx builds the Trainline booking URL from it.
 */
export function toTrainOption(option: TransitOption, isRealtime: boolean): TrainOption {
  const transitLegs = option.legs.filter((leg) => leg.mode !== 'walk');
  const lineNames = transitLegs
    .map((leg) => leg.lineName)
    .filter((name): name is string => Boolean(name));

  return {
    id: option.id,
    time: option.departureTime,
    duration: option.durationFormatted,
    price: option.priceEstimate,
    // Pas de numéro de train dans la réponse IDFM : on affiche l'enchaînement de
    // lignes, plus parlant pour un trajet francilien qu'un numéro de circulation.
    trainNumber: lineNames.join(' → ') || '—',
    type: lineNames[0] ? `Ligne ${lineNames[0]}` : 'Transports en commun',
    arrivalTime: option.arrivalTime,
    transfers: option.transfers,
    legs: option.legs,
    co2Grams: option.co2Grams,
    isRealtime,
  };
}

/**
 * Calcule l'indice du trajet recommandé selon :
 * 1. Absence de perturbations majeures
 * 2. Minimum de correspondances (priorité aux trajets directs)
 * 3. Tarif le plus bas
 * 4. Durée de transport minimale
 */
export function getRecommendedOptionIndex(options: TransitOption[]): number {
  if (options.length === 0) return -1;

  let bestIndex = 0;
  let bestScore = Infinity;

  options.forEach((option, idx) => {
    // 1. Pénalité de perturbation
    let perturbationPenalty = 0;
    if (option.disruptionSeverity === 'blocking') perturbationPenalty = 10000;
    else if (option.disruptionSeverity === 'warning') perturbationPenalty = 500;
    else if (option.hasPerturbations) perturbationPenalty = 100;

    // 2. Nombre de correspondances (1 correspondance = équivalent 30 min de pénalité)
    const transfersPenalty = option.transfers * 30;

    // 3. Prix (1€ = équivalent 5 min)
    const pricePenalty = (option.priceEstimate ?? 0) * 5;

    // 4. Durée de transport en minutes
    const duration = option.durationMinutes || 60;

    const score = duration + transfersPenalty + pricePenalty + perturbationPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  });

  return bestIndex;
}

/** Mode de transport filtrable — la marche n'est jamais un critère de filtre. */
export type TransitTransportMode = Exclude<TransitLeg['mode'], 'walk'>;

/** Ordre d'affichage canonique du chip et de la feuille de filtre. */
export const TRANSIT_TRANSPORT_MODES: TransitTransportMode[] = [
  'train',
  'rer',
  'metro',
  'tram',
  'bus',
];

export const TRANSIT_MODE_LABELS: Record<TransitTransportMode, string> = {
  train: 'Train',
  rer: 'RER',
  metro: 'Métro',
  tram: 'Tram',
  bus: 'Bus',
};

/** Modes de transport (hors marche) réellement présents dans une liste d'options. */
export function getAvailableTransportModes(options: TransitOption[]): TransitTransportMode[] {
  const present = new Set<TransitTransportMode>();
  options.forEach((option) => {
    option.legs.forEach((leg) => {
      if (leg.mode !== 'walk') present.add(leg.mode);
    });
  });
  return TRANSIT_TRANSPORT_MODES.filter((mode) => present.has(mode));
}

/**
 * Ne garde que les options dont TOUTES les étapes en transport figurent parmi
 * les modes sélectionnés — un trajet qui inclut un bus non coché est exclu,
 * même s'il comporte aussi un métro coché.
 */
export function filterOptionsByTransportModes(
  options: TransitOption[],
  selectedModes: Set<TransitTransportMode>
): TransitOption[] {
  return options.filter((option) =>
    option.legs.every((leg) => leg.mode === 'walk' || selectedModes.has(leg.mode))
  );
}

/** « Métro, Bus + 3 » ou « Tous les modes » quand rien n'est exclu. */
export function formatTransportModesSummary(
  selectedModes: TransitTransportMode[],
  availableModes: TransitTransportMode[]
): string {
  if (availableModes.length === 0) return 'Tous les modes';
  if (selectedModes.length === 0) return 'Aucun mode';
  if (selectedModes.length === availableModes.length) return 'Tous les modes';

  const ordered = TRANSIT_TRANSPORT_MODES.filter((mode) => selectedModes.includes(mode));
  if (ordered.length <= 2) return ordered.map((mode) => TRANSIT_MODE_LABELS[mode]).join(', ');

  const [first, second] = ordered;
  return `${TRANSIT_MODE_LABELS[first]}, ${TRANSIT_MODE_LABELS[second]} + ${ordered.length - 2}`;
}
