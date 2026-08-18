/**
 * Recherche de lieux (géocodage direct) via l'API Mapbox Geocoding.
 *
 * Extrait de app/search.tsx, qui portait cet appel en ligne : l'écran de
 * planification en a besoin aussi pour saisir une adresse de départ, et une
 * seconde copie du même fetch aurait divergé à la première correction.
 */

export interface GeocodedPlace {
  id: string;
  /** Première composante du libellé Mapbox, ex. « 39 Rue Brochant ». */
  name: string;
  /** Le reste du libellé, ex. « Paris, Île-de-France, France ». */
  context: string;
  /** Libellé complet renvoyé par Mapbox. */
  fullName: string;
  latitude: number;
  longitude: number;
  /** Classification Mapbox (`address`, `place`, `locality`…). */
  placeType?: string;
}

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/** Types de lieux acceptés : de l'adresse précise à la commune. */
const PLACE_TYPES = 'place,locality,neighborhood,address,postcode';

/**
 * `poi` couvre les gares et les stations de métro — Mapbox n'a pas de catégorie
 * dédiée aux transports. Réservé à la saisie d'un point de départ : sur une
 * recherche de zone de randonnée, il ferait remonter commerces et restaurants.
 */
const TRANSIT_PLACE_TYPES = `${PLACE_TYPES},poi`;

export interface SearchPlacesOptions {
  limit?: number;
  /**
   * Fait remonter les points d'intérêt, seul moyen d'atteindre une gare ou une
   * station de métro par leur nom.
   */
  includeTransit?: boolean;
}

/**
 * Cherche des lieux en France correspondant à `query`.
 *
 * Ne rejette jamais : une erreur réseau ou un token absent renvoie une liste
 * vide, à charge de l'appelant d'afficher un état vide plutôt qu'une erreur.
 */
/** Mise en forme commune aux deux sens du géocodage. */
function toGeocodedPlace(feature: any): GeocodedPlace {
  const fullName: string = feature.place_name || '';
  const [head, ...rest] = fullName.split(',');
  return {
    id: String(feature.id),
    name: head?.trim() || feature.text || '',
    context: rest.map((part: string) => part.trim()).join(', '),
    fullName,
    latitude: feature.center[1],
    longitude: feature.center[0],
    placeType: feature.place_type?.[0],
  };
}

/**
 * Nom du lieu le plus précis à ces coordonnées (géocodage inverse).
 *
 * Sert au point posé sur la carte : un tap ne donne qu'une latitude et une
 * longitude, alors qu'on veut afficher « Batignolles, Paris » sous le nom du
 * randonneur. Mapbox plutôt que `expo-location` : le référentiel est le même
 * que celui de la recherche, donc les deux voies ne se contredisent pas.
 *
 * Ne rejette jamais — `null` quand rien ne correspond ou que l'appel échoue.
 */
export async function reverseGeocodePlace(
  latitude: number,
  longitude: number
): Promise<GeocodedPlace | null> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  if (!token) {
    console.warn('Mapbox access token is missing, reverse geocoding is disabled');
    return null;
  }

  try {
    const url =
      `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json` +
      `?access_token=${token}&language=fr&types=${PLACE_TYPES}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Reverse geocoding failed with status ${response.status}`);

    const data = await response.json();
    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    if (!feature || !Array.isArray(feature.center)) return null;

    return toGeocodedPlace(feature);
  } catch (error) {
    console.warn('Error reverse geocoding with Mapbox:', error);
    return null;
  }
}

export async function searchPlaces(
  query: string,
  limitOrOptions: number | SearchPlacesOptions = 10
): Promise<GeocodedPlace[]> {
  // Deuxième argument historiquement numérique : les appels existants passent
  // encore une simple limite.
  const options: SearchPlacesOptions =
    typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions;
  const limit = options.limit ?? 10;
  const types = options.includeTransit ? TRANSIT_PLACE_TYPES : PLACE_TYPES;

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  if (!token) {
    console.warn('Mapbox access token is missing, place search is disabled');
    return [];
  }

  try {
    const url =
      `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(trimmed)}.json` +
      `?access_token=${token}&country=fr&language=fr&types=${types}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geocoding failed with status ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data?.features)) return [];

    return data.features
      .filter((feature: any) => Array.isArray(feature?.center) && feature.center.length === 2)
      .map(toGeocodedPlace);
  } catch (error) {
    console.warn('Error fetching Mapbox geocoding results:', error);
    return [];
  }
}
