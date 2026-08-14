import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import Colors from '@/constants/Colors';
import Skeleton from '@/components/Skeleton';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { usePlanDraft } from '@/context/PlanDraftContext';
import { formatDateRangeSummary } from '@/components/plan/DateRangeCalendar';
import {
  fetchTransitOptionsWithFallback,
  parseCoordinates,
  getRecommendedOptionIndex,
  getAvailableTransportModes,
  filterOptionsByTransportModes,
  formatTransportModesSummary,
  Disruption,
  TransitOption,
  TransitTransportMode,
} from '@/services/transitService';
import { OutwardHeader } from '@/components/plan/OutwardHeader';
import { SearchTransportCard } from '@/components/plan/SearchTransportCard';
import { RecommendedWrapper } from '@/components/plan/RecommendedWrapper';
import { ItineraryCard, DeparturePoint } from '@/components/plan/ItineraryCard';
import DatePhasePillRow from '@/components/plan/DatePhasePillRow';
import FilterChip from '@/components/plan/FilterChip';
import TransportModeSheet from '@/components/plan/TransportModeSheet';
import DisruptionsBottomSheet from '@/components/plan/DisruptionsBottomSheet';
import JourneyDetailSheet from '@/components/plan/JourneyDetailSheet';
import DeparturePointSheet from '@/components/plan/DeparturePointSheet';
import JourneyOptionsSheet from '@/components/plan/JourneyOptionsSheet';
import TimePickerSheet from '@/components/plan/TimePickerSheet';
import PassengersBottomSheet from '@/components/plan/PassengersBottomSheet';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { Passenger, createDefaultPassengers, formatPassengerCount } from '@/types/passenger';

