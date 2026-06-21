import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Building2,
  CableCar,
  TreePine,
  RotateCcw,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';

// Popular suggestions for the "Where" section
const SUGGESTIONS = [
  { name: 'Annecy', dept: 'Haute-Savoie, France', icon: Building2 },
  { name: 'Chamonix', dept: 'Haute-Savoie, France', icon: CableCar },
  { name: 'Grenoble', dept: 'Isère, France', icon: Building2 },
  { name: 'Aix-les-Bains', dept: 'Savoie, France', icon: TreePine },
  { name: 'Échirolles', dept: 'Isère, France', icon: TreePine },
  { name: 'Albertville', dept: 'Savoie, France', icon: Building2 },
];

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

// Helper Double-Handle Range Slider Component
interface RangeSliderProps {
  min: number;
  max: number;
  values: [number, number];
  onChange: (vals: [number, number]) => void;
  unit: string;
}

function RangeSlider({ min, max, values, onChange, unit }: RangeSliderProps) {
  const [width, setWidth] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const activeHandle = useRef<'min' | 'max' | null>(null);

  // Sync parameters to refs so that PanResponder does not read render-scoped variables directly
  const valuesRef = useRef(values);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const widthRef = useRef(width);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valuesRef.current = values;
    minRef.current = min;
    maxRef.current = max;
    widthRef.current = width;
    onChangeRef.current = onChange;
  });

  const [panResponder, setPanResponder] = useState<any>(null);

  useEffect(() => {
    setPanResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const w = widthRef.current;
          if (w <= 0) return;
          const touchVal = minRef.current + (touchX / w) * (maxRef.current - minRef.current);
          const distMin = Math.abs(touchVal - valuesRef.current[0]);
          const distMax = Math.abs(touchVal - valuesRef.current[1]);
          activeHandle.current = distMin < distMax ? 'min' : 'max';

          // Trigger layout touch handler immediately
          const percentage = Math.max(0, Math.min(1, touchX / w));
          const rawVal = minRef.current + percentage * (maxRef.current - minRef.current);
          const roundedVal = Math.round(rawVal);
          if (activeHandle.current === 'min') {
            onChangeRef.current([
              Math.max(minRef.current, Math.min(roundedVal, valuesRef.current[1] - 1)),
              valuesRef.current[1],
            ]);
          } else {
            onChangeRef.current([
              valuesRef.current[0],
              Math.max(valuesRef.current[0] + 1, Math.min(roundedVal, maxRef.current)),
            ]);
          }
        },
        onPanResponderMove: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const w = widthRef.current;
          if (w <= 0 || !activeHandle.current) return;
          const percentage = Math.max(0, Math.min(1, touchX / w));
          const rawVal = minRef.current + percentage * (maxRef.current - minRef.current);
          const roundedVal = Math.round(rawVal);
          if (activeHandle.current === 'min') {
            onChangeRef.current([
              Math.max(minRef.current, Math.min(roundedVal, valuesRef.current[1] - 1)),
              valuesRef.current[1],
            ]);
          } else {
            onChangeRef.current([
              valuesRef.current[0],
              Math.max(valuesRef.current[0] + 1, Math.min(roundedVal, maxRef.current)),
            ]);
          }
        },
        onPanResponderRelease: () => {
          activeHandle.current = null;
        },
      })
    );
  }, []);

  const pctMin = ((values[0] - min) / (max - min)) * 100;
  const pctMax = ((values[1] - min) / (max - min)) * 100;

  return (
    <View
      style={styles.sliderWrapper}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...(panResponder ? panResponder.panHandlers : {})}>
      <View style={[styles.sliderTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.sliderActiveTrack,
            {
              left: `${pctMin}%`,
              width: `${pctMax - pctMin}%`,
              backgroundColor: theme.text,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${pctMin}%`,
              backgroundColor: theme.text,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${pctMax}%`,
              backgroundColor: theme.text,
            },
          ]}
        />
      </View>
    </View>
  );
}

// Helper Custom Toggle Switch Component
interface CustomSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

