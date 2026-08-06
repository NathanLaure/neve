import idfStationsData from '@/data/idf-train-stations.json';

export interface Station {
  id: string;
  name: string;
  shortCode?: string;
  latitude: number;
  longitude: number;
  insee?: string;
  uic?: string;
}

export interface TransitLeg {
  mode: 'train' | 'walk' | 'rer';
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
  lineType: 'Transilien' | 'RER' | 'TER' | 'Métro';
  priceEstimate: number;
  isLastTrain?: boolean;
  legs: TransitLeg[];
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
 * Find station by name or closest to coordinates
 */
export function findNearestStation(lat: number, lng: number, maxDistanceKm = 10.0): Station | null {
  if (STATIONS.length === 0) return null;
  let nearest: Station | null = null;
  let minDist = Infinity;

  for (const s of STATIONS) {
    const d = getDistanceKm(lat, lng, s.latitude, s.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }

  if (nearest && minDist <= maxDistanceKm) {
    return nearest;
  }
  return null;
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

/**
 * Generates realistic transit schedules for a given origin station and target station
 */
export function generateTransitOptions(
  originStationName: string,
  targetStationName: string,
  direction: 'go' | 'back' = 'go'
): TransitOption[] {
  const isGo = direction === 'go';
  const baseHours = isGo ? [7, 8, 9, 10, 11] : [16, 17, 18, 19, 20, 21, 22];

  // Infer train line type
  let lineType: 'Transilien' | 'RER' | 'TER' | 'Métro' = 'Transilien';
  let lineName = 'Ligne N';

  const nameUpper = (originStationName + ' ' + targetStationName).toUpperCase();
  if (nameUpper.includes('RER') || nameUpper.includes('CHATELET') || nameUpper.includes('MARNE')) {
    lineType = 'RER';
    lineName = nameUpper.includes('RER A') ? 'RER A' : nameUpper.includes('RER C') ? 'RER C' : 'RER B';
  } else if (nameUpper.includes('FONTAINEBLEAU') || nameUpper.includes('MELUN')) {
    lineType = 'Transilien';
    lineName = 'Ligne R';
  } else if (nameUpper.includes('RAMBOUILLET') || nameUpper.includes('CHEVREUSE')) {
    lineType = 'Transilien';
    lineName = 'Ligne N';
  } else if (nameUpper.includes('ST-LAZARE') || nameUpper.includes('MANTES')) {
    lineType = 'Transilien';
    lineName = 'Ligne J';
  }

  const baseDuration = Math.min(75, Math.max(25, Math.round(originStationName.length * 2.5 + targetStationName.length * 1.2)));

  const options: TransitOption[] = baseHours.map((hour, idx) => {
    const minute = (idx * 22) % 60;
    const depTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const totalMinutes = hour * 60 + minute + baseDuration;
    const arrHour = Math.floor(totalMinutes / 60) % 24;
    const arrMin = totalMinutes % 60;
    const arrTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

    const isLast = !isGo && idx === baseHours.length - 1;

    return {
      id: `transit-${direction}-${idx}`,
      departureTime: depTime,
      arrivalTime: arrTime,
      durationMinutes: baseDuration,
      durationFormatted: formatDuration(baseDuration),
      transfers: idx % 3 === 0 ? 1 : 0,
      lineName,
      lineType,
      priceEstimate: lineType === 'TER' ? 8.5 : 2.1,
      isLastTrain: isLast,
      legs: [
        {
          mode: lineType === 'RER' ? 'rer' : 'train',
          lineName,
          fromName: isGo ? originStationName : targetStationName,
          toName: isGo ? targetStationName : originStationName,
          durationMinutes: baseDuration,
        },
      ],
    };
  });

  return options;
}
