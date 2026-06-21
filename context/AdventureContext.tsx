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
  addAdventure: (adventure: Omit<PlannedAdventure, 'id'>) => string;
  updateAdventure: (id: string, updates: Partial<PlannedAdventure>) => void;
  deleteAdventure: (id: string) => void;
  setUserLocationManually: (coords: Coordinates, name: string) => void;
  refreshUserLocation: () => Promise<void>;
  getTransitInfo: (rando: RandoData) => {
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
  clearAllFilters: () => void;
  filteredHikes: RandoData[];
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
  const [hikes, setHikes] = useState<RandoData[]>(MOCK_RANDOS);
  const [isLoadingHikes, setIsLoadingHikes] = useState<boolean>(false);

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

  const loadHikes = async () => {
    setIsLoadingHikes(true);
    try {
      const { data, error } = await supabase.from('hikes').select('*');
      if (error) {
        throw error;
      }
      if (data && data.length > 0) {
        setHikes(data as RandoData[]);
      }
    } catch (error) {
      console.warn('Could not fetch hikes from Supabase, falling back to mock data:', error);
    } finally {
      setIsLoadingHikes(false);
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

  // Automatically fetch location and hikes on startup
  useEffect(() => {
    Promise.resolve().then(() => {
      refreshUserLocation();
      loadHikes();
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
    (rando: RandoData) => {
      const distanceKm = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        rando.startStationCoords.latitude,
        rando.startStationCoords.longitude
      );

      // If near Paris (within 15km of Notre-Dame/Châtelet), use the default dataset values
      const nearParis =
        calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          DEFAULT_COORDS.latitude,
          DEFAULT_COORDS.longitude
        ) < 15;

      if (nearParis) {
        return {
          durationMinutes: rando.trainDurationMinutes,
          durationText: `${rando.trainDurationMinutes} min`,
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedDifficulties([]);
    setMaxTrainDuration(null);
    setMaxDistance(null);
    setMaxElevation(null);
    setDogsAllowed(false);
    setKidsFriendly(false);
    setSelectedActivityTypes([]);
    setSelectedPointsOfInterest([]);
  };

  const filteredHikes = useMemo(() => {
    const filtered = hikes.filter((rando) => {
      // 1. Text Search query (title, location, startStation, endStation)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText =
          rando.title?.toLowerCase().includes(query) ||
          rando.location?.toLowerCase().includes(query) ||
          rando.startStation?.toLowerCase().includes(query) ||
          rando.endStation?.toLowerCase().includes(query);
        if (!matchesText) return false;
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

      return true;
    });
    return filtered;
  }, [
    hikes,
    searchQuery,
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
        hikes,
        isLoadingHikes,
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
        clearAllFilters,
        filteredHikes,
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
