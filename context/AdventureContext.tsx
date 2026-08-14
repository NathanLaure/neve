import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { RandoData, TrainOption, MOCK_RANDOS } from '@/constants/RandosData';
export type { RandoData };
import { supabase } from '@/utils/supabase';
import { findNearestStation } from '@/services/transitService';
import { formatStationLabel } from '@/utils/stationLabel';
import { useAuth } from '@/context/AuthContext';

export interface PlannedAdventure {
  id: string;
  randoId: string;
  outwardDate: string;
  returnDate: string;
  outwardTrain: TrainOption;
  returnTrain: TrainOption;
  departureStationName: string;
  /**
   * Destination du trajet retour quand elle diffère du point de départ. Optionnel
   * pour ne pas invalider les aventures déjà enregistrées : absent, le retour
   * ramène au départ.
   */
  returnStationName?: string;
  isReversed?: boolean;
  isBooked: boolean;
  passengersCount?: string;
  passengers?: any[];
  createdAt?: string;
  hikeSnapshot?: {
    title: string;
    imageUrl?: string;
    startStation: string;
    endStation?: string;
    distance: string;
    durationHours: number;
    difficulty: 'Facile' | 'Modéré' | 'Difficile';
    elevation?: string;
    weatherTemp?: string;
    weatherIcon?: string;
  };
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AdventureContextType {
  userLocation: Coordinates;
  userLocationName: string;
  isLocating: boolean;
  plannedAdventures: PlannedAdventure[];
  isLoadingAdventures: boolean;
  hikes: RandoData[];
  isLoadingHikes: boolean;
  loadHikes: () => Promise<void>;
  loadHikeDetail: (id: string) => Promise<void>;
  addAdventure: (adventure: Omit<PlannedAdventure, 'id' | 'createdAt'>) => string;
  updateAdventure: (id: string, updates: Partial<PlannedAdventure>) => void;
  deleteAdventure: (id: string) => void;
  toggleAdventureBooked: (id: string) => void;
  refreshAdventures: () => Promise<void>;
  setUserLocationManually: (coords: Coordinates, name: string) => void;
  refreshUserLocation: () => Promise<void>;
  /** `fromLocation` overrides the user's tracked position — used to preview a place before committing to it. */
  getTransitInfo: (
    rando: RandoData,
    fromLocation?: Coordinates
  ) => {
    durationMinutes: number;
    durationText: string;
    distanceKm: number;
  };

  // Search and Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDifficulties: string[];
  setSelectedDifficulties: (difficulties: string[]) => void;
  maxTrainDuration: number | null;
  setMaxTrainDuration: (duration: number | null) => void;
  maxDistance: number | null;
  setMaxDistance: (distance: number | null) => void;
  maxElevation: number | null;
  setMaxElevation: (elevation: number | null) => void;
  dogsAllowed: boolean;
  setDogsAllowed: (allowed: boolean) => void;
  kidsFriendly: boolean;
  setKidsFriendly: (friendly: boolean) => void;
  selectedActivityTypes: string[];
  setSelectedActivityTypes: (types: string[]) => void;
  selectedPointsOfInterest: string[];
  setSelectedPointsOfInterest: (pois: string[]) => void;
  /** Radius in km around the user's location. `null` means no radius limit. */
  searchRadiusKm: number | null;
  setSearchRadiusKm: (radius: number | null) => void;
  mapSearchRadiusKm: number | null;
  setMapSearchRadiusKm: (radius: number | null) => void;
  isMapAreaActive: boolean;
  setIsMapAreaActive: (active: boolean) => void;
  setMapSearchArea: (radiusKm: number) => void;
  resetToUserLocationRadius: () => void;
  /** Widens the loaded hikes set to cover this circle if it isn't already covered — no-op otherwise. */
  ensureHikesRadius: (center: Coordinates, radiusKm: number) => void;
  clearAllFilters: () => void;
  /** How many filters are currently narrowing the results — drives the searchbar badge. */
  activeFiltersCount: number;
  filteredHikes: RandoData[];
  recentSearches: { name: string; coords: Coordinates }[];
  addRecentSearch: (name: string, coords: Coordinates) => void;

  // Favorites
  favoriteHikeIds: Set<string>;
  /** hikeId -> ISO timestamp of when it was favorited. */
  favoriteSavedAt: Map<string, string>;
  isFavorite: (hikeId: string) => boolean;
  toggleFavorite: (hikeId: string) => void;
  isLoadingFavorites: boolean;
  refreshFavorites: () => Promise<void>;
}

const AdventureContext = createContext<AdventureContextType | undefined>(undefined);

// Default coordinates pointing to Paris Châtelet
const DEFAULT_COORDS = { latitude: 48.8584, longitude: 2.3488 };
const DEFAULT_LOCATION_NAME = 'Paris (Centre)';

// Rayon de chargement initial : on ne va chercher que les randos proches plutôt que
// toute l'Île-de-France d'un coup (évite de tout charger au démarrage).
const DEFAULT_RADIUS_KM = 30;

// Haversine formula to calculate distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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
 * Libellé de la position de l'utilisateur, du plus précis au plus vague.
 *
 * « Paris » ne dit rien à quelqu'un qui EST à Paris : on privilégie la rue, qui
 * situe réellement le point de départ du trajet. La ville seule ne sert que de
 * dernier recours, quand le géocodage ne renvoie pas de voie.
 */
function formatUserLocationLabel(place?: Location.LocationGeocodedAddress | null): string {
  if (!place) return 'Ma Position';

  const street = [place.streetNumber, place.street].filter(Boolean).join(' ').trim();
  const city = place.city || place.subregion || place.region || '';

  if (street && city) return `${street}, ${city}`;
  if (street) return street;
  // `name` porte souvent un lieu-dit ou un POI quand la voie manque.
  if (place.name && place.name !== city) return city ? `${place.name}, ${city}` : place.name;
  return city || 'Ma Position';
}

// Boîte englobante approximative (en degrés) autour d'un point pour un rayon donné en km.
// Sert de pré-filtre côté serveur (Supabase) — toujours un sur-ensemble du cercle exact,
// jamais plus étroite, donc aucune rando dans le rayon ne peut être exclue par erreur.
function boundingBoxForRadius(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

// AdventureProvider: central state for hikes, user location, search filters, and cached favorites
export const AdventureProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_COORDS);
  const [userLocationName, setUserLocationName] = useState<string>(DEFAULT_LOCATION_NAME);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [plannedAdventures, setPlannedAdventures] = useState<PlannedAdventure[]>([]);
  const [isLoadingAdventures, setIsLoadingAdventures] = useState<boolean>(true);
  const [hikes, setHikes] = useState<RandoData[]>([]);
  const [favoriteHikeIds, setFavoriteHikeIds] = useState<Set<string>>(new Set());
  const favoriteHikeIdsRef = useRef<Set<string>>(favoriteHikeIds);

