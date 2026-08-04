import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { RandoData, TrainOption, MOCK_RANDOS } from '@/constants/RandosData';
import { supabase } from '@/utils/supabase';

export interface PlannedAdventure {
  id: string;
  randoId: string;
  outwardDate: string;
  returnDate: string;
  outwardTrain: TrainOption;
  returnTrain: TrainOption;
  departureStationName: string;
  isBooked: boolean;
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
  hikes: RandoData[];
  isLoadingHikes: boolean;
  loadHikes: () => Promise<void>;
  loadHikeDetail: (id: string) => Promise<void>;
  addAdventure: (adventure: Omit<PlannedAdventure, 'id'>) => string;
  updateAdventure: (id: string, updates: Partial<PlannedAdventure>) => void;
  deleteAdventure: (id: string) => void;
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
  clearAllFilters: () => void;
  /** How many filters are currently narrowing the results — drives the searchbar badge. */
  activeFiltersCount: number;
  filteredHikes: RandoData[];
  recentSearches: { name: string; coords: Coordinates }[];
  addRecentSearch: (name: string, coords: Coordinates) => void;
}

const AdventureContext = createContext<AdventureContextType | undefined>(undefined);

// Default coordinates pointing to Paris Châtelet
const DEFAULT_COORDS = { latitude: 48.8584, longitude: 2.3488 };
const DEFAULT_LOCATION_NAME = 'Paris (Centre)';

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

export const AdventureProvider = ({ children }: { children: ReactNode }) => {
  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_COORDS);
  const [userLocationName, setUserLocationName] = useState<string>(DEFAULT_LOCATION_NAME);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [plannedAdventures, setPlannedAdventures] = useState<PlannedAdventure[]>([]);
  const [hikes, setHikes] = useState<RandoData[]>([]);
  const [isLoadingHikes, setIsLoadingHikes] = useState<boolean>(true);

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
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<{ name: string; coords: Coordinates }[]>([]);

  const addRecentSearch = (name: string, coords: Coordinates) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
      return [{ name, coords }, ...filtered].slice(0, 5);
    });
  };