function CustomSwitch({ value, onValueChange }: CustomSwitchProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[
        styles.switchContainer,
        {
          backgroundColor: value ? '#217a4d' : theme.tabIconDefault,
          justifyContent: value ? 'flex-end' : 'flex-start',
        },
      ]}>
      <View style={[styles.switchKnob, { backgroundColor: '#FFFFFF' }]} />
    </Pressable>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SearchModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Animated value to slide up ONLY the content card/container
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  // Animated value for background fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate content up and fade background in on mount
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = () => {
    // Animate content down and fade background out on close, then navigate back
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  useEffect(() => {
    const onBackPress = () => {
      handleClose();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, []);

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
    getTransitInfo,
  } = useAdventure();

  // Local state initialized from global context on mount
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDifficulties, setLocalDifficulties] = useState<string[]>(selectedDifficulties);
  const [localDogs, setLocalDogs] = useState(dogsAllowed);
  const [localKids, setLocalKids] = useState(kidsFriendly);
  const [localActivityTypes, setLocalActivityTypes] = useState<string[]>(selectedActivityTypes);
  const [localPointsOfInterest, setLocalPointsOfInterest] = useState<string[]>(selectedPointsOfInterest);

  // Search Collapsed logic: collapses when a query is set
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(!!localSearch);

  // Sliders range states (locally mapping min/max values to fit double handles)
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
    maxElevation !== null ? maxElevation : 1500,
  ]);

  const handleApplyFilters = () => {
    // Commit all local filter states to global context at once!
    setMaxTrainDuration(trainRange[1] >= 180 ? null : trainRange[1]);
    setMaxDistance(distanceRange[1] >= 34 ? null : distanceRange[1]);
    setMaxElevation(elevationRange[1] >= 1500 ? null : elevationRange[1]);
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
    setIsSearchCollapsed(false);
    setLocalDifficulties([]);
    setTrainRange([0, 180]);
    setDistanceRange([0, 34]);
    setElevationRange([0, 1500]);
    setLocalDogs(false);
    setLocalKids(false);
    setLocalActivityTypes([]);
    setLocalPointsOfInterest([]);
  };

  const handleSuggestionPress = (placeName: string) => {
    setLocalSearch(placeName);
    setIsSearchCollapsed(true);
    Keyboard.dismiss();
  };

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
    return hikes.filter((rando) => {
      // 1. Text Search query
      if (localSearch) {
        const query = localSearch.toLowerCase();
        const matchesText =
          rando.title?.toLowerCase().includes(query) ||
          rando.location?.toLowerCase().includes(query) ||
          rando.startStation?.toLowerCase().includes(query) ||
          rando.endStation?.toLowerCase().includes(query);
        if (!matchesText) return false;
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
      const maxElevVal = elevationRange[1] >= 1500 ? null : elevationRange[1];
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
        if (!rando.activityType || !localActivityTypes.includes(rando.activityType))
          return false;
      }

      // 9. Points of Interest
      if (localPointsOfInterest.length > 0) {
        if (!rando.pointsOfInterest) return false;
        const hasMatch = rando.pointsOfInterest.some((poi) =>
          localPointsOfInterest.includes(poi)
        );
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [
    hikes,
    localSearch,
    localDifficulties,
    distanceRange,
    elevationRange,
    trainRange,
    localDogs,
    localKids,
    localActivityTypes,
    localPointsOfInterest,
    getTransitInfo,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      localDifficulties.length > 0 ||
      trainRange[1] < 180 ||
      distanceRange[1] < 34 ||
      elevationRange[1] < 1500 ||
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
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            backgroundColor:
              Platform.OS === 'ios'
                ? 'transparent'
                : colorScheme === 'dark'
                  ? 'rgba(20, 20, 20, 0.85)'
                  : 'rgba(245, 245, 245, 0.85)',
          },
        ]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={75}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <Animated.View
          style={[
            styles.innerContainer,
            {
              paddingTop: insets.top + 16,
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
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
              <X size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            {/* WHERE SECTION */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {isSearchCollapsed ? (
                // Collapsed search bar UI
                <Pressable
                  onPress={() => setIsSearchCollapsed(false)}
                  style={styles.collapsedSearchContainer}>
                  <View style={styles.collapsedSearchLeft}>
                    <Text style={[styles.collapsedSearchTitle, { color: theme.text }]}>
                      Où va-t-on ?
                    </Text>
                    <Text
                      style={[styles.collapsedSearchValue, { color: theme.textMuted }]}
                      numberOfLines={1}>
                      {localSearch || 'Tout Explorer'}
                    </Text>
                  </View>
                  <View style={styles.chevronIcon}>
                    <ChevronDown size={20} color={theme.text} />
                  </View>
                </Pressable>
              ) : (
                // Expanded search bar UI
                <View style={styles.expandedSearchContainer}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Où va-t-on ?</Text>
                    {localSearch ? (
                      <Pressable onPress={() => setIsSearchCollapsed(true)}>
                        <ChevronUp size={20} color={theme.text} />
                      </Pressable>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.textInputWrapper,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    <Search size={18} color={theme.tabIconDefault} style={styles.searchIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      placeholder="Rechercher un lieu"
                      placeholderTextColor={theme.textMuted}
                      value={localSearch}
                      onChangeText={(text) => {
                        setLocalSearch(text);
                      }}
                      onSubmitEditing={() => {
                        if (localSearch) setIsSearchCollapsed(true);
                      }}
                    />
                    {localSearch ? (
                      <Pressable
                        onPress={() => {
                          setLocalSearch('');
                        }}
                        style={styles.clearSearchBtn}>
                        <X size={16} color={theme.text} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                    Suggestions
                  </Text>

                  <View style={styles.suggestionsContainer}>
                    {SUGGESTIONS.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = localSearch
                        .toLowerCase()
                        .includes(item.name.toLowerCase());
                      return (
                        <Pressable
                          key={item.name}
                          onPress={() => handleSuggestionPress(item.name)}
                          style={[
                            styles.suggestionRow,
                            isSelected && { backgroundColor: theme.brandSubtle, borderRadius: 8 },
                          ]}>
                          <IconComponent
                            size={20}
                            color={isSelected ? theme.primary : theme.text}
                          />
                          <View style={styles.suggestionTextRow}>
                            <Text
                              style={[
                                styles.suggestionName,
                                { color: isSelected ? theme.primary : theme.text },
                              ]}>
                              {item.name}
                            </Text>
                            <Text style={styles.suggestionSeparator}>·</Text>
                            <Text style={[styles.suggestionDept, { color: theme.textMuted }]}>
                              {item.dept}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* FILTERS SECTION */}
            <View style={[styles.card, { backgroundColor: theme.card, marginTop: 12 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Filtres</Text>
                {hasActiveFilters && (
                  <Pressable
                    onPress={handleClearFilters}
                    style={[
                      styles.clearFiltersBtn,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    <RotateCcw size={14} color={theme.text} />
                    <Text style={[styles.clearFiltersBtnText, { color: theme.text }]}>Effacer</Text>
                  </Pressable>
                )}
              </View>

              {/* Difficulty */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupTitle, { color: theme.text }]}>Difficulté</Text>
                <View style={styles.chipsRow}>
                  {/* Facile Chip */}
                  <Pressable
                    onPress={() => toggleDifficulty('Facile')}
                    style={[
                      styles.difficultyChip,
                      localDifficulties.includes('Facile')
                        ? {
                            backgroundColor: theme.statusBgSuccess,
                            borderColor: theme.statusBgSuccess,
                          }
                        : {
                            backgroundColor: theme.statusBgSuccessSubtle,
                            borderColor: theme.statusBgSuccess,
                          },
                    ]}>
                    <Text
                      style={[
                        styles.difficultyChipText,
                        localDifficulties.includes('Facile')
                          ? { color: '#FFFFFF', fontFamily: 'Satoshi-Bold' }
                          : { color: theme.statusTextSuccess },
                      ]}>
                      🟢 Facile
                    </Text>
                  </Pressable>

                  {/* Modéré Chip */}
                  <Pressable
                    onPress={() => toggleDifficulty('Modéré')}
                    style={[
                      styles.difficultyChip,
                      localDifficulties.includes('Modéré')
                        ? {
                            backgroundColor: theme.statusBgWarning,
                            borderColor: theme.statusBgWarning,
                          }
                        : {
                            backgroundColor: theme.statusBgWarningSubtle,
                            borderColor: theme.statusBgWarning,
                          },
                    ]}>
                    <Text
                      style={[
                        styles.difficultyChipText,
                        localDifficulties.includes('Modéré')
                          ? { color: '#FFFFFF', fontFamily: 'Satoshi-Bold' }
                          : { color: theme.statusTextWarning },
                      ]}>
                      🟡 Modéré
                    </Text>
                  </Pressable>

                  {/* Difficile Chip */}
                  <Pressable
                    onPress={() => toggleDifficulty('Difficile')}
                    style={[
                      styles.difficultyChip,
                      localDifficulties.includes('Difficile')
                        ? {
                            backgroundColor: theme.statusBgError,
                            borderColor: theme.statusBgError,
                          }
                        : {
                            backgroundColor: theme.statusBgErrorSubtle,
                            borderColor: theme.statusBgError,
                          },
                    ]}>
                    <Text
                      style={[
                        styles.difficultyChipText,
                        localDifficulties.includes('Difficile')
                          ? { color: '#FFFFFF', fontFamily: 'Satoshi-Bold' }
                          : { color: theme.statusTextError },
                      ]}>
                      🔴 Difficile
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Train Duration Slider */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <View>
                    <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                      Temps de transport
                    </Text>
                    <Text style={styles.filterOriginText}>
                      Depuis <Text style={{ fontWeight: '700' }}>{userLocationName}</Text>
                    </Text>
                  </View>
                  <Text style={[styles.filterValueText, { color: theme.text }]}>
                    {trainRange[0]}-{formatTrainLabel(trainRange[1])}
                  </Text>
                </View>
                <RangeSlider
                  min={0}
                  max={180}
                  values={trainRange}
                  onChange={setTrainRange}
                  unit="min"
                />
              </View>

              {/* Distance Slider */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                    Distance du parcours
                  </Text>
                  <Text style={[styles.filterValueText, { color: theme.text }]}>
                    {distanceRange[0]}-
                    {distanceRange[1] === 34 ? 'Toutes' : `${distanceRange[1]} km`}
                  </Text>
                </View>
                <RangeSlider
                  min={0}
                  max={34}
                  values={distanceRange}
                  onChange={setDistanceRange}
                  unit="km"
                />
              </View>

              {/* Elevation Slider */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                    Dénivelé positif
                  </Text>
                  <Text style={[styles.filterValueText, { color: theme.text }]}>
                    {elevationRange[0]}-
                    {elevationRange[1] === 1500 ? 'Tous' : `${elevationRange[1]} m+`}
                  </Text>
                </View>
                <RangeSlider
                  min={0}
                  max={1500}
                  values={elevationRange}
                  onChange={setElevationRange}
                  unit="m+"
                />
              </View>

              {/* Toggles (Dogs & Kids) */}
              <View
                style={[
                  styles.toggleRow,
                  { borderTopWidth: 1, borderColor: theme.border, paddingTop: 16 },
                ]}>
                <View style={styles.toggleLeft}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>
                    Accessible aux chiens
                  </Text>
                </View>
                <CustomSwitch value={localDogs} onValueChange={setLocalDogs} />
              </View>

              <View style={[styles.toggleRow, { marginTop: 12 }]}>
                <View style={styles.toggleLeft}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>
                    Convient aux enfants
                  </Text>
                </View>
                <CustomSwitch value={localKids} onValueChange={setLocalKids} />
              </View>

              {/* Activity Types Grid */}
              <View
                style={[
                  styles.filterGroup,
                  { borderTopWidth: 1, borderColor: theme.border, paddingTop: 16, marginTop: 16 },
                ]}>
                <Text style={[styles.filterGroupTitle, { color: theme.text }]}>
                  Type d’activité
                </Text>
                <View style={styles.chipsWrapRow}>
                  {ACTIVITY_TYPES.map((act) => {
                    const isSelected = localActivityTypes.includes(act);
                    return (
                      <Pressable
                        key={act}
                        onPress={() => toggleActivity(act)}
                        style={[
                          styles.tagChip,
                          isSelected
                            ? { backgroundColor: theme.primary, borderColor: theme.primary }
                            : { backgroundColor: theme.background, borderColor: theme.border },
                        ]}>
                        <Text
                          style={[
                            styles.tagChipText,
                            isSelected ? { color: '#FFFFFF' } : { color: theme.text },
                          ]}>
                          {act}
                        </Text>
                      </Pressable>
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
                      <Pressable
                        key={poi}
                        onPress={() => togglePOI(poi)}
                        style={[
                          styles.tagChip,
                          isSelected
                            ? { backgroundColor: theme.primary, borderColor: theme.primary }
                            : { backgroundColor: theme.background, borderColor: theme.border },
                        ]}>
                        <Text
                          style={[
                            styles.tagChipText,
                            isSelected ? { color: '#FFFFFF' } : { color: theme.text },
                          ]}>
                          {poi}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Footer Action Button */}
          <View style={[styles.footerContainer, { borderTopWidth: 1, borderColor: theme.border }]}>
            <Pressable
              onPress={handleApplyFilters}
              disabled={localFilteredHikes.length === 0}
              style={({ pressed }) => [
                styles.applyBtn,
                { backgroundColor: theme.primary },
                localFilteredHikes.length === 0 && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}>
              <Text style={styles.applyBtnText}>
                {localFilteredHikes.length === 0
                  ? 'Aucun résultat'
                  : localFilteredHikes.length === 1
                    ? 'Voir la randonnée'
                    : `Voir les ${localFilteredHikes.length} randonnées`}
              </Text>
            </Pressable>
          </View>
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
  scrollView: {
    flex: 1,
    width: '100%',
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
    fontSize: 20,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 18,
    letterSpacing: -0.3,
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
  chevronIcon: {
    padding: 4,
  },
  expandedSearchContainer: {
    width: '100%',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
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
    fontSize: 14,
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 10,
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
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearFiltersBtnText: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 11,
  },
  filterGroup: {
    marginBottom: 20,
    width: '100%',
  },
  filterGroupTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
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
    fontSize: 10,
    color: '#7c7c7c',
    marginTop: -8,
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
  difficultyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  difficultyChipText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagChipText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    width: '100%',
  },
  toggleLeft: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  switchContainer: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  applyBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  sliderWrapper: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    position: 'relative',
  },
  sliderActiveTrack: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
