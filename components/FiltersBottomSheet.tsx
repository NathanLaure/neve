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
  View,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm, type RandoData } from '@/context/AdventureContext';
import FiltersForm from '@/components/FiltersForm';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { useScrollFade } from '@/components/ScrollFade';
import { DIFFICULTIES, isDifficultyFilterActive } from '@/constants/Filters';

export interface FiltersBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

export interface FiltersBottomSheetProps {
  baseHikes?: RandoData[];
}

const FiltersBottomSheetRender: React.ForwardRefRenderFunction<
  FiltersBottomSheetRef,
  FiltersBottomSheetProps
> = ({ baseHikes }, ref) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const bottomSheetModalRef = useRef<BaseBottomSheetModalRef>(null);
  // Le pied de page ne porte son ombre que tant qu'il reste du contenu dessous.
  const { hasMore, scrollProps } = useScrollFade();

  const {
    hikes,
    searchQuery,
    userLocation,
    userLocationName,
    getTransitInfo,
    selectedDifficulties,
    setSelectedDifficulties,
    minTrainDuration,
    setMinTrainDuration,
    maxTrainDuration,
    setMaxTrainDuration,
    minDistance,
    setMinDistance,
    maxDistance,
    setMaxDistance,
    minElevation,
    setMinElevation,
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
    isMapAreaActive,
    clearAllFilters,
  } = useAdventure();

  // Local state initialized on present
  const [localDifficulties, setLocalDifficulties] = useState<string[]>([...DIFFICULTIES]);
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
      /* Les deux bornes sont relues : rouvrir la feuille doit montrer la plage
         réellement appliquée, pas seulement son plafond. */
      setTrainRange([minTrainDuration ?? 0, maxTrainDuration ?? 180]);
      setDistanceRange([minDistance ?? 0, maxDistance ?? 34]);
      setElevationRange([minElevation ?? 0, maxElevation ?? 4500]);
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
    /* Une borne posée sur la butée ne filtre rien : on la traduit en `null`
       plutôt qu'en 0 ou en maximum, pour que le compteur de filtres actifs ne
       compte pas une plage qui laisse tout passer. */
    setMinTrainDuration(trainRange[0] <= 0 ? null : trainRange[0]);
    setMaxTrainDuration(trainRange[1] >= 180 ? null : trainRange[1]);
    setMinDistance(distanceRange[0] <= 0 ? null : distanceRange[0]);
    setMaxDistance(distanceRange[1] >= 34 ? null : distanceRange[1]);
    setMinElevation(elevationRange[0] <= 0 ? null : elevationRange[0]);
    setMaxElevation(elevationRange[1] >= 4500 ? null : elevationRange[1]);
    setSelectedDifficulties(localDifficulties);
    setDogsAllowed(localDogs);
    setKidsFriendly(localKids);
    setSelectedActivityTypes(localActivityTypes);
    setSelectedPointsOfInterest(localPointsOfInterest);
    bottomSheetModalRef.current?.dismiss();
  };

  const handleReset = () => {
    setLocalDifficulties([...DIFFICULTIES]);
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
    const sourceHikes = baseHikes ?? hikes;

    let filtered = sourceHikes.filter((rando) => {
      // 0. Base geographic / radius filtering if baseHikes wasn't explicitly provided
      if (!baseHikes) {
        if (!isMapAreaActive) {
          const activeRadius = searchRadiusKm ?? 5;
          const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
          const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
          const dist = calculateDistanceKm(
            userLocation?.latitude ?? 48.8566,
            userLocation?.longitude ?? 2.3522,
            randoLat,
            randoLng
          );
          if (dist > activeRadius) return false;
        }
      }

      // 1. Text Search query
      if (searchQuery && !isMapAreaActive) {
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
      if (isDifficultyFilterActive(localDifficulties)) {
        const randoDiffNorm = (rando.difficulty || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hasMatch = localDifficulties.some((d) => {
          const dNorm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return randoDiffNorm.includes(dNorm) || dNorm.includes(randoDiffNorm);
        });
        if (!hasMatch) return false;
      }

      // 3. Hike Distance
      const maxDistVal = distanceRange[1] >= 34 ? null : distanceRange[1];
      const minDistVal = distanceRange[0] <= 0 ? null : distanceRange[0];
      if (maxDistVal !== null || minDistVal !== null) {
        const distNum = (rando as any).distance_km ?? parseFloat(rando.distance);
        if (!isNaN(distNum)) {
          if (maxDistVal !== null && distNum > maxDistVal) return false;
          if (minDistVal !== null && distNum < minDistVal) return false;
        }
      }

      // 4. Hike Elevation
      const maxElevVal = elevationRange[1] >= 4500 ? null : elevationRange[1];
      const minElevVal = elevationRange[0] <= 0 ? null : elevationRange[0];
      if (maxElevVal !== null || minElevVal !== null) {
        const elevMatch = rando.elevation ? rando.elevation.match(/\d+/) : null;
        const elevNum = (rando as any).elevation_gain_m ?? (elevMatch ? parseInt(elevMatch[0], 10) : 0);
        if (maxElevVal !== null && elevNum > maxElevVal) return false;
        if (minElevVal !== null && elevNum < minElevVal) return false;
      }

      // 5. Train Duration (Transit time)
      const maxTrainVal = trainRange[1] >= 180 ? null : trainRange[1];
      const minTrainVal = trainRange[0] <= 0 ? null : trainRange[0];
      if (maxTrainVal !== null || minTrainVal !== null) {
        const transitInfo = getTransitInfo(rando);
        const minutes = transitInfo.durationMinutes;
        if (maxTrainVal !== null && minutes > maxTrainVal) return false;
        if (minTrainVal !== null && minutes < minTrainVal) return false;
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
        const hasMatch = rando.pointsOfInterest.some((poi: string) => localPointsOfInterest.includes(poi));
        if (!hasMatch) return false;
      }

      return true;
    });

    return filtered.length;
  }, [
    baseHikes,
    hikes,
    searchRadiusKm,
    isMapAreaActive,
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
      snapPoints={['100%']}
      title="Filtres"
      showCloseButton={true}
      backdropOpacity={0.5}
      scrollableBody
      footerShadow={hasMore}
      secondaryButtonTitle="Réinitialiser"
      onSecondaryPress={handleReset}
      primaryButtonTitle={getResultsButtonTitle()}
      onPrimaryPress={handleApply}>
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        {...scrollProps}>
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
          showTrainRange={false}
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
    </BaseBottomSheetModal>
  );
};

const FiltersBottomSheet = forwardRef(FiltersBottomSheetRender);
FiltersBottomSheet.displayName = 'FiltersBottomSheet';

export default FiltersBottomSheet;

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
});
