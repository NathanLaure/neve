// Proxy vers le calculateur d'itinéraires PRIM (Île-de-France Mobilités / Navitia).
//
// Pourquoi passer par une Edge Function plutôt qu'appeler PRIM depuis l'app :
//   1. La clé API ne peut pas vivre dans le bundle mobile. Le dépôt est public et
//      un bundle React Native se décompile — une clé extraite, c'est le quota
//      quotidien brûlé par un tiers.
//   2. Le palier gratuit plafonne à 1 000 requêtes/jour tous utilisateurs
//      confondus. Le cache partagé (table `transit_cache`) n'est possible que
//      côté serveur.
//
// La fonction renvoie toujours du 200 sur le chemin nominal, y compris quand PRIM
// est indisponible ou pas encore configuré : le client reçoit alors
// `{ options: [], reason: 'unavailable' }` et sait qu'il doit basculer sur son
// estimation locale, au lieu de traiter ça comme une panne réseau.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PRIM_JOURNEYS_URL =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys';

// Fenêtre de recherche : Navitia cherche les trajets sur cette durée à partir de
// (ou jusqu'à) l'heure demandée. Sans elle, `count=5` renvoyait cinq variantes du
// MÊME départ — cinq propositions tenant dans dix minutes, ce qui ne laissait
// aucun choix d'horaire à l'utilisateur.
const TIMEFRAME_SECONDS = 3 * 3600;

// Bornes du nombre de trajets renvoyés. `count` est volontairement absent de la
// requête : il fige le nombre de résultats et neutralise min/max_nb_journeys.
const MIN_JOURNEYS = 5;
const MAX_JOURNEYS = 8;

// Durée de validité d'une entrée de cache. Les horaires théoriques d'une journée
// ne bougent pas ; 6 h laisse quand même passer les mises à jour de desserte.
const CACHE_TTL_HOURS = 6;

// Les entrées plus vieilles que ça ne resserviront jamais (on ne planifie pas
// dans le passé) : purge opportuniste à chaque écriture, pas de cron à maintenir.
const CACHE_PURGE_HOURS = 24;

// Boîte englobante large autour de l'Île-de-France. Sert uniquement de garde-fou
// contre des coordonnées aberrantes qui gaspilleraient du quota — pas à définir
// finement la zone de couverture, dont PRIM reste seul juge.
const IDF_BOUNDS = { minLat: 47.0, maxLat: 50.0, minLng: 0.5, maxLng: 5.0 };

// Tarification Île-de-France 2026 (ticket à l'unité).
const FARE_RAIL_EUR = 2.55; // Métro / Train / RER / funiculaire
const FARE_BUS_EUR = 2.05; // Bus / Tram

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Coords {
  lat: number;
  lng: number;
}

interface TransitLeg {
  mode: 'train' | 'rer' | 'metro' | 'tram' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  fromName: string;
  toName: string;
  durationMinutes: number;
}

