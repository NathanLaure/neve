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

export interface TransitLeg {
  mode: 'train' | 'rer' | 'metro' | 'tram' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  fromName: string;
  toName: string;
  durationMinutes: number;
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
 */
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
  // Même heuristique que getTransitInfo dans AdventureContext : ~1,4 min/km de
  // trajet, plus 12 min d'accès/attente, bornée pour rester plausible.
  const durationMinutes = Math.max(15, Math.min(180, Math.round(distanceKm * 1.4 + 12)));

  // En mode « arriver avant », on remonte le temps depuis l'heure demandée : le
  // dernier départ possible est celui qui arrive pile à l'heure, les précédents
  // sont espacés d'une heure avant lui.
  const reference = parseHHMM(time);
  const firstDeparture =
    timeMode === 'arrival' ? reference - durationMinutes - 4 * 60 : reference;

  return Array.from({ length: 5 }, (_, idx) => {
    const departureMinutes = firstDeparture + idx * 60;
    return {
      id: `fallback-${direction}-${idx}`,
      departureTime: formatHHMM(departureMinutes),
      arrivalTime: formatHHMM(departureMinutes + durationMinutes),
      durationMinutes,
      durationFormatted: formatDuration(durationMinutes),
      transfers: 0,
      lineName: '',
      lineType: 'train',
      priceEstimate: FALLBACK_FARE_EUR,
      legs: [
        {
          mode: 'train' as const,
          fromName,
          toName,
          durationMinutes,
        },
      ],
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