function mapSupabaseHikeToRandoData(row: any): RandoData {
  const startLat = row.start_lat ?? row.startStationCoords?.latitude ?? 48.8566;
  const startLng = row.start_lng ?? row.startStationCoords?.longitude ?? 2.3522;
  const location = row.location_name || row.location || 'Alpes-de-Haute-Provence, France';
  const startStation = row.start_station_name || location.split(',')[0].trim() || 'Point de départ';

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
    startStation,
    startStationCoords: { latitude: startLat, longitude: startLng },
    endStation: row.endStation || startStation,
    endStationCoords: { latitude: startLat, longitude: startLng },
    distance: distanceStr,
    durationHours,
    difficulty,
    elevation: elevationStr,
    weatherTemp: row.weatherTemp || '18°C',
    weatherIcon: row.weatherIcon || '☀️',
    trainDurationMinutes: row.trainDurationMinutes || 45,
    trainType: row.trainType || 'TER / Bus',
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
    'id, title, distance_km, elevation_gain_m, elevation_loss_m, duration_minutes, difficulty, route_type, start_lat, start_lng, location_name, cover_image_url, gallery_urls';

  const loadHikes = async () => {
    setIsLoadingHikes(true);
    try {
      const { data, error } = await supabase.from('hikes').select(HIKES_LIST_COLUMNS);
      if (error) {
        throw error;
      }
      if (data && data.length > 0) {
        const mapped = data.map((row) => ({ ...mapSupabaseHikeToRandoData(row), hasFullDetail: false }));
        setHikes(mapped);
      }
    } catch (error) {
      console.warn('Could not fetch hikes from Supabase, falling back to mock data:', error);
      setHikes(MOCK_RANDOS.map((r) => ({ ...r, hasFullDetail: true })));
    } finally {
      setIsLoadingHikes(false);
    }
  };

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

      // Try reverse geocoding to get a nice city name
      const geocode = await Location.reverseGeocodeAsync(coords);
      if (geocode && geocode.length > 0) {
        const city = geocode[0].city || geocode[0].subregion || geocode[0].region || 'Ma Position';
        setUserLocationName(city);
      } else {
        setUserLocationName('Ma Position');
      }
    } catch (error) {
      console.warn('Could not retrieve user location, fallback to Paris:', error);
      setUserLocation(DEFAULT_COORDS);
      setUserLocationName(DEFAULT_LOCATION_NAME);
    } finally {
      setIsLocating(false);
    }
  };

  // Automatically fetch hikes and the user's location on startup
  useEffect(() => {
    Promise.resolve().then(() => {
      loadHikes();
      refreshUserLocation();
    });
  }, []);

  const setUserLocationManually = (coords: Coordinates, name: string) => {
    setUserLocation(coords);
    setUserLocationName(name);
  };

  const addAdventure = (adventure: Omit<PlannedAdventure, 'id'>) => {
    const id = Date.now().toString();
    const newAdventure: PlannedAdventure = {
      ...adventure,
      id,
    };
    setPlannedAdventures((prev) => [newAdventure, ...prev]);
    return id;
  };

  const updateAdventure = (id: string, updates: Partial<PlannedAdventure>) => {
    setPlannedAdventures((prev) =>
      prev.map((adv) => (adv.id === id ? { ...adv, ...updates } : adv))
    );
  };

  const deleteAdventure = (id: string) => {
    setPlannedAdventures((prev) => prev.filter((adv) => adv.id !== id));
  };

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

      const trainMins = rando?.trainDurationMinutes ?? (rando as any)?.duration_minutes ?? 35;

      if (nearParis) {
        return {
          durationMinutes: trainMins,
          durationText: `${trainMins} min`,
          distanceKm,
        };
      }

      // Otherwise calculate a dynamic time: ~1.5 mins per kilometer + 10 mins train buffer
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const locName = userLocationName.toLowerCase().trim();
        const isUserLocationSearch =
          query === 'à proximité' ||
          query === 'a proximité' ||
          query === 'proximité' ||
          query === locName;

        if (isUserLocationSearch) {
          // Filter hikes within 75 km of user's location
          const randoLat = rando?.startStationCoords?.latitude ?? (rando as any)?.start_lat ?? DEFAULT_COORDS.latitude;
          const randoLng = rando?.startStationCoords?.longitude ?? (rando as any)?.start_lng ?? DEFAULT_COORDS.longitude;
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
        if (!selectedDifficulties.includes(rando.difficulty)) return false;
      }

      // 3. Hike Distance
      if (maxDistance !== null) {
        const distNum = parseFloat(rando.distance);
        if (!isNaN(distNum) && distNum > maxDistance) return false;
      }

      // 4. Hike Elevation
      if (maxElevation !== null) {
        const elevNum = parseInt(rando.elevation.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(elevNum) && elevNum > maxElevation) return false;
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

      // 10. Search radius around the user's location
      if (searchRadiusKm !== null) {
        const randoLat =
          rando?.startStationCoords?.latitude ?? (rando as any)?.start_lat ?? DEFAULT_COORDS.latitude;
        const randoLng =
          rando?.startStationCoords?.longitude ??
          (rando as any)?.start_lng ??
          DEFAULT_COORDS.longitude;
        const dist = calculateDistanceKm(
          userLocation?.latitude ?? DEFAULT_COORDS.latitude,
          userLocation?.longitude ?? DEFAULT_COORDS.longitude,
          randoLat,
          randoLng
        );
        if (dist > searchRadiusKm) return false;
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
    searchRadiusKm,
    getTransitInfo,
  ]);

  return (
    <AdventureContext.Provider
      value={{
        userLocation,
        userLocationName,
        isLocating,
        plannedAdventures,
        hikes,
        isLoadingHikes,
        loadHikes,
        loadHikeDetail,
        addAdventure,
        updateAdventure,
        deleteAdventure,
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
        clearAllFilters,
        activeFiltersCount,
        filteredHikes,
        recentSearches,
        addRecentSearch,
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
