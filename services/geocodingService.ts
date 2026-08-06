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
 * Cherche des lieux en France correspondant à `query`.
 *
 * Ne rejette jamais : une erreur réseau ou un token absent renvoie une liste
 * vide, à charge de l'appelant d'afficher un état vide plutôt qu'une erreur.
 */
export async function searchPlaces(query: string, limit = 10): Promise<GeocodedPlace[]> {
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
      `?access_token=${token}&country=fr&language=fr&types=${PLACE_TYPES}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geocoding failed with status ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data?.features)) return [];

    return data.features
      .filter((feature: any) => Array.isArray(feature?.center) && feature.center.length === 2)
      .map((feature: any): GeocodedPlace => {
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
      });
  } catch (error) {
    console.warn('Error fetching Mapbox geocoding results:', error);
    return [];
  }
}