  const adventuresCacheKey = useMemo(() => {
    return `@neve_planned_adventures_${user ? user.id : 'guest'}`;
  }, [user]);

  const updateFavoriteHikeIds = useCallback((next: Set<string>) => {
    favoriteHikeIdsRef.current = next;
    setFavoriteHikeIds(next);
  }, []);

  const [favoriteSavedAt, setFavoriteSavedAt] = useState<Map<string, string>>(new Map());
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isLoadingHikes, setIsLoadingHikes] = useState<boolean>(true);
  // Zone (centre + rayon) actuellement couverte par `hikes`, pour savoir quand un
  // élargissement (nouveau rayon, nouveau lieu recherché) nécessite un rechargement.
  const loadedAreaRef = useRef<{ latitude: number; longitude: number; radiusKm: number } | null>(null);
  // Reste `false` tant que le GPS n'a pas répondu (succès ou échec) au moins une fois —
  // évite de charger les randos autour de Paris avant même d'avoir tenté la position réelle.
  const [hasResolvedLocationOnce, setHasResolvedLocationOnce] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [maxTrainDuration, setMaxTrainDuration] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [maxElevation, setMaxElevation] = useState<number | null>(null);
  const [dogsAllowed, setDogsAllowed] = useState(false);
  const [kidsFriendly, setKidsFriendly] = useState(false);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([]);
  const [selectedPointsOfInterest, setSelectedPointsOfInterest] = useState<string[]>([]);
  // Default to Position actuelle (null radius) on startup
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);
  const [mapSearchRadiusKm, setMapSearchRadiusKm] = useState<number | null>(null);
  const [isMapAreaActive, setIsMapAreaActive] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<{ name: string; coords: Coordinates }[]>([]);

  const setMapSearchArea = (radiusKm: number) => {
    setMapSearchRadiusKm(radiusKm);
    setSearchRadiusKm(radiusKm);
    setIsMapAreaActive(true);
  };

  const resetToUserLocationRadius = () => {
    setSearchRadiusKm(null);
    setIsMapAreaActive(false);
    // 60 km : même plafond que le repli utilisé par la carte quand aucun zoom précis n'est connu.
    ensureHikesRadius(userLocation, 60);
  };

  const addRecentSearch = (name: string, coords: Coordinates) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
      return [{ name, coords }, ...filtered].slice(0, 5);
    });
  };

