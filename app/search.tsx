import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
  Dimensions,
  BackHandler,
  Easing,
  StatusBar,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Building2,
  CableCar,
  TreePine,
  RotateCcw,
  MapPin,
  Home,
  Waves,
  ArrowLeft,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import Chip from '@/components/Chip';
import RangeSlider from '@/components/RangeSlider';
import ToggleRow from '@/components/ToggleRow';
const ACTIVITY_TYPES = [
  'Randonnée',
  'Balade',
  'Course à pied',
  'Trail',
  'VTT',
  'Vélo de route',
  'Itinérance',
  'Camping',
  'Refuge',
  'Cyclotourisme',
  'Via ferrata',
  'Randonnée à cheval',
  'Ski de fond',
  'Ski alpin',
];

const POINTS_OF_INTEREST = [
  'Vue panoramique',
  'Forêt',
  'Fleurs',
  'Lac',
  'Rivière',
  'Cascade',
  'Faune sauvage',
  'Plage',
  'Grotte',
  'Sources chaudes',
  'Site historique',
  'Voies vertes',
  'Balade en ville',
];

// Helper to choose appropriate icon for suggestion based on name & region
function getSuggestionIcon(name: string, dept: string): any {
  const n = name.toLowerCase();
  const d = dept.toLowerCase();

  // 1. Exact matches for mock/popular places
  if (n.includes('chamonix')) return CableCar;
  if (n.includes('annecy') || n.includes('aix-les-bains')) return Waves;
  if (n.includes('grenoble') || n.includes('albertville')) return Building2;
  if (n.includes('barbizon') || n.includes('échirolles')) return Home;
  if (n.includes('rambouillet') || n.includes('fontainebleau')) return TreePine;

  // 2. Keyword rules
  // Mountain regions/names
  if (
    n.includes('alpes') ||
    d.includes('savoie') ||
    d.includes('isère') ||
    n.includes('pyrénées') ||
    n.includes('mont')
  ) {
    return CableCar;
  }
  // Seaside / Lakes / thermal
  if (
    n.includes('mer') ||
    n.includes('plage') ||
    n.includes('côte') ||
    n.includes('bains') ||
    n.includes('lac') ||
    d.includes('maritime') ||
    d.includes('atlantique')
  ) {
    return Waves;
  }
  // Nature/Forest
  if (
    n.includes('forêt') ||
    n.includes('bois') ||
    n.includes('parc') ||
    n.includes('nature') ||
    n.includes('vallée')
  ) {
    return TreePine;
  }
  // Small Saint/Sainte villages
  if (n.includes('saint-') || n.includes('sainte-') || name.length > 15) {
    return Home;
  }

  // Default: City Building
  return Building2;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');



export default function SearchModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Animated value to slide up ONLY the content card/container
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  // Animated value for background fade
  const [fadeAnim] = useState(() => new Animated.Value(0));

  // Interpolated opacity for the search card: it fades out quickly in the first 250 points of the slide down
  const cardOpacity = useMemo(
    () =>
      slideAnim.interpolate({
        inputRange: [0, 250],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [slideAnim]
  );

  useEffect(() => {
    // Animate content up and fade background in on mount
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    // Animate content down with an ease-in curve (starts slow, accelerates)
    // and fade the background overlay out.
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        easing: Easing.bezier(0.3, 0, 0.8, 0.15), // ease-in
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(() => {
      router.back();
    });
  }, [slideAnim, fadeAnim, router]);

  const {
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
    hikes,
    userLocationName,
    userLocation,
    getTransitInfo,
    setUserLocationManually,
    refreshUserLocation,
    recentSearches,
    addRecentSearch,
  } = useAdventure();

  // Local state initialized from global context on mount
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDifficulties, setLocalDifficulties] = useState<string[]>(selectedDifficulties);
  const [localDogs, setLocalDogs] = useState(dogsAllowed);
  const [localKids, setLocalKids] = useState(kidsFriendly);
  const [localActivityTypes, setLocalActivityTypes] = useState<string[]>(selectedActivityTypes);
  const [localPointsOfInterest, setLocalPointsOfInterest] =
    useState<string[]>(selectedPointsOfInterest);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic suggestions based on user location and mock hikes
  const dynamicSuggestions = useMemo(() => {
    const uniqueLocations: {
      name: string;
      dept: string;
      distance: number;
      coords: { latitude: number; longitude: number };
    }[] = [];
    const seen = new Set<string>();

    hikes.forEach((rando) => {
      if (rando.location && !seen.has(rando.location)) {
        seen.add(rando.location);
        const parts = rando.location.split(',');
        const name = parts[0]?.trim() || '';
        const dept =
          parts
            .slice(1)
            .map((p) => p.trim())
            .join(', ') || '';

        const distance = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          rando.startStationCoords.latitude,
          rando.startStationCoords.longitude
        );

        uniqueLocations.push({
          name,
          dept,
          distance,
          coords: {
            latitude: rando.startStationCoords.latitude,
            longitude: rando.startStationCoords.longitude,
          },
        });
      }
    });

    // Sort by distance (closest first)
    uniqueLocations.sort((a, b) => a.distance - b.distance);

    // Build the final suggestions array (limit to 10 hike locations + "À proximité")
    return [
      { name: 'À proximité', dept: 'Autour de moi', icon: MapPin, coords: userLocation },
      ...uniqueLocations.slice(0, 10).map((loc) => ({
        name: loc.name,
        dept: loc.dept,
        icon: getSuggestionIcon(loc.name, loc.dept),
        coords: loc.coords,
      })),
    ];
  }, [hikes, userLocation]);

  // Search Collapsed logic: collapses when a query is set
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(!!localSearch);
  // Track whether the search input is focused
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(60);

  const boundedContentHeight = useMemo(() => {
    const recentSearchesHeight = recentSearches.length > 0 ? 30 + recentSearches.length * 56 : 0;
    const suggestionsHeight = 30 + dynamicSuggestions.length * 56;
    const totalContentHeight = recentSearchesHeight + suggestionsHeight + 12; // 12 is marginTop
    return Math.min(totalContentHeight, 320); // max height of 320px
  }, [recentSearches, dynamicSuggestions]);

  const isScrollable = useMemo(() => {
    const recentSearchesHeight = recentSearches.length > 0 ? 30 + recentSearches.length * 56 : 0;
    const suggestionsHeight = 30 + dynamicSuggestions.length * 56;
    const totalContentHeight = recentSearchesHeight + suggestionsHeight + 12; // 12 is marginTop
    return totalContentHeight > 320;
  }, [recentSearches, dynamicSuggestions]);

  const placeholderLayout = useMemo(() => {
    const cardHeight = isSearchCollapsed ? 72 : 140 + boundedContentHeight;

    return {
      x: 16,
      y: insets.top + 32 + headerHeight,
      width: SCREEN_WIDTH - 32,
      height: cardHeight,
    };
  }, [isSearchCollapsed, boundedContentHeight, insets.top, headerHeight]);

  const innerContainerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  const [focusProgress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: isSearchFocused ? 1 : 0,
      duration: 280,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isSearchFocused) {
        if (inputRef.current && !inputRef.current.isFocused()) {
          inputRef.current.focus();
        }
      }
    });
  }, [isSearchFocused, focusProgress]);



  const cardBorderRadius = useMemo(
    () =>
      focusProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    [focusProgress]
  );

  const cardPadding = useMemo(
    () =>
      focusProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0],
      }),
    [focusProgress]
  );

  const backgroundOpacity = useMemo(
    () =>
      focusProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [focusProgress]
  );

  const defaultY = insets.top + 76;
  const initialCardHeight = isSearchCollapsed ? 72 : 140 + boundedContentHeight;

  const [cardTopAnim] = useState(() => new Animated.Value(isSearchFocused ? 0 : placeholderLayout.y));
  const [cardLeftAnim] = useState(() => new Animated.Value(isSearchFocused ? 0 : placeholderLayout.x));
  const [cardRightAnim] = useState(() => new Animated.Value(isSearchFocused ? 0 : placeholderLayout.x));
  const [cardBottomAnim] = useState(() => new Animated.Value(isSearchFocused ? 0 : SCREEN_HEIGHT - placeholderLayout.y - initialCardHeight));
  const [placeholderHeightAnim] = useState(() => new Animated.Value(initialCardHeight));
  const [collapseProgress] = useState(() => new Animated.Value(isSearchCollapsed ? 1 : 0));

  useEffect(() => {
    Animated.timing(collapseProgress, {
      toValue: isSearchCollapsed ? 1 : 0,
      duration: 280,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [isSearchCollapsed, collapseProgress]);

  const collapsedOpacity = useMemo(
    () =>
      collapseProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [collapseProgress]
  );

  const expandedOpacity = useMemo(
    () =>
      collapseProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [collapseProgress]
  );

  useEffect(() => {
    const targetTop = isSearchFocused ? 0 : placeholderLayout.y;
    const targetLeft = isSearchFocused ? 0 : placeholderLayout.x;
    const targetRight = isSearchFocused ? 0 : placeholderLayout.x;
    
    const currentCardHeight = isSearchCollapsed ? 72 : 140 + boundedContentHeight;
    const targetBottom = isSearchFocused ? 0 : SCREEN_HEIGHT - placeholderLayout.y - currentCardHeight;
    const targetPlaceholderHeight = currentCardHeight;

    Animated.parallel([
      Animated.timing(cardTopAnim, {
        toValue: targetTop,
        duration: 280,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(cardLeftAnim, {
        toValue: targetLeft,
        duration: 280,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(cardRightAnim, {
        toValue: targetRight,
        duration: 280,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(cardBottomAnim, {
        toValue: targetBottom,
        duration: 280,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(placeholderHeightAnim, {
        toValue: targetPlaceholderHeight,
        duration: 280,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    isSearchFocused,
    isSearchCollapsed,
    boundedContentHeight,
    placeholderLayout.x,
    placeholderLayout.y,
    cardTopAnim,
    cardLeftAnim,
    cardRightAnim,
    cardBottomAnim,
    placeholderHeightAnim,
  ]);

  // Helper to change search focus state with smooth animations
  const toggleSearchFocus = useCallback(
    (focused: boolean) => {
      setIsSearchFocused(focused);
      if (focused) {
        setIsSearchCollapsed(false);
      } else {
        setIsSearchCollapsed(!!localSearch);
      }
    },
    [localSearch]
  );

  // Debounced geocoding search for places in France via Mapbox Geocoding API (runs only when typing)
  useEffect(() => {
    if (!localSearch || localSearch.trim().length < 2) {
      return;
    }

    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
    if (!mapboxToken) {
      console.warn('Mapbox access token is missing');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(localSearch.trim());
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&country=fr&language=fr&types=place,locality,neighborhood,address,postcode&limit=10`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Geocoding search failed');
        }

        const data = await response.json();
        if (data && data.features) {
          const formatted = data.features
            .filter((feature: any) => feature.center && feature.center.length === 2)
            .map((feature: any) => {
              const placeName = feature.place_name || '';
              const parts = placeName.split(',');
              const name = parts[0]?.trim() || feature.text || '';
              const dept =
                parts
                  .slice(1)
                  .map((p: string) => p.trim())
                  .join(', ') || '';

              const coords = {
                latitude: feature.center[1],
                longitude: feature.center[0],
              };

              return {
                id: feature.id,
                name,
                dept,
                coords,
                icon: getSuggestionIcon(name, dept),
                originalValue: name,
              };
            });
          setSearchResults(formatted);
        }
      } catch (error) {
        console.error('Error fetching Mapbox geocoding results:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [localSearch]);

  // Geocoding search triggered only on validation (submit)
  const handleSubmitSearch = async () => {
    if (!localSearch || localSearch.trim().length === 0) return;

    // Use the first result from real-time results if already loaded
    if (searchResults && searchResults.length > 0) {
      const bestMatch = searchResults[0];
      handleSuggestionPress(bestMatch.name, bestMatch.coords);
      return;
    }

    const query = localSearch.trim().toLowerCase();
    if (query === 'à proximité' || query === 'a proximité' || query === 'proximité') {
      refreshUserLocation();
      setIsSearchCollapsed(true);
      setIsSearchFocused(false);
      Keyboard.dismiss();
      return;
    }

    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
    if (!mapboxToken) {
      console.warn('Mapbox access token is missing');
      return;
    }

    try {
      const encodedQuery = encodeURIComponent(localSearch.trim());
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&country=fr&language=fr&types=place,locality,neighborhood,address,postcode&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Geocoding search failed');
      }

      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const placeName = feature.place_name || '';
        const parts = placeName.split(',');
        const name = parts[0]?.trim() || feature.text || '';
        const coords =
          feature.center && feature.center.length === 2
            ? {
                latitude: feature.center[1],
                longitude: feature.center[0],
              }
            : null;

        if (coords) {
          setUserLocationManually(coords, name);
          addRecentSearch(name, coords);
          setLocalSearch(name);
        }
      } else {
        console.warn('Lieu introuvable');
      }
    } catch (error) {
      console.error('Error fetching Mapbox geocoding results:', error);
    } finally {
      setIsSearchCollapsed(true);
      setIsSearchFocused(false);
      Keyboard.dismiss();
    }
  };

  // Sliders range states
  // 1. Train duration: 0 to 180 min (0 to 3 hours)
  const [trainRange, setTrainRange] = useState<[number, number]>(() => [
    0,
    maxTrainDuration !== null ? maxTrainDuration : 180,
  ]);

  // 2. Hike Distance: 0 to 34 km
  const [distanceRange, setDistanceRange] = useState<[number, number]>(() => [
    0,
    maxDistance !== null ? maxDistance : 34,
  ]);

  // 3. Hike Elevation: 0 to 1500 m+
  const [elevationRange, setElevationRange] = useState<[number, number]>(() => [
    0,
    maxElevation !== null ? maxElevation : 4500,
  ]);

  const handleApplyFilters = () => {
    // Commit all local filter states to global context at once!
    setMaxTrainDuration(trainRange[1] >= 180 ? null : trainRange[1]);
    setMaxDistance(distanceRange[1] >= 34 ? null : distanceRange[1]);
    setMaxElevation(elevationRange[1] >= 4500 ? null : elevationRange[1]);
    setSearchQuery(localSearch);
    setSelectedDifficulties(localDifficulties);
    setDogsAllowed(localDogs);
    setKidsFriendly(localKids);
    setSelectedActivityTypes(localActivityTypes);
    setSelectedPointsOfInterest(localPointsOfInterest);
    handleClose();
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    setSearchResults([]);
    setIsSearching(false);
    setIsSearchCollapsed(false);
    setLocalDifficulties([]);
    setTrainRange([0, 180]);
    setDistanceRange([0, 34]);
    setElevationRange([0, 4500]);
    setLocalDogs(false);
    setLocalKids(false);
    setLocalActivityTypes([]);
    setLocalPointsOfInterest([]);
  };

  const handleSuggestionPress = (
    placeName: string,
    coords?: { latitude: number; longitude: number }
  ) => {
    setLocalSearch(placeName);
    setSearchResults([]);
    setIsSearching(false);
    toggleSearchFocus(false);
    setIsSearchCollapsed(true);
    Keyboard.dismiss();

    if (placeName === 'À proximité') {
      refreshUserLocation();
    } else if (coords) {
      setUserLocationManually(coords, placeName);
      addRecentSearch(placeName, coords);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (isSearchFocused) {
        toggleSearchFocus(false);
        Keyboard.dismiss();
        return true;
      }
      handleClose();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [isSearchFocused, toggleSearchFocus, handleClose]);

  // Toggle Difficulty Chip
  const toggleDifficulty = (diff: 'Facile' | 'Modéré' | 'Difficile') => {
    if (localDifficulties.includes(diff)) {
      setLocalDifficulties(localDifficulties.filter((d) => d !== diff));
    } else {
      setLocalDifficulties([...localDifficulties, diff]);
    }
  };

  // Toggle Activity Chip
  const toggleActivity = (act: string) => {
    if (localActivityTypes.includes(act)) {
      setLocalActivityTypes(localActivityTypes.filter((a) => a !== act));
    } else {
      setLocalActivityTypes([...localActivityTypes, act]);
    }
  };

  // Toggle POI Chip
  const togglePOI = (poi: string) => {
    if (localPointsOfInterest.includes(poi)) {
      setLocalPointsOfInterest(localPointsOfInterest.filter((p) => p !== poi));
    } else {
      setLocalPointsOfInterest([...localPointsOfInterest, poi]);
    }
  };

  // Compute local filtered hikes inside modal in real-time based on local selections
  const localFilteredHikes = useMemo(() => {
    let filtered = hikes.filter((rando) => {
      // 1. Text Search query
      if (localSearch) {
        const query = localSearch.toLowerCase().trim();
        const locName = userLocationName.toLowerCase().trim();
        const isUserLocationSearch =
          query === 'à proximité' ||
          query === 'a proximité' ||
          query === 'proximité' ||
          query === locName;

        if (isUserLocationSearch) {
          // Filter hikes within 75 km of the user location
          const dist = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            rando.startStationCoords.latitude,
            rando.startStationCoords.longitude
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
      if (localDifficulties.length > 0) {
        if (!localDifficulties.includes(rando.difficulty)) return false;
      }

      // 3. Hike Distance
      const maxDistVal = distanceRange[1] >= 34 ? null : distanceRange[1];
      if (maxDistVal !== null) {
        const distNum = parseFloat(rando.distance);
        if (!isNaN(distNum) && distNum > maxDistVal) return false;
      }

      // 4. Hike Elevation
      const maxElevVal = elevationRange[1] >= 4500 ? null : elevationRange[1];
      if (maxElevVal !== null) {
        const elevNum = parseInt(rando.elevation.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(elevNum) && elevNum > maxElevVal) return false;
      }

      // 5. Train Duration (Transit time)
      const maxTrainVal = trainRange[1] >= 180 ? null : trainRange[1];
      if (maxTrainVal !== null) {
        const transitInfo = getTransitInfo(rando);
        if (transitInfo.durationMinutes > maxTrainVal) return false;
      }

      // 6. Dogs Allowed
      if (localDogs && !rando.dogsAllowed) return false;

      // 7. Kids Friendly
      if (localKids && !rando.kidsFriendly) return false;

      // 8. Activity Types
      if (localActivityTypes.length > 0) {
        if (!rando.activityType || !localActivityTypes.includes(rando.activityType)) return false;
      }

      // 9. Points of Interest
      if (localPointsOfInterest.length > 0) {
        if (!rando.pointsOfInterest) return false;
        const hasMatch = rando.pointsOfInterest.some((poi) => localPointsOfInterest.includes(poi));
        if (!hasMatch) return false;
      }

      return true;
    });

    // If query is "À proximité", sort the results by distance to the user
    const query = localSearch.toLowerCase().trim();
    if (query === 'à proximité' || query === 'a proximité' || query === 'proximité') {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          a.startStationCoords.latitude,
          a.startStationCoords.longitude
        );
        const distB = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          b.startStationCoords.latitude,
          b.startStationCoords.longitude
        );
        return distA - distB;
      });
    }

    return filtered;
  }, [
    hikes,
    localSearch,
    userLocationName,
    localDifficulties,
    distanceRange,
    elevationRange,
    trainRange,
    localDogs,
    localKids,
    localActivityTypes,
    localPointsOfInterest,
    getTransitInfo,
    userLocation,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      localDifficulties.length > 0 ||
      trainRange[1] < 180 ||
      distanceRange[1] < 34 ||
      elevationRange[1] < 4500 ||
      localDogs ||
      localKids ||
      localActivityTypes.length > 0 ||
      localPointsOfInterest.length > 0
    );
  }, [
    localDifficulties,
    trainRange,
    distanceRange,
    elevationRange,
    localDogs,
    localKids,
    localActivityTypes,
    localPointsOfInterest,
  ]);

  // Format dynamic labels
  const formatTrainLabel = (val: number) => {
    if (val >= 180) return 'Toutes';
    if (val >= 60) {
      const h = Math.floor(val / 60);
      const m = val % 60;
      return m > 0 ? `${h}h${m}` : `${h}h`;
    }
    return `${val} min`;
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            backgroundColor:
              Platform.OS === 'ios'
                ? colorScheme === 'dark'
                  ? 'rgba(15, 15, 15, 0.45)'
                  : 'rgba(255, 255, 255, 0.45)'
                : colorScheme === 'dark'
                  ? 'rgba(20, 20, 20, 0.85)'
                  : 'rgba(245, 245, 245, 0.85)',
          },
        ]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={100}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <Animated.View
          ref={innerContainerRef}
          style={[
            styles.innerContainer,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom || 16,
              paddingHorizontal: 16,
              transform: [{ translateY: slideAnim }],
              opacity: cardOpacity,
            },
          ]}>
          {/* BACKGROUND CONTENT: Header, Filters, Footer */}
          <Animated.View
            style={{
              flex: 1,
              width: '100%',
              opacity: backgroundOpacity,
            }}
            pointerEvents={isSearchFocused ? 'none' : 'auto'}>
            {/* Header */}
            <View
              onLayout={(e) => {
                if (isSearchFocused) return;
                setHeaderHeight(e.nativeEvent.layout.height);
              }}
              style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  L’aventure commence ici !
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
                  Chercher un lieu, puis filtrer
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                style={[styles.closeButton, { backgroundColor: theme.card, shadowColor: '#000' }]}>
                <X size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.cardsContainer}>
              {/* WHERE SECTION PLACEHOLDER */}
              <Animated.View
                style={{
                  height: placeholderHeightAnim,
                  width: '100%',
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              />

              {/* FILTERS SECTION */}
              <View style={[styles.card, styles.filtersCard, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Filtres</Text>
                  {hasActiveFilters && (
                    <Button
                      variant="text"
                      title="Réinitialiser"
                      icon={<RotateCcw size={14} color={theme.textMuted} />}
                      onPress={handleClearFilters}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, height: 'auto' }}
                      textStyle={{ fontSize: 13, color: theme.textMuted }}
                    />
                  )}
                </View>

                <ScrollView
                  style={styles.filtersScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.filtersScrollContent}>
                  {/* Difficulty */}
                  <View style={styles.filterGroup}>
                    <Text style={[styles.filterGroupTitle, { color: theme.text }]}>Difficulté</Text>
                    <View style={styles.chipsRow}>
                      {/* Facile Chip */}
                      <Chip
                        text="Facile"
                        selected={localDifficulties.includes('Facile')}
                        onPress={() => toggleDifficulty('Facile')}
                        style={
                          localDifficulties.includes('Facile')
                            ? {
                                backgroundColor: theme.statusBgSuccess,
                                borderColor: theme.statusBgSuccess,
                                borderWidth: 2,
                              }
                            : {
                                backgroundColor: theme.statusBgSuccessSubtle,
                                borderColor: theme.statusBgSuccess,
                                borderWidth: 2,
                              }
                        }
                        textStyle={{
                          color: localDifficulties.includes('Facile') ? theme.card : theme.statusTextSuccess,
                          fontFamily: 'Satoshi-Bold',
                        }}
                      />

                      {/* Modéré Chip */}
                      <Chip
                        text="Modéré"
                        selected={localDifficulties.includes('Modéré')}
                        onPress={() => toggleDifficulty('Modéré')}
                        style={
                          localDifficulties.includes('Modéré')
                            ? {
                                backgroundColor: theme.statusBgWarning,
                                borderColor: theme.statusBgWarning,
                                borderWidth: 2,
                              }
                            : {
                                backgroundColor: theme.statusBgWarningSubtle,
                                borderColor: theme.statusBgWarning,
                                borderWidth: 2,
                              }
                        }
                        textStyle={{
                          color: localDifficulties.includes('Modéré') ? theme.card : theme.statusTextWarning,
                          fontFamily: 'Satoshi-Bold',
                        }}
                      />

                      {/* Difficile Chip */}
                      <Chip
                        text="Difficile"
                        selected={localDifficulties.includes('Difficile')}
                        onPress={() => toggleDifficulty('Difficile')}
                        style={
                          localDifficulties.includes('Difficile')
                            ? {
                                backgroundColor: theme.statusBgError,
                                borderColor: theme.statusBgError,
                                borderWidth: 2,
                              }
                            : {
                                backgroundColor: theme.statusBgErrorSubtle,
                                borderColor: theme.statusBgError,
                                borderWidth: 2,
                              }
                        }
                        textStyle={{
                          color: localDifficulties.includes('Difficile') ? theme.card : theme.statusTextError,
                          fontFamily: 'Satoshi-Bold',
                        }}
                      />
                    </View>
                  </View>

                  {/* Train Duration Slider */}
                  <RangeSlider
                    title="Temps de transport"
                    subtitle={
                      <Text style={[styles.filterOriginText, { color: theme.text }]}>
                        Depuis <Text style={{ color: theme.text }}>{userLocationName}</Text>
                      </Text>
                    }
                    min={0}
                    max={180}
                    values={trainRange}
                    onChange={setTrainRange}
                    valueFormatter={(minVal, maxVal) => `${minVal}-${formatTrainLabel(maxVal)}`}
                  />

                  {/* Distance Slider */}
                  <RangeSlider
                    title="Distance du parcours"
                    min={0}
                    max={34}
                    values={distanceRange}
                    onChange={setDistanceRange}
                    valueFormatter={(minVal, maxVal) =>
                      `${minVal}-${maxVal === 34 ? 'Toutes' : `${maxVal} km`}`
                    }
                  />

                  {/* Elevation Slider */}
                  <RangeSlider
                    title="Dénivelé positif"
                    min={0}
                    max={4500}
                    values={elevationRange}
                    onChange={setElevationRange}
                    valueFormatter={(minVal, maxVal) =>
                      `${minVal}-${maxVal === 4500 ? 'Tous' : `${maxVal} m+`}`
                    }
                  />

                  {/* Toggles (Dogs & Kids) */}
                  <ToggleRow
                    title="Accessible aux chiens"
                    value={localDogs}
                    onValueChange={setLocalDogs}
                  />

                  <ToggleRow
                    title="Convient aux enfants"
                    value={localKids}
                    onValueChange={setLocalKids}
                    style={{ marginTop: 12 }}
                  />

                  {/* Activity Types Grid */}
                  <View
                    style={[
                      styles.filterGroup,
                      {
                        marginTop: 20,
                      },
                    ]}>
                    <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                      Type d’activité
                    </Text>
                    <View style={styles.chipsWrapRow}>
                      {ACTIVITY_TYPES.map((act) => {
                        const isSelected = localActivityTypes.includes(act);
                        return (
                          <Chip
                            key={act}
                            text={act}
                            selected={isSelected}
                            onPress={() => toggleActivity(act)}
                            style={
                              isSelected
                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                : { backgroundColor: theme.background, borderColor: theme.border }
                            }
                            textStyle={
                              isSelected ? { color: '#FFFFFF' } : { color: theme.text }
                            }
                          />
                        );
                      })}
                    </View>
                  </View>

                  {/* Points of interest Grid */}
                  <View style={styles.filterGroup}>
                    <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                      Points d’intérêts
                    </Text>
                    <View style={styles.chipsWrapRow}>
                      {POINTS_OF_INTEREST.map((poi) => {
                        const isSelected = localPointsOfInterest.includes(poi);
                        return (
                          <Chip
                            key={poi}
                            text={poi}
                            selected={isSelected}
                            onPress={() => togglePOI(poi)}
                            style={
                              isSelected
                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                : { backgroundColor: theme.background, borderColor: theme.border }
                            }
                            textStyle={
                              isSelected ? { color: '#FFFFFF' } : { color: theme.text }
                            }
                          />
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>

                {/* Fade gradient at the bottom of the filters scroll */}
                <LinearGradient
                  colors={[
                    colorScheme === 'dark' ? 'rgba(27, 27, 27, 0)' : 'rgba(255, 255, 255, 0)',
                    colorScheme === 'dark' ? 'rgba(27, 27, 27, 1)' : 'rgba(255, 255, 255, 1)',
                  ]}
                  style={styles.filtersFadeGradient}
                  pointerEvents="none"
                />
              </View>
            </View>

            {/* Footer Action Buttons */}
            <View style={[styles.footerContainer]}>
              <Button variant="text" title="Tout effacer" onPress={handleClearFilters} />

              <Button
                variant="primary"
                title={localFilteredHikes.length === 0 ? 'Aucun résultat' : 'Rechercher'}
                icon={<Search size={20} color="#efefef" />}
                onPress={handleApplyFilters}
                disabled={localFilteredHikes.length === 0}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>

          {/* ABSOLUTE FLOATING SEARCH CARD */}
          <Animated.View
            style={[
              styles.card,
              {
                position: 'absolute',
                top: cardTopAnim,
                left: cardLeftAnim,
                right: cardRightAnim,
                bottom: cardBottomAnim,
                backgroundColor: theme.card,
                borderRadius: cardBorderRadius,
                paddingTop: cardPadding,
                paddingLeft: cardPadding,
                paddingRight: cardPadding,
                paddingBottom: 0,
                zIndex: 5,
                overflow: 'hidden',
              },
              isSearchFocused && {
                shadowOpacity: 0,
                elevation: 0,
                flex: 1,
                height: '100%',
              },
            ]}>
             {/* Collapsed search bar UI */}
             <Animated.View
               pointerEvents={isSearchCollapsed ? 'auto' : 'none'}
               style={{
                 opacity: collapsedOpacity,
                 position: isSearchCollapsed ? 'relative' : 'absolute',
                 width: '100%',
               }}>
               <Pressable
                onPress={() => {
                  toggleSearchFocus(true);
                }}
                style={styles.collapsedSearchContainer}>
                {localSearch ? (
                  <>
                    <Text style={[styles.collapsedSearchFilledLabel, { color: theme.textMuted }]}>
                      Où va-t-on ?
                    </Text>
                    <Text
                      style={[styles.collapsedSearchFilledValue, { color: theme.text }]}
                      numberOfLines={1}>
                      {localSearch}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.collapsedSearchLeft}>
                      <Text style={[styles.collapsedSearchTitle, { color: theme.text }]}>
                        Où va-t-on ?
                      </Text>
                      <Text
                        style={[styles.collapsedSearchValue, { color: theme.textMuted }]}
                        numberOfLines={1}>
                        Tout Explorer
                      </Text>
                    </View>
                    <View style={styles.chevronIcon}>
                      <ChevronDown size={20} color={theme.text} />
                    </View>
                  </>
                )}
              </Pressable>
            </Animated.View>

            {/* Expanded search bar UI */}
            <Animated.View
              pointerEvents={isSearchCollapsed ? 'none' : 'auto'}
              style={{
                opacity: expandedOpacity,
                position: isSearchCollapsed ? 'absolute' : 'relative',
                width: '100%',
                flex: 1,
              }}>
              <View style={[styles.expandedSearchContainer, { flex: 1 }]}>
                <View
                  style={
                    isSearchFocused
                      ? [
                          styles.searchHeaderContainerFocused,
                          {
                            backgroundColor: theme.card,
                            borderBottomColor: theme.borderLight,
                            paddingTop: insets.top + 16,
                          },
                        ]
                      : null
                  }>
                  {!isSearchFocused && (
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>Où va-t-on ?</Text>
                      {localSearch ? (
                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsSearchCollapsed(true);
                          }}>
                          <ChevronUp size={20} color={theme.text} />
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.searchHeaderRow}>
                    <View
                      style={[
                        styles.textInputWrapper,
                        {
                          flex: 1,
                          backgroundColor: theme.background,
                          borderColor: isSearchFocused ? theme.text : theme.border,
                          marginBottom: 0,
                          borderWidth: isSearchFocused ? 1.5 : 1,
                        },
                      ]}>
                      {isSearchFocused ? (
                        <Pressable
                          onPress={() => {
                            toggleSearchFocus(false);
                            Keyboard.dismiss();
                          }}
                          style={{ padding: 4, marginLeft: -4, marginRight: 4 }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                          <ArrowLeft size={20} color={theme.text} />
                        </Pressable>
                      ) : (
                        <Search size={20} color={theme.text} style={styles.searchIcon} />
                      )}
                      {isSearchFocused ? (
                        <TextInput
                          ref={inputRef}
                          style={[styles.textInput, { color: theme.text }]}
                          placeholder="Rechercher un lieu, un village..."
                          placeholderTextColor={theme.textMuted}
                          value={localSearch}
                          onChangeText={(text) => setLocalSearch(text)}
                          onFocus={() => {
                            toggleSearchFocus(true);
                          }}
                          onSubmitEditing={handleSubmitSearch}
                        />
                      ) : (
                        <Pressable
                          onPress={() => {
                            toggleSearchFocus(true);
                          }}
                          style={{ flex: 1, justifyContent: 'center', height: '100%' }}>
                          <Text
                            style={[
                              styles.textInput,
                              {
                                color: localSearch ? theme.text : theme.textMuted,
                                textAlignVertical: 'center',
                                includeFontPadding: false,
                                paddingTop: Platform.OS === 'ios' ? 0 : 4,
                              },
                            ]}
                            numberOfLines={1}>
                            {localSearch || 'Rechercher un lieu, un village...'}
                          </Text>
                        </Pressable>
                      )}
                      {localSearch ? (
                        <Pressable onPress={() => setLocalSearch('')} style={styles.clearSearchBtn}>
                          <X size={16} color={theme.text} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>

                {isSearchFocused && localSearch ? (
                  // Focused and typing: show Mapbox real-time search results
                  isSearching ? (
                    <View style={[styles.noResultsContainer, { paddingTop: 32 }]}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <Text
                        style={[styles.noResultsText, { color: theme.textMuted, marginTop: 8 }]}>
                        Recherche des lieux...
                      </Text>
                    </View>
                  ) : searchResults.length === 0 ? (
                    <View style={[styles.noResultsContainer, { paddingTop: 32 }]}>
                      <Text style={[styles.noResultsText, { color: theme.textMuted }]}>
                        Aucun lieu trouvé
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{
                        paddingTop: 12,
                        paddingHorizontal: 16,
                        paddingBottom: 24,
                      }}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}>
                      <View style={styles.suggestionsContainer}>
                        {searchResults.map((item, index) => {
                          const IconComponent = item.icon || MapPin;
                          const isLast = index === searchResults.length - 1;

                          return (
                            <Pressable
                              key={item.id}
                              onPress={() =>
                                handleSuggestionPress(item.originalValue || item.name, item.coords)
                              }
                              style={styles.suggestionRow}>
                              <View
                                style={[
                                  styles.suggestionIconWrapper,
                                  { backgroundColor: theme.background },
                                ]}>
                                <IconComponent size={18} color={theme.text} />
                              </View>
                              <View style={styles.suggestionTextRow}>
                                <Text style={[styles.suggestionName, { color: theme.text }]}>
                                  {item.name}
                                </Text>
                                {item.dept ? (
                                  <>
                                    <Text style={styles.suggestionSeparator}>·</Text>
                                    <Text
                                      style={[styles.suggestionDept, { color: theme.textMuted }]}>
                                      {item.dept}
                                    </Text>
                                  </>
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )
                ) : // Default state: not focused, or focused but empty. Show recent searches and suggestions.
                isSearchFocused ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      paddingTop: 12,
                      paddingHorizontal: 16,
                      paddingBottom: 24,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text
                          style={[
                            styles.sectionSubtitle,
                            { color: theme.textMuted, marginTop: 0 },
                          ]}>
                          Recherches récentes
                        </Text>
                        <View style={styles.suggestionsContainer}>
                          {recentSearches.map((item, index) => {
                            const isLast = index === recentSearches.length - 1;
                            return (
                              <Pressable
                                key={`recent-${item.name}`}
                                onPress={() => handleSuggestionPress(item.name, item.coords)}
                                style={styles.suggestionRow}>
                                <View
                                  style={[
                                    styles.suggestionIconWrapper,
                                    { backgroundColor: theme.background },
                                  ]}>
                                  <RotateCcw size={18} color={theme.text} />
                                </View>
                                <View style={styles.suggestionTextRow}>
                                  <Text style={[styles.suggestionName, { color: theme.text }]}>
                                    {item.name}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Suggestions */}
                    <View>
                      <Text
                        style={[styles.sectionSubtitle, { color: theme.textMuted, marginTop: 0 }]}>
                        Suggestions
                      </Text>
                      <View style={styles.suggestionsContainer}>
                        {dynamicSuggestions.map((item, index) => {
                          const IconComponent = item.icon || MapPin;
                          const isLast = index === dynamicSuggestions.length - 1;

                          return (
                            <Pressable
                              key={`suggest-${item.name}`}
                              onPress={() => handleSuggestionPress(item.name, item.coords)}
                              style={styles.suggestionRow}>
                              <View
                                style={[
                                  styles.suggestionIconWrapper,
                                  { backgroundColor: theme.background },
                                ]}>
                                <IconComponent size={18} color={theme.text} />
                              </View>
                              <View style={styles.suggestionTextRow}>
                                <Text style={[styles.suggestionName, { color: theme.text }]}>
                                  {item.name}
                                </Text>
                                {item.dept ? (
                                  <>
                                    <Text style={styles.suggestionSeparator}>·</Text>
                                    <Text
                                      style={[styles.suggestionDept, { color: theme.textMuted }]}>
                                      {item.dept}
                                    </Text>
                                  </>
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </ScrollView>
                ) : (
                  <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}>
                    <View style={{ marginTop: 12 }}>
                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={[
                              styles.sectionSubtitle,
                              { color: theme.textMuted, marginTop: 0 },
                            ]}>
                            Recherches récentes
                          </Text>
                          <View style={styles.suggestionsContainer}>
                            {recentSearches.map((item, index) => {
                              return (
                                <Pressable
                                  key={`recent-${item.name}`}
                                  onPress={() => handleSuggestionPress(item.name, item.coords)}
                                  style={styles.suggestionRow}>
                                  <View
                                    style={[
                                      styles.suggestionIconWrapper,
                                      { backgroundColor: theme.background },
                                    ]}>
                                    <RotateCcw size={18} color={theme.text} />
                                  </View>
                                  <View style={styles.suggestionTextRow}>
                                    <Text style={[styles.suggestionName, { color: theme.text }]}>
                                      {item.name}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Suggestions */}
                      <View>
                        <Text
                          style={[
                            styles.sectionSubtitle,
                            { color: theme.textMuted, marginTop: 0 },
                          ]}>
                          Suggestions
                        </Text>
                        <View style={styles.suggestionsContainer}>
                          {dynamicSuggestions.map((item, index) => {
                            const IconComponent = item.icon || MapPin;
                            const isLast = index === dynamicSuggestions.length - 1;

                            return (
                              <Pressable
                                key={`suggest-${item.name}`}
                                onPress={() => handleSuggestionPress(item.name, item.coords)}
                                style={styles.suggestionRow}>
                                <View
                                  style={[
                                    styles.suggestionIconWrapper,
                                    { backgroundColor: theme.background },
                                  ]}>
                                  <IconComponent size={18} color={theme.text} />
                                </View>
                                <View style={styles.suggestionTextRow}>
                                  <Text style={[styles.suggestionName, { color: theme.text }]}>
                                    {item.name}
                                  </Text>
                                  {item.dept ? (
                                    <>
                                      <Text style={styles.suggestionSeparator}>·</Text>
                                      <Text
                                        style={[styles.suggestionDept, { color: theme.textMuted }]}>
                                        {item.dept}
                                      </Text>
                                    </>
                                  ) : null}
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                )}

                {/* Fade gradient at the bottom of the filters scroll */}
                <LinearGradient
                  colors={[
                    colorScheme === 'dark' ? 'rgba(27, 27, 27, 0)' : 'rgba(255, 255, 255, 0)',
                    colorScheme === 'dark' ? 'rgba(27, 27, 27, 1)' : 'rgba(255, 255, 255, 1)',
                  ]}
                  style={styles.filtersFadeGradient}
                  pointerEvents="none"
                />
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  cardsContainer: {
    flex: 1,
    width: '100%',
    gap: 12,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  filtersCard: {
    flex: 1,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  filtersScrollView: {
    flex: 1,
  },
  filtersScrollContent: {
    paddingBottom: 32,
  },
  filtersFadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
  },
  collapsedSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  collapsedSearchLeft: {
    flex: 1,
  },
  collapsedSearchTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
  },
  collapsedSearchValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    marginTop: 2,
  },
  collapsedSearchFilledLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  collapsedSearchFilledValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  chevronIcon: {
    padding: 4,
  },
  expandedSearchContainer: {
    width: '100%',
  },
  searchHeaderContainerFocused: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 0,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  suggestionsContainer: {
    gap: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  suggestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  suggestionName: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 14,
  },
  suggestionSeparator: {
    marginHorizontal: 4,
    color: '#7c7c7c',
  },
  suggestionDept: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  filterGroup: {
    marginBottom: 20,
    width: '100%',
  },
  filterGroupTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    marginBottom: 10,
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  filterValueText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  filterOriginText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 32,
    paddingBottom: 16,
  },
  clearBtn: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  clearBtnText: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 14,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1b1b1b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  applyBtnText: {
    color: '#efefef',
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
  },

  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  cancelSearchBtn: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  cancelSearchText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  suggestionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
});