interface TransitOption {
  id: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  durationFormatted: string;
  transfers: number;
  lineName: string;
  lineType: string;
  priceEstimate: number;
  co2Grams?: number;
  legs: TransitLeg[];
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** `20260807T081500` -> `08:15` */
function navitiaTimeToHHMM(value: string): string {
  const timePart = value.split('T')[1] ?? '';
  return `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
}

/**
 * Empreinte d'une requête. Les coordonnées sont arrondies à 3 décimales (~110 m,
 * bien en deçà de la taille d'une gare) et l'heure ramenée au créneau de 30 min :
 * deux utilisateurs partant du même quartier à quelques minutes d'écart tapent
 * ainsi la même entrée de cache.
 */
function buildCacheKey(
  from: Coords,
  to: Coords,
  date: string,
  time: string,
  direction: string
): string {
  const r = (n: number) => n.toFixed(3);
  const [hourStr, minuteStr] = time.split(':');
  const bucketMinute = Number(minuteStr) < 30 ? '00' : '30';
  return [
    direction,
    date,
    `${hourStr}:${bucketMinute}`,
    `${r(from.lat)},${r(from.lng)}`,
    `${r(to.lat)},${r(to.lng)}`,
  ].join('|');
}

function isValidCoords(c: unknown): c is Coords {
  if (typeof c !== 'object' || c === null) return false;
  const { lat, lng } = c as Coords;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= IDF_BOUNDS.minLat &&
    lat <= IDF_BOUNDS.maxLat &&
    lng >= IDF_BOUNDS.minLng &&
    lng <= IDF_BOUNDS.maxLng
  );
}

/** Refuse le passé et les dates trop lointaines : PRIM n'a pas d'horaire au-delà. */
function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const asked = new Date(`${date}T00:00:00Z`).getTime();
  if (Number.isNaN(asked)) return false;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const maxUtc = todayUtc + 30 * 24 * 3600 * 1000;
  return asked >= todayUtc && asked <= maxUtc;
}

// --------------------------------------------------------------------------
// Normalisation Navitia -> TransitOption
// --------------------------------------------------------------------------

/** Traduit le mode commercial Navitia (libellés FR) vers notre nomenclature interne. */
function toLegMode(commercialMode: string): TransitLeg['mode'] {
  const m = commercialMode.toLowerCase();
  if (m.includes('rer')) return 'rer';
  if (m.includes('métro') || m.includes('metro')) return 'metro';
  if (m.includes('tram')) return 'tram';
  if (m.includes('bus') || m.includes('noctilien')) return 'bus';
  return 'train'; // Transilien, TER, Intercités, funiculaire…
}

/**
 * Tarif à l'unité. Navitia ne renseigne pas `fare` de façon fiable sur le
 * périmètre IDF, on applique donc directement la grille 2026 : le ticket
 * Métro-Train-RER et le ticket Bus-Tram sont deux titres distincts, un trajet
 * combinant les deux en consomme un de chaque.
 */
function estimateFare(legs: TransitLeg[]): number {
  const usesRail = legs.some((l) => l.mode === 'train' || l.mode === 'rer' || l.mode === 'metro');
  const usesRoad = legs.some((l) => l.mode === 'bus' || l.mode === 'tram');
  let total = 0;
  if (usesRail) total += FARE_RAIL_EUR;
  if (usesRoad) total += FARE_BUS_EUR;
  return Number(total.toFixed(2));
}

function normalizeJourney(journey: any, index: number): TransitOption | null {
  const sections: any[] = Array.isArray(journey?.sections) ? journey.sections : [];

  const legs: TransitLeg[] = [];
  for (const section of sections) {
    const durationMinutes = Math.round((section?.duration ?? 0) / 60);

    if (section?.type === 'public_transport') {
      const info = section.display_informations ?? {};
      const commercialMode: string = info.commercial_mode ?? info.physical_mode ?? '';
      legs.push({
        mode: toLegMode(commercialMode),
        lineName: info.code || info.label || commercialMode || undefined,
        lineColor: info.color ? `#${info.color}` : undefined,
        fromName: section.from?.name ?? '',
        toName: section.to?.name ?? '',
        durationMinutes,
      });
      continue;
    }

    // Marche d'accès / de correspondance. On ignore les micro-segments (< 3 min),
    // qui alourdissent l'affichage sans rien apprendre au randonneur.
    const isWalk =
      (section?.type === 'street_network' && section?.mode === 'walking') ||
      section?.type === 'transfer';
    if (isWalk && durationMinutes >= 3) {
      legs.push({
        mode: 'walk',
        fromName: section.from?.name ?? '',
        toName: section.to?.name ?? '',
        durationMinutes,
      });
    }
  }

  // Un itinéraire 100 % à pied n'a pas sa place dans une liste de trains.
  const transitLegs = legs.filter((l) => l.mode !== 'walk');
  if (transitLegs.length === 0) return null;

  const departure = journey?.departure_date_time;
  const arrival = journey?.arrival_date_time;
  if (typeof departure !== 'string' || typeof arrival !== 'string') return null;

  const durationMinutes = Math.round((journey?.duration ?? 0) / 60);
  const headLeg = transitLegs[0];

  return {
    id: `prim-${departure}-${index}`,
    departureTime: navitiaTimeToHHMM(departure),
    arrivalTime: navitiaTimeToHHMM(arrival),
    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),
    // `nb_transfers` compte les correspondances entre modes lourds, ce qui
    // correspond à ce qu'on veut afficher. On retombe sur le nombre de segments
    // s'il manque.
    transfers: journey?.nb_transfers ?? Math.max(0, transitLegs.length - 1),
    lineName: headLeg.lineName ?? '',
    lineType: headLeg.mode,
    priceEstimate: estimateFare(legs),
    co2Grams:
      typeof journey?.co2_emission?.value === 'number'
        ? Math.round(journey.co2_emission.value)
        : undefined,
    legs,
  };
}

