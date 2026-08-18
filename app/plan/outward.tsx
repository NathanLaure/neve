import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
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
import { usePlanDraft, computeAutoReturnDate } from '@/context/PlanDraftContext';
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

/** « 08h » ou « 08h30 » — jamais « 08:00 », qui ne colle pas au reste de l'écran. */
function formatHourLabel(time: string): string {
  const [h, m] = time.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

export default function OutwardPlanScreen() {
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
    departureName?: string;
    departureLat?: string;
    departureLng?: string;
    returnName?: string;
    returnLat?: string;
    returnLng?: string;
    outwardDate?: string;
    outwardTime?: string;
    returnDate?: string;
    returnTime?: string;
    passengersCount?: string;
    passengers?: string;
    isReversed?: string;
  }>();

  const { hikes, deviceLocationName, deviceLocation } = useAdventure();
  const { draft, setOutwardTime, selectOutwardJourney } = usePlanDraft();

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  // Sens de parcours, éditable ici via la feuille d'options (Figma : bouton
  // d'inversion des gares A/B de la carte d'itinéraire).
  const [isReversed, setIsReversed] = useState(params.isReversed === 'true');

  const isTraverse = !!rando && !!rando.endStation && rando.startStation !== rando.endStation;

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

  // Position GPS, repli par défaut du point de départ.
  const gpsDeparture: DeparturePoint = useMemo(
    () => ({
      name: deviceLocationName,
      latitude: deviceLocation.latitude,
      longitude: deviceLocation.longitude,
    }),
    [deviceLocationName, deviceLocation.latitude, deviceLocation.longitude]
  );

  const paramsDeparturePoint: DeparturePoint = useMemo(() => {
    const coords = parseCoordinates(params.departureLat, params.departureLng) ?? deviceLocation;
    return {
      name: params.departureName || deviceLocationName || 'Paris',
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }, [params.departureName, params.departureLat, params.departureLng, deviceLocationName, deviceLocation]);

  // Adresse choisie à la main sur cet écran, qui l'emporte tant qu'elle est posée.
  const [customDeparture, setCustomDeparture] = useState<DeparturePoint | null>(null);
  const departurePoint = customDeparture ?? paramsDeparturePoint;

  // Lieu de retour distinct du départ : `plan.tsx` ne transmet un `returnName`
  // différent que lorsqu'un lieu personnalisé a réellement été posé — sinon
  // c'est une simple copie du départ, indiscernable en coordonnées.
  const [returnPoint, setReturnPoint] = useState<DeparturePoint | null>(() => {
    const retCoords = parseCoordinates(params.returnLat, params.returnLng);
    const sameAsDeparture =
      params.returnLat === params.departureLat && params.returnLng === params.departureLng;
    if (!retCoords || sameAsDeparture) return null;
    return { name: params.returnName || '', latitude: retCoords.latitude, longitude: retCoords.longitude };
  });

  const destinationName = arrivalStation.name || rando?.title || 'Destination';

  // Dates et heure d'aller : le brouillon partagé fait foi tant que le
  // parcours reste sur cette pile (voir PlanDraftContext) — les paramètres ne
  // servent que de repli si l'écran était atteint sans lui.
  const outwardDate = draft.startDate || params.outwardDate || new Date().toISOString().split('T')[0];
  const outwardTime = draft.outwardTime || params.outwardTime || '08:00';
  /*
   * Date de retour effective. Repasser en aller-retour depuis un aller simple
   * laisse `endDate` vide tant qu'aucune seconde date n'a été tapée : sans le
   * retour calculé d'office en dernier recours, la pilule « Retour » ne
   * reviendrait pas alors que le voyage en compte un.
   */
  const returnDateValue =
    draft.tripType === 'oneway'
      ? null
      : draft.endDate ||
        params.returnDate ||
        computeAutoReturnDate(outwardDate, rando?.durationHours);

  // Liste détaillée si elle a suivi (repli sur un unique passager par défaut) :
  // c'est elle qui permet la modification/ajout depuis la puce d'en-tête.
  const [passengers, setPassengers] = useState<Passenger[]>(
    () => normalizePassengers(params.passengers) ?? createDefaultPassengers()
  );
  const passengersCountText = formatPassengerCount(passengers);

  /* « Inclus Navigo » ne s'annonce que si personne n'a de billet à acheter :
     un seul randonneur sans pass, et le groupe passe quand même en caisse. */
  const groupHasNavigo = allPassengersHave(passengers, 'navigo');

  // State pour le transit
  const [options, setOptions] = useState<TransitOption[]>([]);
  // Provenance des horaires affichés : elle suit l'itinéraire choisi jusqu'à
  // l'aventure enregistrée, où une estimation de repli ne doit pas passer pour
  // un horaire ferme.
  const [source, setSource] = useState<TransitSource>('fallback');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Perturbations de l'itinéraire dont on a ouvert le détail : la sheet est
  // partagée entre toutes les cartes.
  const [openedDisruptions, setOpenedDisruptions] = useState<Disruption[]>([]);
  // Itinéraire dont la feuille de détail est ouverte : c'est depuis elle, et
  // non depuis la carte, que l'aller s'engage.
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
      if (rando) {
        // PRIM sait router jusqu'à une adresse : on vise le vrai départ du
        // sentier plutôt que la gare la plus proche, pour que la marche finale
        // fasse partie de l'itinéraire au lieu d'être laissée au randonneur.
        // Pas de coordonnée précise pour la fin du sentier dans le modèle de
        // données (seul `start_lat/start_lng` existe) : en sens inversé, la
        // gare la plus proche reste le meilleur repère disponible.
        const stationCoords = arrivalStation.coords;
        const trailhead = isReversed
          ? stationCoords
          : rando.start_lat != null && rando.start_lng != null
            ? { latitude: rando.start_lat, longitude: rando.start_lng }
            : stationCoords;

        const baseQuery = {
          from: { latitude: departurePoint.latitude, longitude: departurePoint.longitude },
          fromName: departurePoint.name,
          toName: destinationName,
          date: outwardDate,
          time: outwardTime,
          direction: 'go' as const,
          // Décochés par l'utilisateur : le calculateur recompose sans eux.
          excludedModes: Array.from(excludedModes),
        };

        const result = await fetchTransitOptionsWithFallback(
          { ...baseQuery, to: trailhead },
          // Repli : un sentier en pleine forêt peut être hors de portée du
          // calculateur, la gare reste toujours desservie.
          { ...baseQuery, to: stationCoords }
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
      console.error('Error fetching transit options:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransit();
    // Primitives et non les objets `departurePoint` / `arrivalStation`, recréés
    // à chaque rendu. `excludedModesKey` sérialise le Set pour la même raison :
    // décocher un mode doit relancer la recherche, pas un simple changement de
    // référence.
  }, [
    rando?.id,
    outwardDate,
    outwardTime,
    departurePoint.name,
    departurePoint.latitude,
    departurePoint.longitude,
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
    // L'itinéraire retenu passe par le brouillon partagé et non par l'URL : il
    // porte tous ses tronçons, que le résumé affiche en détail (PlanDraftContext).
    selectOutwardJourney(option, isRealSource(source));
    const arrivalPoint = returnPoint ?? departurePoint;

    /* Aller simple : il n'y a pas de retour à choisir, l'étape suivante est le
       récapitulatif. Le résumé sait déjà se passer d'un trajet retour — il n'en
       affiche pas la section et reprend l'aller pour l'estimation. */
    if (draft.tripType === 'oneway') {
      router.push({
        pathname: '/plan/summary',
        params: {
          randoId: rando?.id,
          departureName: departurePoint.name,
          // Coordonnées transmises pour que « Ajouter un retour » depuis le
          // résumé reparte du lieu réellement choisi, et non du GPS.
          departureLat: String(departurePoint.latitude),
          departureLng: String(departurePoint.longitude),
          returnName: arrivalPoint.name,
          returnLat: String(arrivalPoint.latitude),
          returnLng: String(arrivalPoint.longitude),
          outwardDate,
          passengers: JSON.stringify(passengers),
          isReversed: String(isReversed),
        },
      });
      return;
    }

    // Naviguer vers la page Retour
    router.push({
      pathname: '/plan/return',
      // Tout le contexte de planification suit : l'écran de retour en a besoin
      // pour viser le bon lieu, à la bonne date. Ce qui n'est pas transmis ici
      // est définitivement perdu, il retomberait sur le GPS et sur aujourd'hui.
      params: {
        randoId: rando?.id,
        outwardId: option.id,
        departureName: departurePoint.name,
        departureLat: String(departurePoint.latitude),
        departureLng: String(departurePoint.longitude),
        returnName: arrivalPoint.name,
        returnLat: String(arrivalPoint.latitude),
        returnLng: String(arrivalPoint.longitude),
        outwardDate,
        returnDate: returnDateValue ?? undefined,
        returnTime: params.returnTime,
        passengersCount: passengersCountText,
        passengers: JSON.stringify(passengers),
        isReversed: String(isReversed),
      },
    });
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

  const outwardDateLabel = formatDateRangeSummary(outwardDate, outwardDate);
  const returnDateLabel = returnDateValue ? formatDateRangeSummary(returnDateValue, returnDateValue) : null;

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Barre d'actions animée, fixe */}
        <OutwardHeader
          departureName={departurePoint.name}
          destinationName={destinationName}
          dateFormatted={outwardDateLabel}
          timeFormatted={formatHourLabel(outwardTime)}
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
              activePhase="outward"
              outwardLabel={outwardDateLabel}
              returnLabel={returnDateLabel}
              onPress={() => router.push({ pathname: '/plan/dates', params: { randoId: rando?.id } })}
            />

            <View style={styles.filterRow}>
              <FilterChip
                label={`Départ à ${formatHourLabel(outwardTime)}`}
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
            <JourneyEmptyState reason={options.length === 0 ? 'no-results' : 'no-mode-match'} />
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

      {/* Détail de l'itinéraire tapé, d'où l'aller s'engage réellement. */}
      <JourneyDetailSheet
        ref={journeyDetailSheetRef}
        option={detailedOption}
        departureName={departurePoint.name}
        destinationName={destinationName}
        primaryLabel="Choisir cet ALLER"
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
        label="Aller à partir de"
        value={outwardTime}
        durationHours={rando?.durationHours}
        onSelect={(time) => setOutwardTime(time)}
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