/** Repli si l'écran est atteint sans la liste détaillée (deep link). */
function parsePassengersParam(json?: string): Passenger[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** « 16h » ou « 16h30 » — jamais « 16:00 », qui ne colle pas au reste de l'écran. */
function formatHourLabel(time: string): string {
  const [h, m] = time.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

export default function ReturnPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const disruptionsSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const departureSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const returnSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const journeyOptionsSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const timeSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const transportModeSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const passengersSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  const journeyDetailSheetRef = React.useRef<BaseBottomSheetModalRef>(null);

  const params = useLocalSearchParams<{
    randoId?: string;
    outwardId?: string;
    departureName?: string;
    departureLat?: string;
    departureLng?: string;
    returnName?: string;
    returnLat?: string;
    returnLng?: string;
    outwardDate?: string;
    returnDate?: string;
    returnTime?: string;
    passengersCount?: string;
    passengers?: string;
    isReversed?: string;
  }>();

  const { hikes, userLocationName, userLocation } = useAdventure();
  const { draft } = usePlanDraft();

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  // Sens de parcours, éditable ici via la feuille d'options (Figma : bouton
  // d'inversion des gares A/B de la carte d'itinéraire).
  const [isReversed, setIsReversed] = useState(params.isReversed === 'true');

  const isTraverse = !!rando && !!rando.endStation && rando.startStation !== rando.endStation;

  // Sur l'écran retour, la carte garde le même sens de lecture Départ → Fin du
  // sentier que sur l'aller : c'est la station de retour (repli du départ) qui
  // porte le trajet réellement cherché ici, pas ces deux étapes.
  const arrivalStation = useMemo(
    () =>
      isReversed && rando
        ? { name: rando.endStation, coords: rando.endStationCoords }
        : { name: rando?.startStation ?? '', coords: rando?.startStationCoords },
    [isReversed, rando]
  );
  const departBackStation = useMemo(
    () =>
      isReversed && rando
        ? { name: rando.startStation, coords: rando.startStationCoords }
        : { name: rando?.endStation ?? '', coords: rando?.endStationCoords },
    [isReversed, rando]
  );

  const gpsDeparture: DeparturePoint = useMemo(
    () => ({
      name: userLocationName,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }),
    [userLocationName, userLocation.latitude, userLocation.longitude]
  );

  // Départ du trajet complet, tel que posé (ou édité) sur l'écran aller.
  const paramsDeparturePoint: DeparturePoint = useMemo(() => {
    const coords = parseCoordinates(params.departureLat, params.departureLng) ?? userLocation;
    return {
      name: params.departureName || userLocationName || 'Paris',
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }, [params.departureName, params.departureLat, params.departureLng, userLocationName, userLocation]);

  const [customDeparture, setCustomDeparture] = useState<DeparturePoint | null>(null);
  const departurePoint = customDeparture ?? paramsDeparturePoint;

  // Lieu où l'on rentre, quand il diffère du départ — sinon `returnLat/returnLng`
  // n'est qu'une copie du départ, indiscernable en coordonnées.
  const [returnPoint, setReturnPoint] = useState<DeparturePoint | null>(() => {
    const retCoords = parseCoordinates(params.returnLat, params.returnLng);
    const sameAsDeparture =
      params.returnLat === params.departureLat && params.returnLng === params.departureLng;
    if (!retCoords || sameAsDeparture) return null;
    return { name: params.returnName || '', latitude: retCoords.latitude, longitude: retCoords.longitude };
  });
  const arrivalPoint = returnPoint ?? departurePoint;

  const outwardDateValue = draft.startDate || params.outwardDate || null;
  const returnDate = draft.tripType === 'oneway'
    ? outwardDateValue
    : draft.endDate || params.returnDate || outwardDateValue || new Date().toISOString().split('T')[0];

  // Heure de retour : propre à cet écran, pas de pendant dans le brouillon
  // partagé (voir PlanDraftContext) — elle vient du calcul fait sur l'aller et
  // ne se réajuste ici que localement.
  const [returnTime, setReturnTime] = useState(params.returnTime || '16:00');

  // Liste détaillée si elle a suivi depuis l'écran aller (repli sur un unique
  // passager) : c'est elle qui permet la modification/ajout depuis la puce.
  const [passengers, setPassengers] = useState<Passenger[]>(
    () => parsePassengersParam(params.passengers) ?? createDefaultPassengers()
  );
  const passengersCountText = formatPassengerCount(passengers);

  // State transit
  const [options, setOptions] = useState<TransitOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Perturbations de l'itinéraire dont on a ouvert le détail : la sheet est
  // partagée entre toutes les cartes.
  const [openedDisruptions, setOpenedDisruptions] = useState<Disruption[]>([]);
  // Itinéraire dont la feuille de détail est ouverte : c'est depuis elle, et
  // non depuis la carte, que le retour s'engage.
  const [detailedOption, setDetailedOption] = useState<TransitOption | null>(null);

  // Filtre par mode de transport, réinitialisé à « tout coché » à chaque
  // nouvelle recherche — voir l'effet plus bas.
  const [selectedModes, setSelectedModes] = useState<Set<TransitTransportMode>>(new Set());

  // Animation scroll
  const scrollY = useSharedValue(0);
  const cardHeight = useSharedValue(0);

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const loadTransit = async () => {
    setIsLoading(true);
    try {
      if (rando && returnDate) {
        const endsWhereItStarted =
          rando.routeType === 'boucle' || rando.routeType === 'aller_retour';
        // Pas de coordonnée précise pour la fin du sentier dans le modèle de
        // données (seul `start_lat/start_lng` existe) : elle ne s'applique que
        // lorsque le retour part effectivement de ce point-là — sens inversé,
        // ou boucle/aller-retour qui revient par le même endroit.
        const stationCoords = departBackStation.coords;
        const trailhead = isReversed
          ? rando.start_lat != null && rando.start_lng != null
            ? { latitude: rando.start_lat, longitude: rando.start_lng }
            : stationCoords
          : endsWhereItStarted && rando.start_lat != null && rando.start_lng != null
            ? { latitude: rando.start_lat, longitude: rando.start_lng }
            : stationCoords;

        const baseQuery = {
          to: { latitude: arrivalPoint.latitude, longitude: arrivalPoint.longitude },
          fromName: departBackStation.name,
          toName: arrivalPoint.name,
          date: returnDate,
          time: returnTime,
          direction: 'back' as const,
        };

        const result = await fetchTransitOptionsWithFallback(
          { ...baseQuery, from: trailhead },
          // Repli : depuis un sentier isolé, le calculateur peut ne rien trouver.
          { ...baseQuery, from: stationCoords }
        );
        setOptions(result.options);
        // Le filtre repart de « tout coché » à chaque nouvelle liste : une
        // exclusion posée pour une recherche n'a pas de sens pour la suivante.
        setSelectedModes(new Set(getAvailableTransportModes(result.options)));
      }
    } catch (err) {
      console.error('Error fetching return transit options:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransit();
    // Primitives et non les objets `arrivalPoint` / `departBackStation`, recréés
    // à chaque rendu.
  }, [
    rando?.id,
    returnDate,
    returnTime,
    arrivalPoint.name,
    arrivalPoint.latitude,
    arrivalPoint.longitude,
    isReversed,
  ]);

  const handleOpenDetails = (option: TransitOption) => {
    setDetailedOption(option);
    journeyDetailSheetRef.current?.present();
  };

  const handleConfirmOption = (option: TransitOption) => {
    setSelectedId(option.id);
    journeyDetailSheetRef.current?.dismiss();
    // Rediriger vers l'écran récapitulatif
    router.push({
      pathname: '/recap',
      params: {
        randoId: rando?.id,
        outwardId: params.outwardId,
        returnId: option.id,
      },
    });
  };

  const availableModes = useMemo(() => getAvailableTransportModes(options), [options]);
  const modeFilteredOptions = useMemo(
    () => filterOptionsByTransportModes(options, selectedModes),
    [options, selectedModes]
  );

  const sortedOptions = useMemo(() => {
    if (modeFilteredOptions.length <= 1) return modeFilteredOptions;
    const recIndex = getRecommendedOptionIndex(modeFilteredOptions);
    if (recIndex <= 0) return modeFilteredOptions;
    const recommended = modeFilteredOptions[recIndex];
    const rest = modeFilteredOptions.filter((_, idx) => idx !== recIndex);
    return [recommended, ...rest];
  }, [modeFilteredOptions]);

  const outwardDateLabel = outwardDateValue ? formatDateRangeSummary(outwardDateValue, outwardDateValue) : '—';
  const returnDateLabel = returnDate ? formatDateRangeSummary(returnDate, returnDate) : null;

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Barre d'actions animée, fixe */}
        <OutwardHeader
          departureName={departBackStation.name}
          destinationName={arrivalPoint.name}
          dateFormatted={returnDateLabel ?? ''}
          timeFormatted={formatHourLabel(returnTime)}
          passengersCountText={passengersCountText}
          onBack={() => router.back()}
          onPressPassengers={() => passengersSheetRef.current?.present()}
          scrollY={scrollY}
          cardHeight={cardHeight}
        />

        {/* Corps défilant : carte d'itinéraire, pills, chips puis résultats — le
            défileur natif fait sortir le bloc du haut sous la barre d'actions,
            voir le commentaire équivalent dans app/plan.tsx. */}
        <Animated.ScrollView
          onScroll={onScrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadTransit();
              }}
              tintColor={theme.tint}
            />
          }>
          <View
            style={styles.headerBlock}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              // eslint-disable-next-line react-hooks/immutability -- shared value Reanimated, pas un état React
              if (height > 0) cardHeight.value = height;
            }}>
            <ItineraryCard
              isTraverse={isTraverse}
              departurePoint={departurePoint}
              returnPoint={returnPoint}
              arrivalStation={arrivalStation}
              departBackStation={departBackStation}
              onPressDeparture={() => departureSheetRef.current?.present()}
              onPressReturnPoint={() => returnSheetRef.current?.present()}
              onClearReturnPoint={() => setReturnPoint(null)}
              onPressOptions={() => journeyOptionsSheetRef.current?.present()}
              onSwapStations={() => setIsReversed((value) => !value)}
            />

            <DatePhasePillRow
              activePhase="return"
              outwardLabel={outwardDateLabel}
              returnLabel={returnDateLabel}
              onPress={() => router.push({ pathname: '/plan/dates', params: { randoId: rando?.id } })}
            />

            <View style={styles.filterRow}>
              <FilterChip
                label={`Départ à ${formatHourLabel(returnTime)}`}
                onPress={() => timeSheetRef.current?.present()}
              />
              <FilterChip
                label={formatTransportModesSummary(Array.from(selectedModes), availableModes)}
                onPress={() => transportModeSheetRef.current?.present()}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} width="100%" height={120} style={styles.skeletonCard} />
              ))}
            </View>
          ) : sortedOptions.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {options.length === 0
                  ? 'Aucun itinéraire de retour trouvé pour cette date.'
                  : 'Aucun itinéraire ne correspond aux modes de transport sélectionnés.'}
              </Text>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
              {sortedOptions.map((option, index) => {
                const isRecommended = index === 0;
                const isSelected = selectedId === option.id;

                const cardProps = {
                  option,
                  isSelected,
                  onSelect: () => handleOpenDetails(option),
                  onPressPerturbations: () => {
                    setOpenedDisruptions(option.disruptions ?? []);
                    disruptionsSheetRef.current?.present();
                  },
                };

                if (isRecommended) {
                  return (
                    <RecommendedWrapper key={option.id}>
                      <SearchTransportCard {...cardProps} />
                    </RecommendedWrapper>
                  );
                }

                return <SearchTransportCard key={option.id} {...cardProps} />;
              })}
            </View>
          )}
        </Animated.ScrollView>
      </View>

      {/* Détail de l'itinéraire tapé, d'où le retour s'engage réellement. */}
      <JourneyDetailSheet
        ref={journeyDetailSheetRef}
        option={detailedOption}
        departureName={departBackStation.name}
        destinationName={arrivalPoint.name}
        primaryLabel="Choisir ce RETOUR"
        onConfirm={() => detailedOption && handleConfirmOption(detailedOption)}
      />

      {/* BottomSheetModal pour les détails des perturbations */}
      <DisruptionsBottomSheet
        ref={disruptionsSheetRef}
        disruptions={openedDisruptions}
        onDismiss={() => disruptionsSheetRef.current?.dismiss()}
      />

      <DeparturePointSheet
        ref={departureSheetRef}
        currentLocation={gpsDeparture}
        onSelect={(point) => {
          setCustomDeparture(point);
          departureSheetRef.current?.dismiss();
        }}
      />

      <DeparturePointSheet
        ref={returnSheetRef}
        title="Où rentres-tu ?"
        currentLocation={gpsDeparture}
        onSelect={(point) => {
          setReturnPoint(point);
          returnSheetRef.current?.dismiss();
        }}
      />

      <JourneyOptionsSheet
        ref={journeyOptionsSheetRef}
        hasReturnPoint={returnPoint !== null}
        canReverse={isTraverse}
        onChangeDeparture={() => {
          journeyOptionsSheetRef.current?.dismiss();
          departureSheetRef.current?.present();
        }}
        onChangeReturnPoint={() => {
          journeyOptionsSheetRef.current?.dismiss();
          returnSheetRef.current?.present();
        }}
        onClearReturnPoint={() => {
          setReturnPoint(null);
          journeyOptionsSheetRef.current?.dismiss();
        }}
        onReverse={() => {
          setIsReversed((value) => !value);
          journeyOptionsSheetRef.current?.dismiss();
        }}
      />

      <TimePickerSheet
        ref={timeSheetRef}
        label="Retour à partir de"
        value={returnTime}
        onSelect={(time) => setReturnTime(time)}
      />

      <TransportModeSheet
        ref={transportModeSheetRef}
        availableModes={availableModes}
        selectedModes={selectedModes}
        onApply={setSelectedModes}
      />

      <PassengersBottomSheet
        ref={passengersSheetRef}
        passengers={passengers}
        onChange={setPassengers}
        onValidate={() => passengersSheetRef.current?.dismiss()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    borderRadius: 8,
  },
  emptyBox: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontFamily: 'Satoshi_Variable',
    fontSize: 14,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: 12,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