function normalizeJourneys(payload: any): TransitOption[] {
  const journeys: any[] = Array.isArray(payload?.journeys) ? payload.journeys : [];

  const options: TransitOption[] = [];
  const seen = new Set<string>();

  journeys.forEach((journey, index) => {
    const option = normalizeJourney(journey, index);
    if (!option) return;
    // PRIM renvoie plusieurs variantes (`best`, `rapid`, `comfort`…) qui se
    // recoupent souvent sur le même train : on ne garde qu'une entrée par
    // couple départ/arrivée.
    const signature = `${option.departureTime}-${option.arrivalTime}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    options.push(option);
  });

  return options.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { from, to, date, time, direction, timeMode } = body ?? {};

  // Validation avant toute dépense de quota.
  if (!isValidCoords(from) || !isValidCoords(to)) {
    return json({ error: 'from/to must be coordinates within the Île-de-France area' }, 400);
  }
  if (typeof date !== 'string' || !isValidDate(date)) {
    return json({ error: 'date must be YYYY-MM-DD, between today and 30 days ahead' }, 400);
  }
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    return json({ error: 'time must be HH:MM' }, 400);
  }
  const dir = direction === 'back' ? 'back' : 'go';
  // `arrival` = « je veux être arrivé avant cette heure », `departure` = « je pars
  // après ». Navitia gère nativement les deux via datetime_represents.
  const represents = timeMode === 'arrival' ? 'arrival' : 'departure';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const cacheKey = buildCacheKey(from, to, date, time, `${dir}:${represents}`);
  const freshSince = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000).toISOString();

  const { data: cached } = await supabase
    .from('transit_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gte('created_at', freshSince)
    .maybeSingle();

  if (cached?.payload) {
    return json({ options: cached.payload, source: 'cache' });
  }

  const apiKey = Deno.env.get('PRIM_API_KEY');
  if (!apiKey) {
    // Pas encore configuré : le client basculera sur son estimation locale.
    return json({ options: [], reason: 'unavailable' });
  }

  // Navitia attend `longitude;latitude` et un datetime compact sans séparateurs.
  const params = new URLSearchParams({
    from: `${from.lng};${from.lat}`,
    to: `${to.lng};${to.lat}`,
    datetime: `${date.replace(/-/g, '')}T${time.replace(':', '')}00`,
    datetime_represents: represents,
    timeframe_duration: String(TIMEFRAME_SECONDS),
    min_nb_journeys: String(MIN_JOURNEYS),
    max_nb_journeys: String(MAX_JOURNEYS),
  });

  let options: TransitOption[];
  try {
    const response = await fetch(`${PRIM_JOURNEYS_URL}?${params.toString()}`, {
      headers: { apiKey },
    });

    if (!response.ok) {
      console.error('PRIM responded with', response.status, await response.text());
      return json({ options: [], reason: 'unavailable' });
    }

    options = normalizeJourneys(await response.json());
  } catch (error) {
    console.error('PRIM request failed:', error);
    return json({ options: [], reason: 'unavailable' });
  }

  // Un résultat vide est une réponse valide (dernier train passé, desserte
  // inexistante) : on le met en cache pour ne pas re-payer l'appel.
  const { error: cacheError } = await supabase
    .from('transit_cache')
    .upsert({ cache_key: cacheKey, payload: options, created_at: new Date().toISOString() });

  if (cacheError) {
    // Le cache est une optimisation : son échec ne doit pas priver l'utilisateur
    // d'un résultat qu'on a déjà payé.
    console.warn('Could not write to transit_cache:', cacheError.message);
  } else {
    await supabase
      .from('transit_cache')
      .delete()
      .lt('created_at', new Date(Date.now() - CACHE_PURGE_HOURS * 3600 * 1000).toISOString());
  }

  return json({ options, source: 'live' });
});
