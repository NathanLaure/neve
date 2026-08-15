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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, RotateCcw, ArrowLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import FiltersForm from '@/components/FiltersForm';
import { searchPlaces } from '@/services/geocodingService';
import PlaceSuggestionRow, { PlaceKind, getPlaceKind } from '@/components/PlaceSuggestionRow';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Fixed chrome heights used to work out how tall the open card may grow.
const FILTERS_COLLAPSED_HEIGHT = 74; // cardHeader (42) + card padding (16 * 2)
const CARDS_GAP = 12; // cardsContainer gap
const FOOTER_HEIGHT = 96; // paddingTop (32) + Button (48) + paddingBottom (16)



export default function SearchModal() {
  const router = useRouter();
  const { fromResults } = useLocalSearchParams<{ fromResults?: string }>();
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
    isLoadingHikes,
    userLocationName,
    userLocation,
    getTransitInfo,
    setUserLocationManually,
    refreshUserLocation,
    recentSearches,
    addRecentSearch,
    ensureHikesRadius,
  } = useAdventure();

  // Local state initialized from global context on mount
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDifficulties, setLocalDifficulties] = useState<string[]>(selectedDifficulties);
  const [localDogs, setLocalDogs] = useState(dogsAllowed);
  const [localKids, setLocalKids] = useState(kidsFriendly);
  const [localActivityTypes, setLocalActivityTypes] = useState<string[]>(selectedActivityTypes);
  const [localPointsOfInterest, setLocalPointsOfInterest] =
    useState<string[]>(selectedPointsOfInterest);

  const [highestPointRange, setHighestPointRange] = useState<[number, number]>([0, 4500]);
  const [geographicZone, setGeographicZone] = useState<string>('idf');
  const [wheelchairFriendly, setWheelchairFriendly] = useState(false);
  const [parcoursType, setParcoursType] = useState<string[]>([]);
  const [frequentation, setFrequentation] = useState<string[]>([]);
  const [communityNote, setCommunityNote] = useState<number | null>(null);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // The place is staged locally and only written to the global context on
  // "Rechercher" — picking a suggestion must not move the map behind the modal,
  // and closing without validating must leave nothing behind.
  const [pendingPlace, setPendingPlace] = useState<{
    name: string;
    coords: { latitude: number; longitude: number };
  } | null>(null);
  const [pendingUseCurrentLocation, setPendingUseCurrentLocation] = useState(false);

  // What the modal previews against: the staged place when there is one.
  const effectiveLocation = pendingPlace?.coords ?? userLocation;
  const effectiveLocationName = pendingPlace?.name ?? userLocationName;

  // Searching with nothing entered means "around me". The preview below filters on
  // this same fallback, so the result count never contradicts what the search returns.
  const effectiveSearchQuery = localSearch.trim() ? localSearch : 'À proximité';

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

        const lat = rando?.startStationCoords?.latitude ?? (rando as any)?.start_lat ?? 48.8566;
        const lng = rando?.startStationCoords?.longitude ?? (rando as any)?.start_lng ?? 2.3522;
        const distance = calculateDistanceKm(
          userLocation?.latitude ?? 48.8566,
          userLocation?.longitude ?? 2.3522,
          lat,
          lng
        );

        uniqueLocations.push({
          name,
          dept,
          distance,
          coords: {
            latitude: lat,
            longitude: lng,
          },
        });
      }
    });

    // Sort by distance (closest first)
    uniqueLocations.sort((a, b) => a.distance - b.distance);

    // Build the final suggestions array (limit to 10 hike locations + "À proximité")
    return [
      {
        name: 'À proximité',
        dept: 'Autour de moi',
        kind: 'nearby' as PlaceKind,
        coords: userLocation,
      },
      ...uniqueLocations.slice(0, 10).map((loc) => ({
        name: loc.name,
        dept: loc.dept,
        kind: getPlaceKind(loc.name, loc.dept),
        coords: loc.coords,
      })),
    ];
  }, [hikes, userLocation]);

  // The two cards behave as one exclusive accordion: exactly one of them is open at
  // any time, so a single piece of state drives both.
  const [openPanel, setOpenPanel] = useState<'search' | 'filters'>(
    localSearch ? 'filters' : 'search'
  );
  const isSearchCollapsed = openPanel !== 'search';
  const isFiltersOpen = openPanel === 'filters';

  // Track whether the search input is focused
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(60);

  // Height the search card is allowed to grow to when it is the open panel: everything
  // left once the header, the collapsed Filtres card and the footer have taken their share.
  const maxSearchContentHeight = useMemo(() => {
    const available =
      SCREEN_HEIGHT -
      (insets.top + 32 + headerHeight) - // top of the card
      FILTERS_COLLAPSED_HEIGHT -
      CARDS_GAP -
      FOOTER_HEIGHT -
      (insets.bottom || 16);
    // 140 is the card chrome above the list (title row + input + paddings).
    return Math.max(160, available - 140);
  }, [insets.top, insets.bottom, headerHeight]);

  const boundedContentHeight = useMemo(() => {
    // 60 = suggestionRow (56) + suggestionsContainer gap (4); 30 = section subtitle.
    const recentSearchesHeight = recentSearches.length > 0 ? 30 + recentSearches.length * 60 : 0;
    const suggestionsHeight = 30 + dynamicSuggestions.length * 60;
    const totalContentHeight = recentSearchesHeight + suggestionsHeight + 12; // 12 is marginTop
    return Math.min(totalContentHeight, maxSearchContentHeight);
  }, [recentSearches, dynamicSuggestions, maxSearchContentHeight]);

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
    const targetBottom = isSearchFocused ? -(insets.bottom || 16) : SCREEN_HEIGHT - placeholderLayout.y - currentCardHeight;
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
    insets.top,
    insets.bottom,
  ]);

  // Helper to change search focus state with smooth animations
  const toggleSearchFocus = useCallback(
    (focused: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearchFocused(focused);
      // Focusing the input always brings the search panel forward; blurring hands the
      // accordion over to Filtres only once a place has actually been entered.
      setOpenPanel(focused ? 'search' : localSearch ? 'filters' : 'search');
    },
    [localSearch]
  );

  // Tapping either card header swaps which one is open — they are mutually exclusive.
  const handleToggleFilters = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Keyboard.dismiss();
    setIsSearchFocused(false);
    setOpenPanel((current) => (current === 'filters' ? 'search' : 'filters'));
  }, []);

  // Debounced geocoding search for places in France via Mapbox Geocoding API (runs only when typing)
  useEffect(() => {
    if (!localSearch || localSearch.trim().length < 2) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const places = await searchPlaces(localSearch);
        setSearchResults(
          places.map((place) => ({
            id: place.id,
            name: place.name,
            dept: place.context,
            coords: { latitude: place.latitude, longitude: place.longitude },
            // place_type is Mapbox's own classification — the only trustworthy
            // city/village signal we get.
            kind: getPlaceKind(place.name, place.context, place.placeType),
            originalValue: place.name,
          }))
        );
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPendingUseCurrentLocation(true);
      setPendingPlace(null);
      setOpenPanel('filters');
      setIsSearchFocused(false);
      Keyboard.dismiss();
      return;
    }

    try {
      const [best] = await searchPlaces(localSearch, 1);
      if (best) {
        // Staged only — committed in handleApplyFilters.
        setPendingPlace({
          name: best.name,
          coords: { latitude: best.latitude, longitude: best.longitude },
        });
        setPendingUseCurrentLocation(false);
        setLocalSearch(best.name);
      } else {
        console.warn('Lieu introuvable');
      }
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpenPanel('filters');
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
    // The staged place goes first so the map and distances land on it.
    // With no place entered the search falls back to the user's surroundings.
    if (pendingUseCurrentLocation || !localSearch.trim()) {
      refreshUserLocation();
    } else if (pendingPlace) {
      setUserLocationManually(pendingPlace.coords, pendingPlace.name);
      addRecentSearch(pendingPlace.name, pendingPlace.coords);
    }

    // 75 km : même rayon "à proximité" que celui déjà utilisé pour filtrer les résultats
    // plus bas — s'assure que les randos autour du lieu recherché sont bien chargées.
    ensureHikesRadius(pendingPlace?.coords ?? userLocation, 75);

    setMaxTrainDuration(trainRange[1] >= 180 ? null : trainRange[1]);
    setMaxDistance(distanceRange[1] >= 34 ? null : distanceRange[1]);
    setMaxElevation(elevationRange[1] >= 4500 ? null : elevationRange[1]);
    setSearchQuery(effectiveSearchQuery);
    setSelectedDifficulties(localDifficulties);
    setDogsAllowed(localDogs);
    setKidsFriendly(localKids);
    setSelectedActivityTypes(localActivityTypes);
    setSelectedPointsOfInterest(localPointsOfInterest);
    
    // Close the modal and navigate
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        easing: Easing.bezier(0.3, 0, 0.8, 0.15),
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
      if (fromResults !== 'true') {
        router.push('/results');
      }
    });
  };

  const handleClearFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalSearch('');
    setSearchResults([]);
    setIsSearching(false);
    // No place left, so the accordion goes back to the search panel.
    setOpenPanel('search');
    setPendingPlace(null);
    setPendingUseCurrentLocation(false);
    setLocalDifficulties([]);
    setTrainRange([0, 180]);
    setDistanceRange([0, 34]);
    setElevationRange([0, 4500]);
    setLocalDogs(false);
    setLocalKids(false);
    setLocalActivityTypes([]);
    setLocalPointsOfInterest([]);
    setHighestPointRange([0, 4500]);
    setGeographicZone('idf');
    setWheelchairFriendly(false);
    setParcoursType([]);
    setFrequentation([]);
    setCommunityNote(null);
  };

  const handleSuggestionPress = (
    placeName: string,
    coords?: { latitude: number; longitude: number }
  ) => {
    setLocalSearch(placeName);
    setSearchResults([]);
    setIsSearching(false);
    // toggleSearchFocus reads the stale localSearch here, so set the panel explicitly.
    toggleSearchFocus(false);
    setOpenPanel('filters');
    Keyboard.dismiss();

    // Staged only — committed in handleApplyFilters.
    if (placeName === 'À proximité') {
      setPendingUseCurrentLocation(true);
      setPendingPlace(null);
    } else if (coords) {
      setPendingPlace({ name: placeName, coords });
      setPendingUseCurrentLocation(false);
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

  // Local toggling helpers removed as they are managed inside FiltersForm

  // Compute local filtered hikes inside modal in real-time based on local selections
  const localFilteredHikes = useMemo(() => {
    const query = effectiveSearchQuery.toLowerCase().trim();
    const locName = effectiveLocationName.toLowerCase().trim();
    const isUserLocationSearch =
      query === 'à proximité' ||
      query === 'a proximité' ||
      query === 'proximité' ||
      query === locName;

    const distanceToUser = (rando: any) =>
      calculateDistanceKm(
        effectiveLocation?.latitude ?? 48.8566,
        effectiveLocation?.longitude ?? 2.3522,
        rando?.startStationCoords?.latitude ?? rando?.start_lat ?? 48.8566,
        rando?.startStationCoords?.longitude ?? rando?.start_lng ?? 2.3522
      );

    // Everything the user asked for explicitly. The proximity radius is deliberately
    // left out — it is a preference, applied further down.
    const base = hikes.filter((rando) => {
      // 1. Text Search query — skipped for an "around me" search.
      if (!isUserLocationSearch) {
        const matchesText =
          rando.title?.toLowerCase().includes(query) ||
          rando.location?.toLowerCase().includes(query) ||
          rando.startStation?.toLowerCase().includes(query) ||
          rando.endStation?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // 2. Difficulty
      if (localDifficulties.length > 0) {
        const randoDiffNorm = (rando.difficulty || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hasMatch = localDifficulties.some((d) => {
          const dNorm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return randoDiffNorm.includes(dNorm) || dNorm.includes(randoDiffNorm);
        });
        if (!hasMatch) return false;
      }

      // 3. Hike Distance
      const maxDistVal = distanceRange[1] >= 34 ? null : distanceRange[1];
      if (maxDistVal !== null) {
        const distNum = (rando as any).distance_km ?? parseFloat(rando.distance);
        if (!isNaN(distNum) && distNum > maxDistVal) return false;
      }

      // 4. Hike Elevation
      const maxElevVal = elevationRange[1] >= 4500 ? null : elevationRange[1];
      if (maxElevVal !== null) {
        const elevMatch = rando.elevation ? rando.elevation.match(/\d+/) : null;
        const elevNum = (rando as any).elevation_gain_m ?? (elevMatch ? parseInt(elevMatch[0], 10) : 0);
        if (elevNum > maxElevVal) return false;
      }

      // 5. Train Duration (Transit time)
      const maxTrainVal = trainRange[1] >= 180 ? null : trainRange[1];
      if (maxTrainVal !== null) {
        const transitInfo = getTransitInfo(rando, effectiveLocation);
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

    if (!isUserLocationSearch) return base;

    // Prefer what sits within 75 km, but never hand back an empty list just because
    // the user is far from every hike — showing the nearest ones beats "Aucun résultat".
    const nearby = base.filter((rando) => distanceToUser(rando) <= 75);
    const result = nearby.length > 0 ? nearby : base;

    return [...result].sort((a, b) => distanceToUser(a) - distanceToUser(b));
  }, [
    hikes,
    effectiveSearchQuery,
    effectiveLocationName,
    localDifficulties,
    distanceRange,
    elevationRange,
    trainRange,
    localDogs,
    localKids,
    localActivityTypes,
    localPointsOfInterest,
    getTransitInfo,
    effectiveLocation,
  ]);

  // Check if any filters are active. Must cover everything handleClearFilters
  // resets, otherwise "Tout effacer" would sit disabled with something to clear.
  const hasActiveFilters = useMemo(() => {
    return (
      localDifficulties.length > 0 ||
      trainRange[1] < 180 ||
      distanceRange[1] < 34 ||
      elevationRange[1] < 4500 ||
      localDogs ||
      localKids ||
      localActivityTypes.length > 0 ||
      localPointsOfInterest.length > 0 ||
      highestPointRange[0] > 0 ||
      highestPointRange[1] < 4500 ||
      geographicZone !== 'idf' ||
      wheelchairFriendly ||
      parcoursType.length > 0 ||
      frequentation.length > 0 ||
      communityNote !== null
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
    highestPointRange,
    geographicZone,
    wheelchairFriendly,
    parcoursType,
    frequentation,
    communityNote,
  ]);

  // "Tout effacer" also wipes the place, so it stays enabled for that alone.
  const hasAnythingToClear =
    hasActiveFilters || !!localSearch.trim() || !!pendingPlace || pendingUseCurrentLocation;

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
                  ? 'rgba(15, 15, 15, 0.25)'
                  : 'rgba(255, 255, 255, 0.25)'
                : theme.background,
          },
        ]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={60}
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

              {/* FILTERS SECTION — half of the exclusive accordion with the search card */}
              <View
                style={[
                  styles.card,
                  styles.filtersCard,
                  { backgroundColor: theme.card },
                  !isFiltersOpen && styles.filtersCardCollapsed,
                ]}>
                <Pressable
                  onPress={handleToggleFilters}
                  style={[styles.cardHeader, !isFiltersOpen && { marginBottom: 0 }]}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Filtres</Text>
                  <View style={styles.filtersCardHeaderRight}>
                    {isFiltersOpen && hasActiveFilters && (
                      <Button
                        variant="text"
                        title="Réinitialiser"
                        icon={<RotateCcw size={14} color={theme.textMuted} />}
                        onPress={handleClearFilters}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, height: 'auto' }}
                        textStyle={{ fontSize: 13, color: theme.textMuted }}
                      />
                    )}
                    {!isFiltersOpen && (
                      <Text style={[styles.accordionHint, { color: theme.textMuted }]}>
                        Affiner la recherche
                      </Text>
                    )}
                  </View>
                </Pressable>

                {isFiltersOpen ? (
                  <>
                    <ScrollView
                      style={styles.filtersScrollView}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.filtersScrollContent}>
                      <FiltersForm
                        difficulties={localDifficulties}
                        setDifficulties={setLocalDifficulties}
                        trainRange={trainRange}
                        setTrainRange={setTrainRange}
                        distanceRange={distanceRange}
                        setDistanceRange={setDistanceRange}
                        elevationRange={elevationRange}
                        setElevationRange={setElevationRange}
                        highestPointRange={highestPointRange}
                        setHighestPointRange={setHighestPointRange}
                        geographicZone={geographicZone}
                        setGeographicZone={setGeographicZone}
                        dogsAllowed={localDogs}
                        setDogsAllowed={setLocalDogs}
                        kidsFriendly={localKids}
                        setKidsFriendly={setLocalKids}
                        wheelchairFriendly={wheelchairFriendly}
                        setWheelchairFriendly={setWheelchairFriendly}
                        activityTypes={localActivityTypes}
                        setActivityTypes={setLocalActivityTypes}
                        pointsOfInterest={localPointsOfInterest}
                        setPointsOfInterest={setLocalPointsOfInterest}
                        parcoursType={parcoursType}
                        setParcoursType={setParcoursType}
                        frequentation={frequentation}
                        setFrequentation={setFrequentation}
                        communityNote={communityNote}
                        setCommunityNote={setCommunityNote}
                        showDifficulties={true}
                        showTrainRange={true}
                        showDistanceRange={true}
                        showElevationRange={true}
                        showHighestPointRange={true}
                        showAccessibility={true}
                        showActivityTypes={true}
                        showPointsOfInterest={true}
                        showParcoursType={true}
                        showFrequentation={true}
                        showCommunityNote={true}
                      />
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
                  </>
                ) : null}
              </View>
            </View>

            {/* Footer Action Buttons. Pas d'inset bas ici : `innerContainer` l'applique
                déjà pour toute la page. Le redemander décalait les boutons du double
                de la barre système. */}
            <View style={styles.footerContainer}>
              <Button
                variant="text"
                title="Tout effacer"
                onPress={handleClearFilters}
                disabled={!hasAnythingToClear}
              />

              <Button
                variant="primary"
                // While the hikes are still loading the list is empty for a reason that
                // has nothing to do with the filters — don't call that "Aucun résultat".
                title={
                  !isLoadingHikes && localFilteredHikes.length === 0
                    ? 'Aucun résultat'
                    : 'Rechercher'
                }
                icon={<Search size={20} color="#efefef" />}
                onPress={handleApplyFilters}
                disabled={!isLoadingHikes && localFilteredHikes.length === 0}
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
                  // Only swap the accordion open — focusing the input is a separate,
                  // deliberate tap on the search field itself.
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setOpenPanel('search');
                }}
                style={styles.collapsedSearchContainer}>
                <Text style={[styles.collapsedSearchTitle, { color: theme.text }]}>
                  Où va-t-on ?
                </Text>
                {localSearch ? (
                  <Text
                    style={[styles.collapsedSearchFilledValue, { color: theme.text }]}
                    numberOfLines={1}>
                    {localSearch}
                  </Text>
                ) : (
                  <Text style={[styles.accordionHint, { color: theme.textMuted }]}>
                    Choisir un lieu
                  </Text>
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
                      {/* No hint here: the affordance belongs to the collapsed panel,
                          and this one is open. Filtres' own header closes it. */}
                      <Text style={[styles.cardTitle, { color: theme.text }]}>Où va-t-on ?</Text>
                    </View>
                  )}

                  <View style={styles.searchHeaderRow}>
                    <View
                      style={[
                        styles.textInputWrapper,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
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
                                paddingTop: Platform.OS === 'ios' ? 0 : 9  ,
                                flex: 0,
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
                        {searchResults.map((item) => (
                          <PlaceSuggestionRow
                            key={item.id}
                            kind={item.kind}
                            name={item.name}
                            dept={item.dept}
                            scheme={colorScheme}
                            textColor={theme.text}
                            mutedColor={theme.textMuted}
                            onPress={() =>
                              handleSuggestionPress(item.originalValue || item.name, item.coords)
                            }
                          />
                        ))}
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
                    {recentSearches && recentSearches.filter((item) => item && item.name).length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text
                          style={[
                            styles.sectionSubtitle,
                            { color: theme.textMuted, marginTop: 0 },
                          ]}>
                          Recherches récentes
                        </Text>
                        <View style={styles.suggestionsContainer}>
                          {recentSearches
                            .filter((item) => item && item.name)
                            .map((item, index) => (
                              <PlaceSuggestionRow
                                key={`recent-${item.name}-${index}`}
                                kind="recent"
                                name={item.name}
                                scheme={colorScheme}
                                textColor={theme.text}
                                mutedColor={theme.textMuted}
                                onPress={() =>
                                  handleSuggestionPress(
                                    item.name,
                                    item.coords || { latitude: 48.8566, longitude: 2.3522 }
                                  )
                                }
                              />
                            ))}
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
                        {dynamicSuggestions &&
                          dynamicSuggestions
                            .filter((item) => item && item.name)
                            .map((item, index) => (
                              <PlaceSuggestionRow
                                key={`suggest-${item.name}-${index}`}
                                kind={item.kind}
                                name={item.name}
                                dept={item.dept}
                                scheme={colorScheme}
                                textColor={theme.text}
                                mutedColor={theme.textMuted}
                                onPress={() =>
                                  handleSuggestionPress(
                                    item.name,
                                    item.coords || { latitude: 48.8566, longitude: 2.3522 }
                                  )
                                }
                              />
                            ))}
                      </View>
                    </View>
                  </ScrollView>
                ) : (
                  <ScrollView
                    // maxHeight pins the viewport: relying on flex alone left it unbounded
                    // inside the absolutely positioned card, so the list never scrolled.
                    style={{ flex: 1, maxHeight: boundedContentHeight }}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}>
                    <View style={{ marginTop: 12 }}>
                      {/* Recent Searches */}
                      {recentSearches && recentSearches.filter((item) => item && item.name).length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={[
                              styles.sectionSubtitle,
                              { color: theme.textMuted, marginTop: 0 },
                            ]}>
                            Recherches récentes
                          </Text>
                          <View style={styles.suggestionsContainer}>
                            {recentSearches
                              .filter((item) => item && item.name)
                              .map((item, index) => (
                                <PlaceSuggestionRow
                                  key={`recent-${item.name}-${index}`}
                                  kind="recent"
                                  name={item.name}
                                  scheme={colorScheme}
                                  textColor={theme.text}
                                  mutedColor={theme.textMuted}
                                  onPress={() =>
                                    handleSuggestionPress(
                                      item.name,
                                      item.coords || { latitude: 48.8566, longitude: 2.3522 }
                                    )
                                  }
                                />
                              ))}
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
                          {dynamicSuggestions &&
                            dynamicSuggestions
                              .filter((item) => item && item.name)
                              .map((item, index) => (
                                <PlaceSuggestionRow
                                  key={`suggest-${item.name}-${index}`}
                                  kind={item.kind}
                                  name={item.name}
                                  dept={item.dept}
                                  scheme={colorScheme}
                                  textColor={theme.text}
                                  mutedColor={theme.textMuted}
                                  onPress={() =>
                                    handleSuggestionPress(
                                      item.name,
                                      item.coords || { latitude: 48.8566, longitude: 2.3522 }
                                    )
                                  }
                                />
                              ))}
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
  filtersCardCollapsed: {
    // Header only: 16 (padding) + 42 (cardHeader) + 16 = FILTERS_COLLAPSED_HEIGHT.
    flex: 0,
    paddingBottom: 16,
  },
  filtersCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Affordance label replacing the accordion chevrons.
  accordionHint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
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
    left: -16,
    right: -16,
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
    height: 42,
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
    ...Platform.select({
      ios: {
        paddingTop: 8,
        paddingBottom: 4,
      },
    }),
  },
  collapsedSearchTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
  },
  collapsedSearchFilledValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
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
    height: 54,
    borderRadius: 24,
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
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
      android: {
        paddingVertical: 8,
      },
    }),
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
  noResultsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
  },
  segmentLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  segmentSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 9,
    marginTop: 1,
  },
});
