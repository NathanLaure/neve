import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useNavigation, useRouter, Stack } from 'expo-router';

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
  TRANSIT_TRANSPORT_MODES,
  isRealSource,
  Disruption,
  TransitOption,
  TransitSource,
  TransitTransportMode,
} from '@/services/transitService';
import { OutwardHeader } from '@/components/plan/OutwardHeader';
import { SearchTransportCard } from '@/components/plan/SearchTransportCard';
import { RecommendedWrapper } from '@/components/plan/RecommendedWrapper';
import { ItineraryCard, DeparturePoint } from '@/components/plan/ItineraryCard';
import DatePhasePillRow from '@/components/plan/DatePhasePillRow';
import JourneyEmptyState from '@/components/plan/JourneyEmptyState';
import JourneyUnavailableSheet from '@/components/plan/JourneyUnavailableSheet';
import FilterChip from '@/components/FilterChip';
import TransportModeSheet from '@/components/plan/TransportModeSheet';
import DisruptionsBottomSheet from '@/components/plan/DisruptionsBottomSheet';
import JourneyDetailSheet from '@/components/plan/JourneyDetailSheet';
import DeparturePointSheet from '@/components/plan/DeparturePointSheet';
import JourneyOptionsSheet from '@/components/plan/JourneyOptionsSheet';
import TimePickerSheet from '@/components/plan/TimePickerSheet';
import PassengersBottomSheet from '@/components/plan/PassengersBottomSheet';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import {
  Passenger,
  allPassengersHave,
  createDefaultPassengers,
  formatPassengerCount,
  normalizePassengers,
} from '@/types/passenger';
import { isFullyCoveredByNavigo } from '@/services/bookingService';

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
  const unavailableSheetRef = React.useRef<BaseBottomSheetModalRef>(null);
  /* Suit l'état affiché de la feuille d'indisponibilité. Un ref et non un état :
     il ne pilote aucun rendu, il évite seulement de rejouer une ouverture. */
  const isUnavailableOpenRef = React.useRef(false);

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
    /**
     * `return` : on ne vient corriger que le retour d'un voyage déjà enregistré.
     * L'écran ne laisse alors rien dans la pile — voir `handleConfirmOption`.
     */
    editOnly?: string;
  }>();

  const navigation = useNavigation();
  const isReturnEditOnly = params.editOnly === 'return';

  const { hikes, deviceLocationName, deviceLocation, loadHikeDetail } = useAdventure();
  const { draft, selectReturnJourney, setReturnTime } = usePlanDraft();

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  /* La randonnée n'est pas toujours dans le magasin : cet écran s'ouvre aussi
     depuis une aventure enregistrée, en sautant l'explorateur qui l'y aurait
     chargée. Sans ce rattrapage, `rando` reste indéfini et l'écran s'affiche
     sans itinéraire ni résultats. */
  useEffect(() => {
    if (params.randoId && !hikes.some((item) => item.id === params.randoId)) {
      loadHikeDetail(params.randoId);
    }
  }, [hikes, loadHikeDetail, params.randoId]);

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
      name: deviceLocationName,
      latitude: deviceLocation.latitude,
      longitude: deviceLocation.longitude,
    }),
    [deviceLocationName, deviceLocation.latitude, deviceLocation.longitude]
  );

  // Départ du trajet complet, tel que posé (ou édité) sur l'écran aller.
  const paramsDeparturePoint: DeparturePoint = useMemo(() => {
    const coords = parseCoordinates(params.departureLat, params.departureLng) ?? deviceLocation;
    return {
      name: params.departureName || deviceLocationName || 'Paris',
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }, [params.departureName, params.departureLat, params.departureLng, deviceLocationName, deviceLocation]);

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
  /* Dans le brouillon et non dans un état local, comme l'heure d'aller sur
     l'écran voisin : le calendrier ouvert par-dessus cet écran la règle aussi, et
     revenir de là perdait le réglage — comme le réglage fait ici était perdu en
     allant au calendrier. */
  const returnTime = draft.returnTime || params.returnTime || '16:00';

  // Liste détaillée si elle a suivi depuis l'écran aller (repli sur un unique
  // passager) : c'est elle qui permet la modification/ajout depuis la puce.
  const [passengers, setPassengers] = useState<Passenger[]>(
    () => normalizePassengers(params.passengers) ?? createDefaultPassengers()
  );
  const passengersCountText = formatPassengerCount(passengers);

  /* « Inclus Navigo » ne s'annonce que si personne n'a de billet à acheter :
     un seul randonneur sans pass, et le groupe passe quand même en caisse. */
  const groupHasNavigo = allPassengersHave(passengers, 'navigo');

  // State transit
  const [options, setOptions] = useState<TransitOption[]>([]);
  // Provenance des horaires, transmise à l'aventure enregistrée — même raison
  // que sur l'écran de l'aller.
  const [source, setSource] = useState<TransitSource>('fallback');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Perturbations de l'itinéraire dont on a ouvert le détail : la sheet est
  // partagée entre toutes les cartes.
  const [openedDisruptions, setOpenedDisruptions] = useState<Disruption[]>([]);
  // Itinéraire dont la feuille de détail est ouverte : c'est depuis elle, et
  // non depuis la carte, que le retour s'engage.
  const [detailedOption, setDetailedOption] = useState<TransitOption | null>(null);

  /*
   * Modes que l'utilisateur a écartés. C'est l'exclusion qu'on retient, et non
   * la sélection : elle est transmise au calculateur, qui recompose de vrais
   * itinéraires sans ces modes. Trier la réponse ne donnait rien dès que tous
   * les trajets proposés empruntaient le mode décoché.
   */
  const [excludedModes, setExcludedModes] = useState<Set<TransitTransportMode>>(new Set());
  /** Forme comparable du Set, pour piloter le rechargement sans suivre sa référence. */
  const excludedModesKey = Array.from(excludedModes).sort().join(',');

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
          // Décochés par l'utilisateur : le calculateur recompose sans eux.
          excludedModes: Array.from(excludedModes),
        };

        const result = await fetchTransitOptionsWithFallback(
          { ...baseQuery, from: trailhead },
          // Repli : depuis un sentier isolé, le calculateur peut ne rien trouver.
          { ...baseQuery, from: stationCoords }
        );
        setOptions(result.options);
        setSource(result.source);

        /* Le calculateur n'a pas répondu : ce qui revient ici n'est qu'une
           estimation à vol d'oiseau. On le dit franchement plutôt que de laisser
           l'utilisateur choisir un train qui n'existe pas.
           La feuille n'est ouverte ou refermée qu'au changement d'état : sans ce
           garde-fou, chaque rechargement — nouvelle heure, nouvelle date,
           tirer-pour-rafraîchir, réessai — la rejouerait alors qu'elle est déjà
           à l'écran. */
        const unavailable = !isRealSource(result.source);
        if (unavailable !== isUnavailableOpenRef.current) {
          isUnavailableOpenRef.current = unavailable;
          if (unavailable) unavailableSheetRef.current?.present();
          else unavailableSheetRef.current?.dismiss();
        }
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
    excludedModesKey,
  ]);

  const handleOpenDetails = (option: TransitOption) => {
    setDetailedOption(option);
    journeyDetailSheetRef.current?.present();
  };

  const handleConfirmOption = (option: TransitOption) => {
    setSelectedId(option.id);
    journeyDetailSheetRef.current?.dismiss();
    // Comme pour l'aller, l'itinéraire lui-même passe par le brouillon partagé.
    selectReturnJourney(option, isRealSource(source));
    // Le résumé relit tout le voyage avant enregistrement : le contexte qui a
    // servi à composer cette recherche doit l'accompagner, il est le seul à
    // savoir d'où l'on part et où l'on rentre.
    const summaryParams = {
      randoId: rando?.id,
      departureName: departurePoint.name,
      departureLat: String(departurePoint.latitude),
      departureLng: String(departurePoint.longitude),
      returnName: arrivalPoint.name,
      returnLat: String(arrivalPoint.latitude),
      returnLng: String(arrivalPoint.longitude),
      outwardDate: outwardDateValue ?? undefined,
      returnDate: returnDate ?? undefined,
      passengers: JSON.stringify(passengers),
      isReversed: String(isReversed),
    };

    /* Correction du seul retour : cet écran ne doit rien laisser derrière lui,
       sans quoi le retour arrière y ramènerait au lieu de rendre la main à la
       fiche. `back` quand l'écran qui la possède attend juste en dessous — le
       résumé ou le récapitulatif ; `replace` quand on vient de la feuille
       d'options d'une carte, où il n'y a rien sous cet écran. */
    if (isReturnEditOnly) {
      const routes = (navigation.getState()?.routes ?? []) as { name?: string }[];
      const parentName = routes[routes.length - 2]?.name;
      if (parentName === 'plan/summary' || parentName === 'recap') router.back();
      else router.replace({ pathname: '/plan/summary', params: summaryParams });
      return;
    }

    router.push({ pathname: '/plan/summary', params: summaryParams });
  };

  /* Les modes proposés au décochage : ceux présents dans la liste, plus ceux
     qu'on a écartés. Sans ce complément, décocher le bus le ferait disparaître
     des résultats donc de la feuille, et on ne pourrait plus le rétablir. */
  const availableModes = useMemo(() => {
    const present = new Set(getAvailableTransportModes(options));
    excludedModes.forEach((mode) => present.add(mode));
    return TRANSIT_TRANSPORT_MODES.filter((mode) => present.has(mode));
  }, [options, excludedModes]);

  const selectedModes = useMemo(
    () => new Set(availableModes.filter((mode) => !excludedModes.has(mode))),
    [availableModes, excludedModes]
  );

  const handleApplyModes = (next: Set<TransitTransportMode>) => {
    // L'effet de chargement suit `excludedModes` : relancer la recherche est
    // automatique, il n'y a rien à déclencher ici.
    setExcludedModes(new Set(availableModes.filter((mode) => !next.has(mode))));
  };

  /* Garde-fou par-dessus le recalcul : si le calculateur laisse malgré tout
     passer un mode écarté, il ne doit pas réapparaître dans la liste. */
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
              /* `next: 'return'` : on ne vient redater que le retour. Sans lui, le
                 calendrier repartait en mode planification complète et
                 `commitDates` effaçait l'aller déjà retenu — après quoi choisir un
                 trajet de retour ne menait nulle part, le résumé n'ayant plus
                 d'aller à afficher. `currentReturnDate` le distingue de l'ajout
                 d'un retour à un aller simple, où l'on repart bien de zéro. */
              onPress={() =>
                router.push({
                  pathname: '/plan/dates',
                  params: {
                    randoId: rando?.id,
                    next: 'return',
                    currentReturnDate: returnDate ?? undefined,
                    returnTime,
                  },
                })
              }
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
          ) : /* Le calculateur ne dessert que l'Île-de-France : ailleurs, il
                 répond par une erreur et le service la traduit en estimations
                 locales. Rien n'est rendu ici — les afficher reviendrait à
                 proposer des trains qui n'existent pas, et c'est la feuille
                 bloquante qui porte le message. */
          !isRealSource(source) ? null : sortedOptions.length === 0 ? (
            <JourneyEmptyState
              reason={options.length === 0 ? 'no-results-return' : 'no-mode-match'}
            />
          ) : (
            <View style={styles.resultsContainer}>
              {sortedOptions.map((option, index) => {
                const isRecommended = index === 0;
                const isSelected = selectedId === option.id;

                const cardProps = {
                  option,
                  isSelected,
                  showNavigoBadge: groupHasNavigo && isFullyCoveredByNavigo(option),
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
        showNavigoBadge={groupHasNavigo && isFullyCoveredByNavigo(detailedOption)}
        onConfirm={() => detailedOption && handleConfirmOption(detailedOption)}
      />

      {/* Calculateur injoignable : ni horaires ni choix possible ici. */}
      <JourneyUnavailableSheet
        ref={unavailableSheetRef}
        /* Aucun itinéraire à proposer ici : la seule issue est de revenir sur
           ses pas pour changer de date, d'heure ou de point de départ. */
        onBack={() => {
          isUnavailableOpenRef.current = false;
          unavailableSheetRef.current?.dismiss();
          router.back();
        }}
        onOpenSupport={() => {
          isUnavailableOpenRef.current = false;
          unavailableSheetRef.current?.dismiss();
          router.push('/(tabs)/profile');
        }}
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
        onApply={handleApplyModes}
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
