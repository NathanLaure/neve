import { supabase } from '@/utils/supabase';

/** Tracé d'une randonnée, au format attendu par une `LineString` GeoJSON : [lng, lat]. */
export type TraceCoordinates = [number, number][];

/** Cadre englobant, mêmes champs que le `BoundingBox` de la carte. */
export interface TraceBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

interface CachedTrace {
  coordinates: TraceCoordinates;
  /**
   * Emprise réelle du tracé, calculée une fois au téléchargement.
   *
   * C'est elle qui décide de l'affichage, et non le point de départ de la rando :
   * sur un parcours de 15 km, on peut zoomer en plein milieu du tracé alors que
   * son départ est sorti de l'écran depuis longtemps.
   */
  bounds: TraceBounds | null;
}

/**
 * Tracés déjà téléchargés, gardés au niveau module.
 *
 * Les colonnes de liste excluent volontairement `geometry` : un tracé pèse ~5 Ko
 * et la base en compte près d'un millier. On les récupère donc au fil de la
 * navigation, et ce cache évite de repayer le téléchargement — et surtout le
 * `JSON.parse` — à chaque déplacement de caméra ou retour sur l'écran carte.
 */
const traceCache = new Map<string, CachedTrace>();

function computeBounds(coordinates: TraceCoordinates): TraceBounds | null {
  if (coordinates.length === 0) return null;

  let [minLng, minLat] = coordinates[0];
  let [maxLng, maxLat] = coordinates[0];
  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { swLat: minLat, swLng: minLng, neLat: maxLat, neLng: maxLng };
}

/** Deux cadres se chevauchent-ils, ne serait-ce que par un coin ? */
export function boundsIntersect(a: TraceBounds, b: TraceBounds): boolean {
  return a.swLat <= b.neLat && a.neLat >= b.swLat && a.swLng <= b.neLng && a.neLng >= b.swLng;
}

/** Identifiants dont la requête est en vol, pour ne pas la lancer deux fois. */
const pendingIds = new Set<string>();

/**
 * Plafond par requête. Un viewport dense peut contenir des centaines de randos ;
 * au-delà de cette limite les tracés se chevauchent en bouillie illisible, autant
 * ne pas les télécharger.
 */
export const MAX_TRACES_PER_REQUEST = 60;

/**
 * Zoom à partir duquel les tracés apparaissent.
 *
 * Plus le seuil est bas, plus le viewport est large, et plus le plafond ci-dessus
 * mord : au-delà de 60 randos visibles, les tracés dessinés ne sont qu'un
 * sous-ensemble arbitraire de ce qui est à l'écran. À partir de 12 environ, un
 * viewport ordinaire tient sous le plafond et tous les marqueurs ont leur tracé.
 */
export const TRACE_MIN_ZOOM = 9;

/**
 * Tracés connus pour ces randos qui traversent le cadre donné, sans accès réseau.
 *
 * Le test porte sur l'emprise du tracé : une rando dont le départ est hors écran
 * reste dessinée tant que son parcours passe dans le cadre.
 */
export function getVisibleTraces(
  hikeIds: string[],
  bounds: TraceBounds | null
): Map<string, TraceCoordinates> {
  const found = new Map<string, TraceCoordinates>();
  for (const id of hikeIds) {
    const cached = traceCache.get(id);
    if (!cached || cached.coordinates.length < 2) continue;
    if (bounds && cached.bounds && !boundsIntersect(cached.bounds, bounds)) continue;
    found.set(id, cached.coordinates);
  }
  return found;
}

/**
 * Complète le cache pour les randos demandées puis renvoie celles qui traversent
 * le cadre. Les identifiants déjà en cache ou déjà en vol ne sont pas redemandés.
 */
export async function ensureHikeTraces(
  hikeIds: string[],
  bounds: TraceBounds | null = null
): Promise<Map<string, TraceCoordinates>> {
  const missing = hikeIds
    .filter((id) => !traceCache.has(id) && !pendingIds.has(id))
    .slice(0, MAX_TRACES_PER_REQUEST);

  if (missing.length === 0) {
    return getVisibleTraces(hikeIds, bounds);
  }

  missing.forEach((id) => pendingIds.add(id));

  try {
    const { data, error } = await supabase.from('hikes').select('id, geometry').in('id', missing);

    if (error) {
      console.warn('[hikeTraces] chargement des tracés impossible', error.message);
      return getVisibleTraces(hikeIds, bounds);
    }

    for (const row of data ?? []) {
      const raw = (row as any)?.geometry?.coordinates;
      // Une ligne d'un seul point ne dessine rien : on la met quand même en cache,
      // sous forme vide, pour ne pas la redemander à chaque déplacement.
      const coordinates: TraceCoordinates =
        Array.isArray(raw) && raw.length > 1 ? (raw as TraceCoordinates) : [];
      traceCache.set(row.id, { coordinates, bounds: computeBounds(coordinates) });
    }
  } finally {
    missing.forEach((id) => pendingIds.delete(id));
  }

  return getVisibleTraces(hikeIds, bounds);
}