function mapSupabaseHikeToRandoData(row: any): RandoData {
  const startLat = row.start_lat ?? row.startStationCoords?.latitude ?? 48.8566;
  const startLng = row.start_lng ?? row.startStationCoords?.longitude ?? 2.3522;
  const endLat = row.end_lat ?? startLat;
  const endLng = row.end_lng ?? startLng;

  let startStation = row.start_station_name || row.startStation;
  let startStationLat = row.start_station_lat ?? startLat;
  let startStationLng = row.start_station_lng ?? startLng;

  let endStation = row.end_station_name || row.endStation;
  let endStationLat = row.end_station_lat ?? endLat;
  let endStationLng = row.end_station_lng ?? endLng;

  if (!startStation) {
    const matchedStart = findNearestStation(startLat, startLng);
    if (matchedStart) {
      startStation = formatStationLabel(matchedStart.name);
      startStationLat = matchedStart.latitude;
      startStationLng = matchedStart.longitude;
    } else {
      startStation = row.location_name
        ? formatStationLabel(row.location_name.split('-')[0].trim())
        : 'Gare Île-de-France';
    }
  }

  if (!endStation) {
    const matchedEnd = findNearestStation(endLat, endLng);
    if (matchedEnd) {
      endStation = formatStationLabel(matchedEnd.name);
      endStationLat = matchedEnd.latitude;
      endStationLng = matchedEnd.longitude;
    } else {
      endStation = startStation;
    }
  }

  const location = row.location_name || row.location || 'Île-de-France, France';

  const gain = row.elevation_gain_m || 0;
  const loss = row.elevation_loss_m || 0;
  let elevationStr = row.elevation || '';
  if (!elevationStr) {
    if (gain > 0 && loss > 0) {
      elevationStr = `+${gain}m / -${loss}m`;
    } else if (gain > 0) {
      elevationStr = `+${gain}m`;
    } else {
      elevationStr = 'Plat';
    }
  }

  const distanceKm = row.distance_km != null ? row.distance_km : (parseFloat(row.distance) || 0);
  const distanceStr = row.distance || `${distanceKm} km`;

  const durationMin = row.duration_minutes != null ? row.duration_minutes : (row.durationHours ? row.durationHours * 60 : 120);
  const durationHours = Math.round((durationMin / 60) * 10) / 10;

  let difficulty: 'Facile' | 'Modéré' | 'Difficile' = 'Modéré';
  const rawDiff = (row.difficulty || '').toLowerCase();
  if (rawDiff.includes('facile')) difficulty = 'Facile';
  else if (rawDiff.includes('diffic') || rawDiff.includes('expert')) difficulty = 'Difficile';

  let gpxTrace: { latitude: number; longitude: number }[] = [];
  if (Array.isArray(row.gpxTrace) && row.gpxTrace.length > 0) {
    gpxTrace = row.gpxTrace;
  } else if (row.geometry?.coordinates && Array.isArray(row.geometry.coordinates)) {
    gpxTrace = row.geometry.coordinates.map((pt: any) => ({
      longitude: pt[0],
      latitude: pt[1],
    }));
  }

  return {
    id: String(row.id),
    title: row.title || 'Randonnée',
    imageUrl: row.cover_image_url || row.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    start_lat: Number(startLat),
    start_lng: Number(startLng),
    startStation,
    startStationCoords: { latitude: startStationLat, longitude: startStationLng },
    endStation,
    endStationCoords: { latitude: endStationLat, longitude: endStationLng },
    distance: distanceStr,
    durationHours,
    difficulty,
    elevation: elevationStr,
    weatherTemp: row.weatherTemp || '18°C',
    weatherIcon: row.weatherIcon || '☀️',
    trainDurationMinutes: row.trainDurationMinutes || 45,
    trainType: row.trainType || 'Transilien / RER',
    priceEst: row.priceEst || 0,
    location,
    gpxTrace,
    trainOptionsGo: row.trainOptionsGo || [],
    trainOptionsBack: row.trainOptionsBack || [],
    description: row.description || '',
    dogsAllowed: row.dogsAllowed ?? true,
    kidsFriendly: row.kidsFriendly ?? true,
    activityType: row.activity_type || row.activityType || 'Randonnée',
    pointsOfInterest: row.points_of_interest || row.pointsOfInterest || ['Nature', 'Panorama'],
    galleryUrls: row.gallery_urls && row.gallery_urls.length > 0 ? row.gallery_urls : [row.cover_image_url || row.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'],
    routeType: row.route_type || row.routeType || 'boucle',
  };
}

  // Lightweight columns only: full geometry/description are fetched on-demand
  // via loadHikeDetail when a hike's detail page is actually opened.
  const HIKES_LIST_COLUMNS =
    'id, title, distance_km, elevation_gain_m, elevation_loss_m, duration_minutes, difficulty, route_type, start_lat, start_lng, location_name, cover_image_url, gallery_urls, start_station_name, start_station_lat, start_station_lng, end_station_name, end_station_lat, end_station_lng';

  const loadHikes = async (area?: { latitude: number; longitude: number; radiusKm: number }) => {
    // Sans zone explicite (ex: pull-to-refresh) : on recharge la même zone qu'avant,
    // ou à défaut un rayon par défaut autour de Paris.
    const target = area ?? loadedAreaRef.current ?? {
      latitude: DEFAULT_COORDS.latitude,
      longitude: DEFAULT_COORDS.longitude,
      radiusKm: DEFAULT_RADIUS_KM,
    };
    // Posé avant l'appel réseau (pas après) pour qu'un ensureHikesRadius() déclenché
    // pendant le fetch voie tout de suite la zone comme "en cours de couverture".
    loadedAreaRef.current = target;

    setIsLoadingHikes(true);
    try {
      let query = supabase.from('hikes').select(HIKES_LIST_COLUMNS);
      const { minLat, maxLat, minLng, maxLng } = boundingBoxForRadius(
        target.latitude,
        target.longitude,
        target.radiusKm
      );
      query = query
        .gte('start_lat', minLat)
        .lte('start_lat', maxLat)
        .gte('start_lng', minLng)
        .lte('start_lng', maxLng);

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      if (data) {
        const mapped: RandoData[] = data.map((row) => ({ ...mapSupabaseHikeToRandoData(row), hasFullDetail: false }));
        setHikes((prev) => {
           const byId = new Map<string, RandoData>(mapped.map((h) => [h.id, h]));
          const preserved = prev.filter((h) => favoriteHikeIdsRef.current.has(h.id) || Boolean(h.hasFullDetail));

          for (const h of preserved) {
            if (!byId.has(h.id)) {
              byId.set(h.id, h);
            } else {
              const fresh = byId.get(h.id)!;
              byId.set(h.id, {
                ...fresh,
                gpxTrace: (h.gpxTrace && h.gpxTrace.length > 0) ? h.gpxTrace : fresh.gpxTrace,
                hasFullDetail: Boolean(fresh.hasFullDetail || h.hasFullDetail),
              });
            }
          }

          return Array.from(byId.values());
        });
      }
    } catch (error) {
      console.warn('Could not fetch hikes from Supabase, falling back to mock data:', error);
    } finally {
      setIsLoadingHikes(false);
    }
  };

  // Élargit/recentre la zone chargée uniquement si le cercle demandé n'est pas déjà
  // entièrement couvert par ce qu'on a en mémoire — évite les rechargements inutiles.
  const ensureHikesRadius = useCallback((center: Coordinates, radiusKm: number) => {
    const loaded = loadedAreaRef.current;
    if (loaded) {
      const distFromLoadedCenter = calculateDistanceKm(
        loaded.latitude,
        loaded.longitude,
        center.latitude,
        center.longitude
      );
      if (distFromLoadedCenter + radiusKm <= loaded.radiusKm) return;
    }
    // Charge un peu plus large que demandé pour amortir de petits déplacements/rayons suivants.
    loadHikes({ latitude: center.latitude, longitude: center.longitude, radiusKm: Math.max(radiusKm * 1.2, radiusKm + 10) });
  }, []);

  const loadHikeDetail = async (id: string) => {
    const existing = hikes.find((h) => h.id === id);
    if (existing?.hasFullDetail) return;

    try {
      const { data, error } = await supabase.from('hikes').select('*').eq('id', id).single();
      if (error) {
        throw error;
      }
      if (data) {
        const mapped = mapSupabaseHikeToRandoData(data);
        setHikes((prev) => prev.map((h) => (h.id === id ? { ...mapped, hasFullDetail: true } : h)));
      }
    } catch (error) {
      console.warn('Could not fetch hike detail from Supabase:', error);
      // Avoid getting stuck on the skeleton forever: keep whatever light data we have.
      setHikes((prev) => prev.map((h) => (h.id === id ? { ...h, hasFullDetail: true } : h)));
    }
  };

  // Favoris — table `user_favorites` (user_id, hike_id), RLS : chaque utilisateur ne
  // voit/modifie que les siens.

  const favoritesCacheKey = useMemo(() => {
    return user ? `@neve_favorites_cache_${user.id}` : null;
  }, [user]);

  // Load cached favorites from AsyncStorage for instant offline/startup display
  const loadFavoritesFromCache = useCallback(async () => {
    if (!favoritesCacheKey) return false;
    try {
      const cachedRaw = await AsyncStorage.getItem(favoritesCacheKey);
      if (!cachedRaw) return false;
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed?.ids) && Array.isArray(parsed?.savedAt)) {
        const cachedIds = new Set<string>(parsed.ids);
        const cachedSavedAt = new Map<string, string>(parsed.savedAt);
        const cachedHikes: RandoData[] = Array.isArray(parsed.hikes) ? parsed.hikes : [];

        updateFavoriteHikeIds(cachedIds);
        setFavoriteSavedAt(cachedSavedAt);

        if (cachedHikes.length > 0) {
          setHikes((prev) => {
            const byId = new Map(cachedHikes.map((h: RandoData) => [h.id, h]));
            const merged = prev.map((h) => {
              const richer = byId.get(h.id);
              if (!richer) return h;
              byId.delete(h.id);
              return {
                ...h,
                ...richer,
                gpxTrace: (richer.gpxTrace && richer.gpxTrace.length > 0) ? richer.gpxTrace : h.gpxTrace,
                hasFullDetail: h.hasFullDetail || richer.hasFullDetail,
              };
            });
            return [...merged, ...byId.values()];
          });
        }
        return true;
      }
    } catch (err) {
      console.warn('Error loading favorites from AsyncStorage cache:', err);
    }
    return false;
  }, [favoritesCacheKey]);

  // Save current favorites state to AsyncStorage cache
  const saveFavoritesToCache = useCallback(
    async (
      idsSet: Set<string>,
      savedAtMap: Map<string, string>,
      allHikes: RandoData[]
    ) => {
      if (!favoritesCacheKey) return;
      try {
        const ids = Array.from(idsSet);
        const savedAt = Array.from(savedAtMap.entries());
        const favoriteHikesData = allHikes.filter((h) => idsSet.has(h.id));
        const payload = JSON.stringify({
          ids,
          savedAt,
          hikes: favoriteHikesData,
          updatedAt: new Date().toISOString(),
        });
        await AsyncStorage.setItem(favoritesCacheKey, payload);
      } catch (err) {
        console.warn('Error saving favorites to AsyncStorage cache:', err);
      }
    },
    [favoritesCacheKey]
  );

  const loadFavorites = useCallback(async () => {
    if (!user) {
      updateFavoriteHikeIds(new Set());
      setFavoriteSavedAt(new Map());
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('hike_id, created_at')
        .eq('user_id', user.id);
      if (error) throw error;

      const ids = (data ?? []).map((r: any) => String(r.hike_id));
      const nextIds = new Set(ids);
      const nextSavedAt = new Map((data ?? []).map((r: any) => [String(r.hike_id), r.created_at as string]));

      updateFavoriteHikeIds(nextIds);
      setFavoriteSavedAt(nextSavedAt);

      if (ids.length > 0) {
        const { data: hikeRows, error: hikeError } = await supabase
          .from('hikes')
          .select(`${HIKES_LIST_COLUMNS}, geometry`)
          .in('id', ids);

        if (!hikeError && hikeRows) {
          const mappedFavorites = hikeRows.map((row) => ({
            ...mapSupabaseHikeToRandoData(row),
            hasFullDetail: false,
          }));

          setHikes((prev) => {
            const byId = new Map(mappedFavorites.map((h) => [h.id, h]));
            const merged = prev.map((h) => {
              const richer = byId.get(h.id);
              if (!richer) return h;
              byId.delete(h.id);
              return {
                ...h,
                ...richer,
                gpxTrace: (richer.gpxTrace && richer.gpxTrace.length > 0) ? richer.gpxTrace : h.gpxTrace,
                hasFullDetail: h.hasFullDetail || richer.hasFullDetail,
              };
            });
            const updatedHikes = [...merged, ...byId.values()];
            const favObjects = updatedHikes.filter((h) => nextIds.has(h.id));
            saveFavoritesToCache(nextIds, nextSavedAt, favObjects);
            return updatedHikes;
          });
        } else {
          setHikes((prev) => {
            const favObjects = prev.filter((h) => nextIds.has(h.id));
            saveFavoritesToCache(nextIds, nextSavedAt, favObjects);
            return prev;
          });
        }
      } else {
        saveFavoritesToCache(nextIds, nextSavedAt, []);
      }
    } catch (error) {
      console.warn('Could not load favorites from network:', error);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, [user, saveFavoritesToCache]);

  // Initial load, Supabase Realtime subscription & AppState foreground listener
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const initFavorites = async () => {
      const hasCache = await loadFavoritesFromCache();
      if (isMounted && !hasCache) {
        setIsLoadingFavorites(true);
      }
      if (isMounted) {
        await loadFavorites();
      }
    };

    initFavorites();

    // 3. Supabase Realtime subscription for instant auto-sync when favorited on website
    const channel = supabase
      .channel(`user_favorites_sync:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFavorites();
        }
      )
      .subscribe();

    // 4. Foreground app state listener for when user switches back from browser
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadFavorites();
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      subscription.remove();
    };
  }, [user, loadFavoritesFromCache, loadFavorites]);

  const isFavorite = useCallback((hikeId: string) => favoriteHikeIds.has(hikeId), [favoriteHikeIds]);

  const toggleFavorite = useCallback(
    (hikeId: string) => {
      if (!user) return;
      const wasFavorite = favoriteHikeIds.has(hikeId);

      const optimisticSavedAt = new Date().toISOString();
      const nextIds = new Set(favoriteHikeIds);
      const nextSavedAt = new Map(favoriteSavedAt);

      if (wasFavorite) {
        nextIds.delete(hikeId);
        nextSavedAt.delete(hikeId);
      } else {
        nextIds.add(hikeId);
        nextSavedAt.set(hikeId, optimisticSavedAt);
      }

      updateFavoriteHikeIds(nextIds);
      setFavoriteSavedAt(nextSavedAt);

      setHikes((currentHikes) => {
        const favObjects = currentHikes.filter((h) => nextIds.has(h.id));
        saveFavoritesToCache(nextIds, nextSavedAt, favObjects);
        return currentHikes;
      });

      const revert = () => {
        updateFavoriteHikeIds(favoriteHikeIdsRef.current);
        setFavoriteSavedAt(favoriteSavedAt);
        setHikes((currentHikes) => {
          const favObjects = currentHikes.filter((h) => favoriteHikeIdsRef.current.has(h.id));
          saveFavoritesToCache(favoriteHikeIdsRef.current, favoriteSavedAt, favObjects);
          return currentHikes;
        });
      };

      const request = wasFavorite
        ? supabase.from('user_favorites').delete().eq('user_id', user.id).eq('hike_id', hikeId)
        : supabase.from('user_favorites').insert({ user_id: user.id, hike_id: hikeId });

      request.then(({ error }) => {
        if (error) {
          console.warn('Could not toggle favorite:', error);
          revert();
        }
      });
    },
    [user, favoriteHikeIds, favoriteSavedAt, saveFavoritesToCache]
  );

  const refreshUserLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(DEFAULT_COORDS);
        setUserLocationName(DEFAULT_LOCATION_NAME);
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);

      // Le géocodage inverse ne sert qu'à mettre un nom lisible sur les coordonnées.
      // Il passe par un backend Play Services qui expire régulièrement, d'où son
      // propre catch : perdre le libellé ne doit jamais coûter la position elle-même.
      try {
        const geocode = await Location.reverseGeocodeAsync(coords);
        setUserLocationName(formatUserLocationLabel(geocode?.[0]));
      } catch (error) {
        console.warn('Reverse geocoding failed, keeping the GPS position unnamed:', error);
        setUserLocationName('Ma Position');
      }
    } catch (error) {
      console.warn('Could not retrieve user location, fallback to Paris:', error);
      setUserLocation(DEFAULT_COORDS);
      setUserLocationName(DEFAULT_LOCATION_NAME);
    } finally {
      setIsLocating(false);
      // Se déclenche sur les 3 issues possibles (accordé, refusé, erreur) : le point unique
      // qui dit "on a fini d'essayer, on sait maintenant où charger les randos".
      setHasResolvedLocationOnce(true);
    }
  };

  // On attend la réponse du GPS avant de charger la moindre rando — pas de Paris par
  // défaut pendant l'attente. Si la position échoue vraiment, refreshUserLocation
  // retombe elle-même sur Paris, et c'est cette valeur qui sera alors chargée.
  useEffect(() => {
    Promise.resolve().then(() => {
      refreshUserLocation();
    });
  }, []);

  // Ne charge qu'une fois la position résolue (succès ou repli Paris après échec) —
  // et recharge si elle change ensuite au point de sortir de la zone déjà couverte.
  useEffect(() => {
    if (!hasResolvedLocationOnce) return;
    ensureHikesRadius(userLocation, DEFAULT_RADIUS_KM);
  }, [userLocation, hasResolvedLocationOnce, ensureHikesRadius]);

  const setUserLocationManually = (coords: Coordinates, name: string) => {
    setUserLocation(coords);
    setUserLocationName(name);
  };

  // Helper mappings for Supabase user_adventures table
  const mapRowToPlannedAdventure = useCallback((row: any): PlannedAdventure => {
    return {
      id: String(row.id),
      randoId: String(row.rando_id),
      outwardDate: String(row.outward_date),
      returnDate: String(row.return_date),
      outwardTrain: row.outward_train,
      returnTrain: row.return_train,
      departureStationName: row.departure_station_name,
      returnStationName: row.return_station_name ?? undefined,
      isReversed: Boolean(row.is_reversed),
      isBooked: Boolean(row.is_booked),
      passengersCount: row.passengers_count ?? undefined,
      passengers: row.passengers ?? undefined,
      createdAt: row.created_at,
      hikeSnapshot: row.hike_snapshot ?? undefined,
    };
  }, []);

  const mapPlannedAdventureToRow = useCallback((adv: PlannedAdventure, userId: string) => {
    return {
      id: adv.id,
      user_id: userId,
      rando_id: adv.randoId,
      outward_date: adv.outwardDate,
      return_date: adv.returnDate,
      outward_train: adv.outwardTrain,
      return_train: adv.returnTrain,
      departure_station_name: adv.departureStationName,
      return_station_name: adv.returnStationName ?? null,
      is_reversed: adv.isReversed ?? false,
      is_booked: adv.isBooked ?? false,
      passengers_count: adv.passengersCount ?? null,
      passengers: adv.passengers ?? null,
      hike_snapshot: adv.hikeSnapshot ?? null,
      created_at: adv.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, []);

  // Load planned adventures from AsyncStorage cache (instant offline render)
  const loadAdventuresFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(adventuresCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setPlannedAdventures(parsed);
          return true;
        }
      }
    } catch (err) {
      console.warn('Error loading planned adventures from cache:', err);
    } finally {
      setIsLoadingAdventures(false);
    }
    return false;
  }, [adventuresCacheKey]);

  const saveAdventuresToCache = useCallback(
    async (adventures: PlannedAdventure[]) => {
      try {
        await AsyncStorage.setItem(adventuresCacheKey, JSON.stringify(adventures));
      } catch (err) {
        console.warn('Error saving planned adventures to cache:', err);
      }
    },
    [adventuresCacheKey]
  );

  // Load planned adventures from Supabase cloud database
  const loadAdventures = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_adventures')
        .select('*')
        .eq('user_id', user.id)
        .order('outward_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapRowToPlannedAdventure);
        setPlannedAdventures(mapped);
        saveAdventuresToCache(mapped);
      }
    } catch (err) {
      console.warn('Error loading adventures from Supabase:', err);
    } finally {
      setIsLoadingAdventures(false);
    }
  }, [user, mapRowToPlannedAdventure, saveAdventuresToCache]);

  // Initial load, Supabase Realtime sync, and foreground re-sync
  useEffect(() => {
    let isMounted = true;

    const initAdventures = async () => {
      const hasCache = await loadAdventuresFromCache();
      if (isMounted && !hasCache && user) {
        setIsLoadingAdventures(true);
      }
      if (isMounted && user) {
        await loadAdventures();
      }
    };

    initAdventures();

    if (!user) return;

    // Realtime postgres changes subscription for user_adventures
    const channel = supabase
      .channel(`user_adventures_sync:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_adventures',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadAdventures();
        }
      )
      .subscribe();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadAdventures();
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      subscription.remove();
    };
  }, [user, loadAdventuresFromCache, loadAdventures]);

  const addAdventure = useCallback(
    (adventure: Omit<PlannedAdventure, 'id' | 'createdAt'>) => {
      const id = Date.now().toString();
      const matchedHike = hikes.find((h) => h.id === adventure.randoId);
      const snapshot = matchedHike
        ? {
            title: matchedHike.title,
            imageUrl: matchedHike.imageUrl,
            startStation: matchedHike.startStation,
            endStation: matchedHike.endStation,
            distance: matchedHike.distance,
            durationHours: matchedHike.durationHours,
            difficulty: matchedHike.difficulty,
            elevation: matchedHike.elevation,
            weatherTemp: matchedHike.weatherTemp,
            weatherIcon: matchedHike.weatherIcon,
          }
        : undefined;

      const newAdventure: PlannedAdventure = {
        ...adventure,
        id,
        createdAt: new Date().toISOString(),
        hikeSnapshot: snapshot ?? adventure.hikeSnapshot,
      };

      setPlannedAdventures((prev) => {
        const next = [newAdventure, ...prev.filter((adv) => adv.id !== id)];
        saveAdventuresToCache(next);
        return next;
      });

      if (user) {
        supabase
          .from('user_adventures')
          .insert(mapPlannedAdventureToRow(newAdventure, user.id))
          .then(({ error }) => {
            if (error) console.warn('Error inserting adventure to Supabase:', error);
          });
      }

      return id;
    },
    [hikes, saveAdventuresToCache, user, mapPlannedAdventureToRow]
  );

  const updateAdventure = useCallback(
    (id: string, updates: Partial<PlannedAdventure>) => {
      setPlannedAdventures((prev) => {
        const next = prev.map((adv) => (adv.id === id ? { ...adv, ...updates } : adv));
        saveAdventuresToCache(next);
        return next;
      });

      if (user) {
        const rowUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.isBooked !== undefined) rowUpdates.is_booked = updates.isBooked;
        if (updates.outwardDate !== undefined) rowUpdates.outward_date = updates.outwardDate;
        if (updates.returnDate !== undefined) rowUpdates.return_date = updates.returnDate;
        if (updates.outwardTrain !== undefined) rowUpdates.outward_train = updates.outwardTrain;
        if (updates.returnTrain !== undefined) rowUpdates.return_train = updates.returnTrain;
        if (updates.departureStationName !== undefined)
          rowUpdates.departure_station_name = updates.departureStationName;
        if (updates.returnStationName !== undefined)
          rowUpdates.return_station_name = updates.returnStationName;

        supabase
          .from('user_adventures')
          .update(rowUpdates)
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Error updating adventure in Supabase:', error);
          });
      }
    },
    [saveAdventuresToCache, user]
  );

  const deleteAdventure = useCallback(
    (id: string) => {
      setPlannedAdventures((prev) => {
        const next = prev.filter((adv) => adv.id !== id);
        saveAdventuresToCache(next);
        return next;
      });

      if (user) {
        supabase
          .from('user_adventures')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Error deleting adventure from Supabase:', error);
          });
      }
    },
    [saveAdventuresToCache, user]
  );

  const toggleAdventureBooked = useCallback(
    (id: string) => {
      let nextStatus = false;
      setPlannedAdventures((prev) => {
        const next = prev.map((adv) => {
          if (adv.id === id) {
            nextStatus = !adv.isBooked;
            return { ...adv, isBooked: !adv.isBooked };
          }
          return adv;
        });
        saveAdventuresToCache(next);
        return next;
      });

      if (user) {
        supabase
          .from('user_adventures')
          .update({ is_booked: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Error toggling adventure status in Supabase:', error);
          });
      }
    },
    [saveAdventuresToCache, user]
  );

  // Helper to calculate transit time dynamically based on distance
  const getTransitInfo = useCallback(
    (rando: RandoData, fromLocation?: Coordinates) => {
      const origin = fromLocation ?? userLocation;
      const userLat = origin?.latitude ?? DEFAULT_COORDS.latitude;
      const userLng = origin?.longitude ?? DEFAULT_COORDS.longitude;

      const randoLat =
        rando?.startStationCoords?.latitude ?? (rando as any)?.start_lat ?? DEFAULT_COORDS.latitude;
      const randoLng =
        rando?.startStationCoords?.longitude ?? (rando as any)?.start_lng ?? DEFAULT_COORDS.longitude;

      const distanceKm = calculateDistanceKm(
        userLat,
        userLng,
        randoLat,
        randoLng
      );

      // If near Paris (within 15km of Notre-Dame/Châtelet), use the default dataset values
      const nearParis =
        calculateDistanceKm(
          userLat,
          userLng,
          DEFAULT_COORDS.latitude,
          DEFAULT_COORDS.longitude
        ) < 15;

      const trainMins = rando?.trainDurationMinutes ?? 35;

      if (nearParis) {
        return {
          durationMinutes: trainMins,
          durationText: `${trainMins} min`,
          distanceKm,
        };
      }

      // Otherwise calculate a dynamic time: ~1.4 mins per kilometer + 12 mins train buffer
      // Cap at minimum 15 mins and maximum 180 mins
      const durationMinutes = Math.max(15, Math.min(180, Math.round(distanceKm * 1.4 + 12)));

      // Format duration nicely
      let durationText = `${durationMinutes} min`;
      if (durationMinutes >= 60) {
        const hrs = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationText = mins > 0 ? `${hrs}h${mins < 10 ? '0' : ''}${mins}` : `${hrs}h`;
      }

      return {
        durationMinutes,
        durationText,
        distanceKm,
      };
    },
    [userLocation]
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDifficulties([]);
    setMaxTrainDuration(null);
    setMaxDistance(null);
    setMaxElevation(null);
    setDogsAllowed(false);
    setKidsFriendly(false);
    setSelectedActivityTypes([]);
    setSelectedPointsOfInterest([]);
  }, []);

  const activeFiltersCount = useMemo(
    () =>
      selectedDifficulties.length +
      (maxTrainDuration !== null ? 1 : 0) +
      (maxDistance !== null ? 1 : 0) +
      (maxElevation !== null ? 1 : 0) +
      (dogsAllowed ? 1 : 0) +
      (kidsFriendly ? 1 : 0) +
      selectedActivityTypes.length +
      selectedPointsOfInterest.length,
    [
      selectedDifficulties,
      maxTrainDuration,
      maxDistance,
      maxElevation,
      dogsAllowed,
      kidsFriendly,
      selectedActivityTypes,
      selectedPointsOfInterest,
    ]
  );

  const filteredHikes = useMemo(() => {
    let filtered = hikes.filter((rando) => {
      // 1. Text Search query (title, location, startStation, endStation)
      // Skipped once a map area is active: the user has explicitly picked a
      // zone on the map, which supersedes whatever text query got them there.
      if (searchQuery && !isMapAreaActive) {
        const query = searchQuery.toLowerCase().trim();
        const locName = userLocationName.toLowerCase().trim();
        const isUserLocationSearch =
          query === 'à proximité' ||
          query === 'a proximité' ||
          query === 'proximité' ||
          query === locName;

        if (isUserLocationSearch) {
          // Filter hikes within 75 km of user's location
          const randoLat = rando?.start_lat ?? rando?.startStationCoords?.latitude ?? DEFAULT_COORDS.latitude;
          const randoLng = rando?.start_lng ?? rando?.startStationCoords?.longitude ?? DEFAULT_COORDS.longitude;
          const dist = calculateDistanceKm(
            userLocation?.latitude ?? DEFAULT_COORDS.latitude,
            userLocation?.longitude ?? DEFAULT_COORDS.longitude,
            randoLat,
            randoLng
          );
          if (dist > 75) return false;
        } else {
          const matchesText =
            rando.title?.toLowerCase().includes(query) ||
            rando.location?.toLowerCase().includes(query) ||
            rando.startStation?.toLowerCase().includes(query) ||
            rando.endStation?.toLowerCase().includes(query);
          if (!matchesText) return false;
        }
      }

      // 2. Difficulty
      if (selectedDifficulties.length > 0) {
        const randoDiffNorm = (rando.difficulty || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hasMatch = selectedDifficulties.some((d) => {
          const dNorm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return randoDiffNorm.includes(dNorm) || dNorm.includes(randoDiffNorm);
        });
        if (!hasMatch) return false;
      }

      // 3. Hike Distance
      if (maxDistance !== null) {
        const distNum = (rando as any).distance_km ?? parseFloat(rando.distance);
        if (!isNaN(distNum) && distNum > maxDistance) return false;
      }

      // 4. Hike Elevation
      if (maxElevation !== null) {
        const elevMatch = rando.elevation ? rando.elevation.match(/\d+/) : null;
        const elevNum = (rando as any).elevation_gain_m ?? (elevMatch ? parseInt(elevMatch[0], 10) : 0);
        if (elevNum > maxElevation) return false;
      }

      // 5. Train Duration (Transit time)
      if (maxTrainDuration !== null) {
        const transitInfo = getTransitInfo(rando);
        if (transitInfo.durationMinutes > maxTrainDuration) return false;
      }

      // 6. Dogs Allowed
      if (dogsAllowed && !rando.dogsAllowed) return false;

      // 7. Kids Friendly
      if (kidsFriendly && !rando.kidsFriendly) return false;

      // 8. Activity Types
      if (selectedActivityTypes.length > 0) {
        if (!rando.activityType || !selectedActivityTypes.includes(rando.activityType))
          return false;
      }

      // 9. Points of Interest
      if (selectedPointsOfInterest.length > 0) {
        if (!rando.pointsOfInterest) return false;
        const hasMatch = rando.pointsOfInterest.some((poi) =>
          selectedPointsOfInterest.includes(poi)
        );
        if (!hasMatch) return false;
      }

      return true;
    });

    // If query is "À proximité", sort the results by distance to the user
    const query = searchQuery.toLowerCase().trim();
    if (query === 'à proximité' || query === 'a proximité' || query === 'proximité') {
      filtered = [...filtered].sort((a, b) => {
        const latA = a?.startStationCoords?.latitude ?? (a as any)?.start_lat ?? DEFAULT_COORDS.latitude;
        const lngA = a?.startStationCoords?.longitude ?? (a as any)?.start_lng ?? DEFAULT_COORDS.longitude;
        const latB = b?.startStationCoords?.latitude ?? (b as any)?.start_lat ?? DEFAULT_COORDS.latitude;
        const lngB = b?.startStationCoords?.longitude ?? (b as any)?.start_lng ?? DEFAULT_COORDS.longitude;
        const uLat = userLocation?.latitude ?? DEFAULT_COORDS.latitude;
        const uLng = userLocation?.longitude ?? DEFAULT_COORDS.longitude;

        const distA = calculateDistanceKm(uLat, uLng, latA, lngA);
        const distB = calculateDistanceKm(uLat, uLng, latB, lngB);
        return distA - distB;
      });
    }

    return filtered;
  }, [
    hikes,
    searchQuery,
    isMapAreaActive,
    userLocation,
    userLocationName,
    selectedDifficulties,
    maxDistance,
    maxElevation,
    maxTrainDuration,
    dogsAllowed,
    kidsFriendly,
    selectedActivityTypes,
    selectedPointsOfInterest,
    getTransitInfo,
  ]);

  return (
    <AdventureContext.Provider
      value={{
        userLocation,
        userLocationName,
        isLocating,
        plannedAdventures,
        isLoadingAdventures,
        hikes,
        isLoadingHikes,
        loadHikes,
        loadHikeDetail,
        addAdventure,
        updateAdventure,
        deleteAdventure,
        toggleAdventureBooked,
        refreshAdventures: loadAdventures,
        setUserLocationManually,
        refreshUserLocation,
        getTransitInfo,
        searchQuery,
        setSearchQuery,
        selectedDifficulties,
        setSelectedDifficulties,
        maxTrainDuration,
        setMaxTrainDuration,
        maxDistance,
        setMaxDistance,
        maxElevation,
        setMaxElevation,
        dogsAllowed,
        setDogsAllowed,
        kidsFriendly,
        setKidsFriendly,
        selectedActivityTypes,
        setSelectedActivityTypes,
        selectedPointsOfInterest,
        setSelectedPointsOfInterest,
        searchRadiusKm,
        setSearchRadiusKm,
        mapSearchRadiusKm,
        setMapSearchRadiusKm,
        isMapAreaActive,
        setIsMapAreaActive,
        setMapSearchArea,
        resetToUserLocationRadius,
        ensureHikesRadius,
        clearAllFilters,
        activeFiltersCount,
        filteredHikes,
        recentSearches,
        addRecentSearch,
        favoriteHikeIds,
        favoriteSavedAt,
        isFavorite,
        toggleFavorite,
        isLoadingFavorites,
        refreshFavorites: loadFavorites,
      }}>
      {children}
    </AdventureContext.Provider>
  );
};

export const useAdventure = () => {
  const context = useContext(AdventureContext);
  if (!context) {
    throw new Error('useAdventure must be used within an AdventureProvider');
  }
  return context;
};
