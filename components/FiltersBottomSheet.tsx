import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import FiltersForm from '@/components/FiltersForm';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';

export interface FiltersBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

const FiltersBottomSheetRender: React.ForwardRefRenderFunction<
  FiltersBottomSheetRef,
  any
> = (_, ref) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BaseBottomSheetModalRef>(null);

  const {
    hikes,
    searchQuery,
    userLocation,
    userLocationName,
    getTransitInfo,
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
  } = useAdventure();

  // Local state initialized on present
  const [localDifficulties, setLocalDifficulties] = useState<string[]>([]);
  const [trainRange, setTrainRange] = useState<[number, number]>([0, 180]);
  const [distanceRange, setDistanceRange] = useState<[number, number]>([0, 34]);
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 4500]);
  const [highestPointRange, setHighestPointRange] = useState<[number, number]>([0, 4500]);
  const [geographicZone, setGeographicZone] = useState<string>('idf');
  const [localDogs, setLocalDogs] = useState(false);
  const [localKids, setLocalKids] = useState(false);
  const [wheelchairFriendly, setWheelchairFriendly] = useState(false);
  const [localActivityTypes, setLocalActivityTypes] = useState<string[]>([]);
  const [localPointsOfInterest, setLocalPointsOfInterest] = useState<string[]>([]);
  const [parcoursType, setParcoursType] = useState<string[]>([]);
  const [frequentation, setFrequentation] = useState<string[]>([]);
  const [communityNote, setCommunityNote] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      setLocalDifficulties(selectedDifficulties);
      setTrainRange([0, maxTrainDuration !== null ? maxTrainDuration : 180]);
      setDistanceRange([0, maxDistance !== null ? maxDistance : 34]);
      setElevationRange([0, maxElevation !== null ? maxElevation : 4500]);
      setLocalDogs(dogsAllowed);
      setLocalKids(kidsFriendly);
      setLocalActivityTypes(selectedActivityTypes);
      setLocalPointsOfInterest(selectedPointsOfInterest);
      bottomSheetModalRef.current?.present();
    },
    dismiss: () => {
      bottomSheetModalRef.current?.dismiss();
    },
  }));

  const handleApply = () => {
    setMaxTrainDuration(trainRange[1] >= 180 ? null : trainRange[1]);
    setMaxDistance(distanceRange[1] >= 34 ? null : distanceRange[1]);
    setMaxElevation(elevationRange[1] >= 4500 ? null : elevationRange[1]);
    setSelectedDifficulties(localDifficulties);
    setDogsAllowed(localDogs);
    setKidsFriendly(localKids);
    setSelectedActivityTypes(localActivityTypes);
    setSelectedPointsOfInterest(localPointsOfInterest);
    bottomSheetModalRef.current?.dismiss();
  };

  const handleReset = () => {
    setLocalDifficulties([]);
    setTrainRange([0, 180]);
    setDistanceRange([0, 34]);
    setElevationRange([0, 4500]);
    setHighestPointRange([0, 4500]);
    setGeographicZone('idf');
    setLocalDogs(false);
    setLocalKids(false);
    setWheelchairFriendly(false);
    setLocalActivityTypes([]);
    setLocalPointsOfInterest([]);
    setParcoursType([]);
    setFrequentation([]);
    setCommunityNote(null);
    clearAllFilters();
    bottomSheetModalRef.current?.dismiss();
  };

  // Local toggling helpers removed as they are managed inside FiltersForm

  // Real-time results count calculation
  const localFilteredHikesCount = useMemo(() => {
    let filtered = hikes.filter((rando) => {
      // 1. Text Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const locName = userLocationName.toLowerCase().trim();
        const isUserLocationSearch =
          query === 'à proximité' ||
          query === 'a proximité' ||
          query === 'proximité' ||
          query === locName;

        if (isUserLocationSearch) {
          const lat = rando?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
          const lng = rando?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
          const dist = calculateDistanceKm(
            userLocation?.latitude ?? 48.8566,
            userLocation?.longitude ?? 2.3522,
            lat,
            lng
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

    return filtered.length;
  }, [
    hikes,
    searchQuery,
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

  const snapPoints = useMemo(() => ['92%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const formatTrainLabel = (val: number) => {
    if (val >= 180) return 'Toutes';
    if (val >= 60) {
      const h = Math.floor(val / 60);
      const m = val % 60;
      return m > 0 ? `${h}h${m}` : `${h}h`;
    }
    return `${val} min`;
  };

  const getResultsButtonTitle = () => {
    if (localFilteredHikesCount === 0) return 'Aucune rando trouvée';
    if (localFilteredHikesCount === 1) return 'Afficher 1 résultat';
    return `Afficher les ${localFilteredHikesCount} résultats`;
  };

  return (
    <BaseBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['92%']}
      showHeader={true}
      title="Filtres"
      showCloseButton={true}
      backdropOpacity={0.5}
      contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 0, flex: 1 }}>
      <View style={{ flex: 1 }}>

        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}>
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
        </BottomSheetScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.background }]}>
          <Button
            variant="text"
            title="Tout effacer"
            onPress={handleReset}
            style={styles.resetButton}
          />
          <Button
            variant="primary"
            title={getResultsButtonTitle()}
            onPress={handleApply}
            style={styles.applyButton}
          />
        </View>
      </View>
    </BaseBottomSheetModal>
  );
};

const FiltersBottomSheet = forwardRef(FiltersBottomSheetRender);
FiltersBottomSheet.displayName = 'FiltersBottomSheet';

export default FiltersBottomSheet;

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 12,
  },
  handle: {
    width: 33,
    height: 4,
    borderRadius: 16777200,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 30,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: '#000000',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  resetButton: {
    paddingHorizontal: 12,
  },
  applyButton: {
    flex: 1,
  },
});
