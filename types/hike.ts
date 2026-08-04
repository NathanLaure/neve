export type HikeDifficulty = 'facile' | 'modere' | 'difficile' | 'expert';
export type RouteType = 'boucle' | 'aller_retour' | 'point_a_point';

export interface HikePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface GeoJSONGeometry {
  type: 'LineString' | 'MultiLineString' | 'Feature' | 'FeatureCollection';
  coordinates: number[][] | number[][][];
}

export interface Hike {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  duration_minutes: number;
  difficulty: HikeDifficulty;
  route_type: RouteType;
  start_lat: number;
  start_lng: number;
  location_name: string | null;
  geometry: GeoJSONGeometry | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  gpx_url: string | null;
  source: string;
  source_id: string;
  rating_avg: number;
  rating_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  // Dynamic field for current logged in user
  is_favorite?: boolean;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  hike_id: string;
  created_at: string;
}

export interface HikeComment {
  id: string;
  user_id: string;
  hike_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  // Joined profile info
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface HikeFilterOptions {
  searchQuery?: string;
  difficulty?: HikeDifficulty[];
  maxDistanceKm?: number;
  maxDurationMinutes?: number;
  maxElevationGainM?: number;
  routeTypes?: RouteType[];
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}
