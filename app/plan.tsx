import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Info,
  MapPin,
  RefreshCw,
  User,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Skeleton from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { TrainOption } from '@/constants/RandosData';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import DateRangeCalendar, {
  DateRangeCalendarHeader,
  addDays,
  formatDateRangeSummary,
  toISODate,
} from '@/components/plan/DateRangeCalendar';
import PassengersEditor from '@/components/plan/PassengersEditor';
import PassengersBottomSheet from '@/components/plan/PassengersBottomSheet';
import AutoReturnInfoSheet from '@/components/plan/AutoReturnInfoSheet';
import DeparturePointSheet from '@/components/plan/DeparturePointSheet';
import {
  Passenger,
  createDefaultPassengers,
  formatPassengerCount,
} from '@/types/passenger';
import {
  calculateCo2Impact,
  fetchTransitHorizon,
  fetchTransitOptions,
  toTrainOption,
  TimeMode,
  TransitOption,
  TransitSource,
} from '@/services/transitService';

/** Heure de départ proposée par défaut pour l'aller — on vise la matinée. */
const DEFAULT_OUTWARD_TIME = '08:00';

/** Créneaux proposés pour l'aller. Amplitude d'une journée de rando classique. */
const SELECTABLE_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
];

const TIME_MODES: { value: TimeMode; label: string }[] = [
  { value: 'departure', label: 'Partir après' },
  { value: 'arrival', label: 'Arriver avant' },
];

/** Repli pour le retour tant que l'aller n'est pas choisi, ou en séjour sur plusieurs jours. */
const DEFAULT_RETURN_TIME = '16:00';
/** On ne propose pas de retour au-delà : les dessertes franciliennes se raréfient. */
const LATEST_RETURN_TIME_MINUTES = 21 * 60;

/**
 * Heures de marche au-delà desquelles la rando déborde sur un jour de plus.
 * Sert à pré-remplir la date de retour : 402 des 431 randos franciliennes tiennent
 * sous ce seuil et repartent donc le jour même.
 */
const HIKING_HOURS_PER_DAY = 8;

type LoadState = 'loading' | 'ready' | 'error';
type Phase = 'config' | 'results';
type TripType = 'round' | 'oneway';
type OpenSection = 'dates' | 'passengers' | null;

interface DeparturePoint {
  name: string;
  latitude: number;
  longitude: number;
}

/** `cache` reste de la vraie donnée IDFM, seul `fallback` est une estimation. */
function isRealSource(source: TransitSource): boolean {
  return source !== 'fallback';
}

interface TransitOptionsListProps {
  options: TransitOption[];
  state: LoadState;
  source: TransitSource;
  selectedId: string | null;
  onSelect: (option: TransitOption) => void;
  onRetry: () => void;
  theme: (typeof Colors)['light'];
}

/**
 * Liste d'itinéraires avec ses trois états : chargement, erreur, résultat (dont
 * le cas vide).
 *
 * Habillage encore sobre : les maquettes de l'écran de résultats (badge « trajet
 * recommandé », accordéon de correspondances) restent à intégrer.
 */
function TransitOptionsList({
  options,
  state,
  source,
  selectedId,
  onSelect,
  onRetry,
  theme,
}: TransitOptionsListProps) {
  if (state === 'loading') {
    return (
      <View style={styles.trainOptionsList}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.trainCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <View style={styles.trainCardHeader}>
              <Skeleton width={70} height={18} style={{ backgroundColor: theme.border }} />
              <Skeleton width={50} height={18} style={{ backgroundColor: theme.border }} />
            </View>
            <Skeleton width="65%" height={12} style={{ backgroundColor: theme.border }} />
          </View>
        ))}
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.listMessage, { borderColor: theme.border }]}>
        <Text style={[styles.listMessageText, { color: theme.textMuted }]}>
          Impossible de récupérer les horaires pour le moment.
        </Text>
        <Pressable onPress={onRetry} style={[styles.retryBtn, { borderColor: theme.tint }]}>
          <RefreshCw size={13} color={theme.tint} />
          <Text style={[styles.retryBtnText, { color: theme.tint }]}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={[styles.listMessage, { borderColor: theme.border }]}>
        <Text style={[styles.listMessageText, { color: theme.textMuted }]}>
          Aucun trajet en transports en commun trouvé à cette date. Essayez une autre date ou un
          autre point de départ.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.trainOptionsList}>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        const lines = option.legs
          .filter((leg) => leg.mode !== 'walk' && leg.lineName)
          .map((leg) => leg.lineName)
          .join(' → ');

        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option)}
            style={[
              styles.trainCard,
              {
                backgroundColor: isSelected ? theme.blueBadge : theme.background,
                borderColor: isSelected ? theme.secondary : theme.border,
              },
            ]}>
            <View style={styles.trainCardHeader}>
              <Text style={[styles.trainCardTime, { color: theme.text }]}>
                {option.departureTime} → {option.arrivalTime}
              </Text>
              <Text style={[styles.trainCardPrice, { color: theme.secondary }]}>
                {option.priceEstimate.toFixed(2)}€
              </Text>
            </View>
            <View style={styles.trainCardFooter}>
              <Text style={[styles.trainCardMeta, { color: theme.textMuted }]}>
                🚆 {lines || 'Transports en commun'} •{' '}
                {option.transfers === 0 ? 'direct' : `${option.transfers} corresp.`}
              </Text>
              <Text style={[styles.trainCardDuration, { color: theme.textMuted }]}>
                Durée : {option.durationFormatted}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* On ne fait jamais passer une estimation pour un horaire officiel. */}
      {!isRealSource(source) && (
        <Text style={[styles.fallbackNotice, { color: theme.textMuted }]}>
          Horaires indicatifs — le calculateur Île-de-France Mobilités est momentanément
          indisponible. Vérifiez avant de partir.
        </Text>
      )}
    </View>
  );
}

export default function PlanScreen() {
  const { randoId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { addAdventure, userLocationName, userLocation, hikes } = useAdventure();

  const rando = hikes.find((r) => r.id === randoId);

  const passengersSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const autoReturnSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const departureSheetRef = useRef<BaseBottomSheetModalRef>(null);

  // Configuration puis résultats. Les maquettes séparent les deux : la recherche
  // n'est lancée qu'au clic sur « Voir les trajets disponibles », ce qui évite
  // aussi de brûler du quota PRIM à chaque tape sur le calendrier.
  const [phase, setPhase] = useState<Phase>('config');
  const [openSection, setOpenSection] = useState<OpenSection>('dates');

  // Position GPS, proposée par défaut. Dérivée plutôt que stockée pour qu'elle
  // suive le capteur quand la localisation se précise après le premier rendu.
  const gpsDeparture: DeparturePoint = useMemo(
    () => ({
      name: userLocationName,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }),
    [userLocationName, userLocation.latitude, userLocation.longitude]
  );

  // Adresse saisie à la main, qui l'emporte sur le GPS tant qu'elle est posée.
  const [customDeparture, setCustomDeparture] = useState<DeparturePoint | null>(null);
  const departurePoint = customDeparture ?? gpsDeparture;

  const [passengers, setPassengers] = useState<Passenger[]>(createDefaultPassengers);

  // Sens de parcours. Sur une traversée (gare de fin ≠ gare de début), l'inverser
  // fait viser la gare de fin à l'aller et repartir de la gare de début au retour.
  // 156 des 431 randos franciliennes sont dans ce cas.
  const [isReversed, setIsReversed] = useState(false);

  const [tripType, setTripType] = useState<TripType>('round');
  const today = useMemo(() => toISODate(new Date()), []);
  const [startDate, setStartDate] = useState<string>(() => addDays(toISODate(new Date()), 1));
  const [endDate, setEndDate] = useState<string | null>(null);
  // Tant que l'utilisateur n'a pas touché au retour, il suit la durée de la rando.
  const [hasCustomReturn, setHasCustomReturn] = useState(false);
  // La carte « Qui part à l'aventure ? » n'apparaît qu'une fois les dates posées
  // et le calendrier replié — c'est l'enchaînement des maquettes 1 puis 6.
  const [datesValidated, setDatesValidated] = useState(false);

  // Horizon de production PRIM : au-delà, aucun horaire n'existe.
  const [horizon, setHorizon] = useState<string>(() => addDays(toISODate(new Date()), 30));

  const [outwardTime, setOutwardTime] = useState<string>(DEFAULT_OUTWARD_TIME);
  const [outwardTimeMode, setOutwardTimeMode] = useState<TimeMode>('departure');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isStale = false;
    fetchTransitHorizon().then((value) => {
      if (!isStale) setHorizon(value);
    });
    return () => {
      isStale = true;
    };
  }, []);

  // Nombre de jours de marche, d'où découle la date de retour pré-remplie.
  const hikeDays = Math.max(1, Math.ceil((rando?.durationHours ?? 0) / HIKING_HOURS_PER_DAY));

  // Retour auto : départ + (jours de marche - 1). Une sortie à la journée revient
  // le soir même, une rando de 3 jours deux jours plus tard.
  const autoReturnDate = useMemo(() => addDays(startDate, hikeDays - 1), [startDate, hikeDays]);

  const effectiveEndDate = tripType === 'oneway' ? null : (endDate ?? autoReturnDate);

  // Une rando qui commence et se termine à la même gare est une boucle :
  // l'inverser ne changerait rien, donc pas de bouton d'inversion.
  const isTraverse =
    !!rando && !!rando.endStation && rando.startStation !== rando.endStation;

  // Gare visée par l'aller, et gare d'où repart le retour. Sur une traversée non
  // inversée ce sont deux gares différentes — c'est le cas d'usage à couvrir.
  const arrivalStation =
    isReversed && rando
      ? { name: rando.endStation, coords: rando.endStationCoords }
      : { name: rando?.startStation ?? '', coords: rando?.startStationCoords };
  const departBackStation =
    isReversed && rando
      ? { name: rando.startStation, coords: rando.startStationCoords }
      : { name: rando?.endStation ?? '', coords: rando?.endStationCoords };

  /** Replie le calendrier et fait apparaître la carte voyageurs. */
  const validateDates = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setDatesValidated(true);
    setOpenSection('passengers');
  };

  /**
   * Sélection d'une date sur le calendrier. Ne valide pas automatiquement les dates,
   * l'utilisateur doit appuyer sur le bouton « Confirmer les dates ».
   */
  const handleSelectDate = (date: string) => {
    if (tripType === 'round' && startDate && !endDate && date > startDate) {
      setEndDate(date);
      setHasCustomReturn(true);
      return;
    }
    setStartDate(date);
    setEndDate(null);
    setHasCustomReturn(false);
  };

  const outwardKey = [
    rando?.id ?? '',
    departurePoint.latitude,
    departurePoint.longitude,
    startDate,
    outwardTime,
    outwardTimeMode,
    retryToken,
  ].join('|');

  const [outwardResult, setOutwardResult] = useState<{
    key: string;
    options: TransitOption[];
    source: TransitSource;
  } | null>(null);
  const [outwardErrorKey, setOutwardErrorKey] = useState<string | null>(null);
  const [outwardSelection, setOutwardSelection] = useState<{
    key: string;
    train: TrainOption;
  } | null>(null);

  const outwardMatches = outwardResult?.key === outwardKey;
  const outwardOptions = outwardMatches ? outwardResult!.options : [];
  const outwardSource: TransitSource = outwardMatches ? outwardResult!.source : 'live';
  const outwardState: LoadState = outwardMatches
    ? 'ready'
    : outwardErrorKey === outwardKey
      ? 'error'
      : 'loading';
  const selectedOutwardTrain =
    outwardSelection?.key === outwardKey ? outwardSelection.train : null;

  const returnStartTime = useMemo(() => {
    if (!rando || !selectedOutwardTrain?.arrivalTime) return DEFAULT_RETURN_TIME;
    if (effectiveEndDate !== startDate) return DEFAULT_RETURN_TIME;

    const [hours, minutes] = selectedOutwardTrain.arrivalTime.split(':').map(Number);
    const readyAt = hours * 60 + minutes + Math.round((rando.durationHours || 0) * 60);
    const capped = Math.min(readyAt, LATEST_RETURN_TIME_MINUTES);
    return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
  }, [rando, selectedOutwardTrain, startDate, effectiveEndDate]);

  const returnKey = [
    rando?.id ?? '',
    departurePoint.latitude,
    departurePoint.longitude,
    effectiveEndDate ?? '',
    returnStartTime,
    retryToken,
  ].join('|');

  const [returnResult, setReturnResult] = useState<{
    key: string;
    options: TransitOption[];
    source: TransitSource;
  } | null>(null);
  const [returnErrorKey, setReturnErrorKey] = useState<string | null>(null);
  const [returnSelection, setReturnSelection] = useState<{
    key: string;
    train: TrainOption;
  } | null>(null);

  const returnMatches = returnResult?.key === returnKey;
  const returnOptions = returnMatches ? returnResult!.options : [];
  const returnSource: TransitSource = returnMatches ? returnResult!.source : 'live';
  const returnState: LoadState = returnMatches
    ? 'ready'
    : returnErrorKey === returnKey
      ? 'error'
      : 'loading';
  const selectedReturnTrain = returnSelection?.key === returnKey ? returnSelection.train : null;

  // Dépendances d'effet en valeurs primitives : `hikes` est rechargé par
  // AdventureContext (sync realtime, retour au premier plan) et recrée l'objet
  // `rando` à l'identique. Sur des objets, chaque rechargement relancerait deux
  // appels à PRIM pour rien — et le quota est à 1 000 par jour.
  //
  // Les gares suivent le sens de parcours : sur une traversée inversée, l'aller
  // vise la gare de fin et le retour repart de la gare de début.
  const startStationLat = arrivalStation.coords?.latitude;
  const startStationLng = arrivalStation.coords?.longitude;
  const endStationLat = departBackStation.coords?.latitude;
  const endStationLng = departBackStation.coords?.longitude;
  const startStationName = arrivalStation.name || undefined;
  const endStationName = departBackStation.name || undefined;

  const departureName = departurePoint.name;
  const departureLat = departurePoint.latitude;
  const departureLng = departurePoint.longitude;

  // La recherche ne part qu'en phase résultats : en configuration, chaque tape
  // sur le calendrier aurait coûté deux appels PRIM.
  const isSearching = phase === 'results';

  useEffect(() => {
    if (!isSearching) return;
    if (startStationLat == null || startStationLng == null || !startStationName) return;

    let isStale = false;
    fetchTransitOptions({
      from: { latitude: departureLat, longitude: departureLng },
      to: { latitude: startStationLat, longitude: startStationLng },
      fromName: departureName,
      toName: startStationName,
      date: startDate,
      time: outwardTime,
      timeMode: outwardTimeMode,
      direction: 'go',
    })
      .then((result) => {
        if (isStale) return;
        setOutwardResult({ key: outwardKey, options: result.options, source: result.source });
      })
      .catch(() => {
        if (!isStale) setOutwardErrorKey(outwardKey);
      });

    return () => {
      isStale = true;
    };
  }, [
    isSearching,
    outwardKey,
    departureLat,
    departureLng,
    departureName,
    startStationLat,
    startStationLng,
    startStationName,
    startDate,
    outwardTime,
    outwardTimeMode,
  ]);

  useEffect(() => {
    if (!isSearching || !effectiveEndDate) return;
    if (endStationLat == null || endStationLng == null || !endStationName) return;

    let isStale = false;
    fetchTransitOptions({
      from: { latitude: endStationLat, longitude: endStationLng },
      to: { latitude: departureLat, longitude: departureLng },
      fromName: endStationName,
      toName: departureName,
      date: effectiveEndDate,
      time: returnStartTime,
      timeMode: 'departure',
      direction: 'back',
    })
      .then((result) => {
        if (isStale) return;
        setReturnResult({ key: returnKey, options: result.options, source: result.source });
      })
      .catch(() => {
        if (!isStale) setReturnErrorKey(returnKey);
      });

    return () => {
      isStale = true;
    };
  }, [
    isSearching,
    returnKey,
    departureLat,
    departureLng,
    departureName,
    endStationLat,
    endStationLng,
    endStationName,
    effectiveEndDate,
    returnStartTime,
  ]);

  const handleRetry = useCallback(() => setRetryToken((token) => token + 1), []);

  const toggleSection = (section: OpenSection) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setOpenSection((current) => (current === section ? null : section));
  };

  if (!rando) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Aventure introuvable</Text>
        <Pressable onPress={() => router.back()}>
          <View style={[styles.backBtn, { backgroundColor: theme.tint }]}>
            <Text style={styles.backBtnText}>Retour</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const handleFinalize = () => {
    if (!selectedOutwardTrain) return;
    // En aller simple il n'y a pas de retour à choisir : on réutilise l'aller pour
    // satisfaire le modèle existant de PlannedAdventure, qui en exige un.
    const returnTrain = selectedReturnTrain ?? selectedOutwardTrain;

    const advId = addAdventure({
      randoId: rando.id,
      outwardDate: startDate,
      returnDate: effectiveEndDate ?? startDate,
      outwardTrain: selectedOutwardTrain,
      returnTrain,
      departureStationName: departurePoint.name,
      isBooked: false,
    });

    router.replace(`/recap?adventureId=${advId}`);
  };

  const dateSummary = formatDateRangeSummary(startDate, effectiveEndDate);
  const canSearch = datesValidated;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {/* En-tête FIXE : actions + carte origine/destination. Ne défile jamais. */}
        <View style={styles.header}>
          <View style={styles.actions}>
            {/* Même bouton que la fiche rando (IconButton `circle`), seule la
                couleur change : fond clair sur cet écran, icône sombre. */}
            <IconButton
              variant="circle"
              icon={<ArrowLeft size={20} color={theme.buttonIconColor} />}
              style={{ backgroundColor: theme.buttonBgIcon }}
              onPress={() => (phase === 'results' ? setPhase('config') : router.back())}
            />
            <Text style={[styles.headerTitle, { color: theme.text }]}>Planification</Text>
            <View style={styles.actionsSpacer} />
            <Pressable
              onPress={() => passengersSheetRef.current?.present()}
              style={[styles.passengerChip, { backgroundColor: theme.card }]}>
              <User size={20} color={theme.text} />
              <Text style={[styles.passengerChipText, { color: theme.text }]}>
                {formatPassengerCount(passengers)}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.journeyRow}>
              <View style={styles.journeyColumn}>
                <Pressable
                  accessibilityLabel="Changer le point de départ"
                  onPress={() => departureSheetRef.current?.present()}
                  style={styles.journeyLine}>
                  <CircleDot size={16} color={theme.text} />
                  <Text style={[styles.journeyText, { color: theme.text }]} numberOfLines={1}>
                    {departurePoint.name}
                  </Text>
                </Pressable>

                <View
                  style={[styles.journeySeparator, { backgroundColor: theme.borderStrong }]}
                />

                <View style={styles.journeyLine}>
                  <MapPin size={16} color={theme.text} />
                  <Text style={[styles.journeyText, { color: theme.text }]} numberOfLines={1}>
                    {arrivalStation.name}
                  </Text>
                </View>
              </View>

              {/* Inverser n'a de sens que sur une traversée : sur une boucle, les
                  deux gares sont les mêmes et le bouton ne ferait rien. */}
              {isTraverse && (
                <Pressable
                  accessibilityLabel="Parcourir la randonnée en sens inverse"
                  onPress={() => setIsReversed((value) => !value)}
                  style={[styles.swapButton, { backgroundColor: theme.surfaceSecondary }]}>
                  <ArrowUpDown size={16} color={theme.text} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Corps : en configuration, seul le calendrier défile. */}
        <View
          style={[
            styles.body,
            (!datesValidated || openSection === 'dates') &&
              phase === 'config' && { paddingBottom: Math.max(insets.bottom, 34) },
          ]}>
          {/* Quand partir à l'aventure ? — la carte prend la hauteur disponible
              quand elle est ouverte, et seule la grille du calendrier défile. */}
          <View
            style={[
              styles.card,
              openSection === 'dates' && phase === 'config' && styles.cardExpanded,
              { backgroundColor: theme.card },
            ]}>
            <Pressable onPress={() => toggleSection('dates')} style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: openSection === 'dates' ? theme.text : theme.textDisabled },
                ]}>
                Quand partir à l’aventure ?
              </Text>
              {openSection !== 'dates' && (
                <Text style={[styles.sectionSummary, { color: theme.text }]}>{dateSummary}</Text>
              )}
            </Pressable>

            {openSection === 'dates' && (
              <>
                <DateRangeCalendarHeader />
                <ScrollView
                  style={styles.calendarScroll}
                  showsVerticalScrollIndicator={false}>
                  <DateRangeCalendar
                    hideWeekdayRow
                    startDate={startDate}
                    endDate={effectiveEndDate}
                    minDate={today}
                    maxDate={horizon}
                    onSelectDate={handleSelectDate}
                  />
                </ScrollView>

                {/* Uniquement sur les randos qui débordent d'une journée : sur une
                    sortie à la journée, un retour le soir même est évident et le
                    bandeau n'apprendrait rien. */}
                {tripType === 'round' && !hasCustomReturn && hikeDays > 1 && (
                  <View
                    style={[
                      styles.autoReturnBanner,
                      { borderColor: theme.statusBgInfo, backgroundColor: theme.blueBadge },
                    ]}>
                    <View style={styles.autoReturnHeader}>
                      <Info size={18} color={theme.statusBgInfo} />
                      <Text style={[styles.autoReturnTitle, { color: theme.text }]}>
                        Retour calculé automatiquement !
                      </Text>
                    </View>
                    <Text style={[styles.autoReturnBody, { color: theme.textMuted }]}>
                      Nous avons calé le retour sur les {hikeDays} jours de marche de la rando. Tu
                      peux le modifier si tu le souhaites.
                    </Text>
                    <Pressable onPress={() => autoReturnSheetRef.current?.present()}>
                      <Text style={[styles.autoReturnLink, { color: theme.text }]}>
                        Comment ça marche ?
                      </Text>
                    </Pressable>
                  </View>
                )}

                <View style={[styles.segmented, { borderColor: theme.border }]}>
                  {(
                    [
                      { value: 'round', label: 'Aller / Retour' },
                      { value: 'oneway', label: 'Aller simple' },
                    ] as { value: TripType; label: string }[]
                  ).map((item) => {
                    const isSel = tripType === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => {
                          setTripType(item.value);
                          setEndDate(null);
                          setHasCustomReturn(false);
                        }}
                        style={[
                          styles.segmentedItem,
                          isSel && { backgroundColor: theme.tint },
                        ]}>
                        {isSel && <Check size={16} color={theme.buttonTextOnBrand} />}
                        <Text
                          style={[
                            styles.segmentedText,
                            { color: isSel ? theme.buttonTextOnBrand : theme.text },
                          ]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Button
                  title="Valider les dates"
                  variant="primary"
                  onPress={validateDates}
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </View>

          {/* Qui part à l'aventure ? — n'apparaît que si les dates sont validées et le calendrier replié. */}
          {datesValidated && openSection !== 'dates' && phase === 'config' && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Pressable onPress={() => toggleSection('passengers')} style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: openSection === 'passengers' ? theme.text : theme.textDisabled },
                  ]}>
                  Qui part à l’aventure ?
                </Text>
                {openSection === 'passengers' ? (
                  <ChevronUp size={20} color={theme.text} />
                ) : (
                  <ChevronDown size={20} color={theme.text} />
                )}
              </Pressable>

              {openSection === 'passengers' && (
                <View style={styles.passengersInline}>
                  <PassengersEditor passengers={passengers} onChange={setPassengers} />
                </View>
              )}
            </View>
          )}

          {/* Phase résultats : choix des trains, réutilise le mécanisme existant */}
          {phase === 'results' && (
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}>
              {(() => {
                const travelDistanceKm =
                  startStationLat != null && startStationLng != null
                    ? calculateDistanceKm(
                        departureLat,
                        departureLng,
                        startStationLat,
                        startStationLng
                      ) * 2
                    : 0;
                const co2 = calculateCo2Impact(travelDistanceKm);
                return (
                  <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Train aller</Text>
                    <Text style={[styles.helperText, { color: theme.textMuted }]}>
                      {departurePoint.name} → {rando.startStation},{' '}
                      {outwardTimeMode === 'arrival'
                        ? `en arrivant avant ${outwardTime}`
                        : `en partant après ${outwardTime}`}
                      . −{co2.savedCo2Kg} kg CO₂ par rapport à la voiture.
                    </Text>

                    <View style={styles.timeModeRow}>
                      {TIME_MODES.map((mode) => {
                        const isSel = outwardTimeMode === mode.value;
                        return (
                          <Pressable
                            key={mode.value}
                            onPress={() => setOutwardTimeMode(mode.value)}
                            style={[
                              styles.timeModePill,
                              {
                                backgroundColor: isSel ? theme.tint : theme.surfaceSecondary,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.pillText,
                                { color: isSel ? theme.buttonTextOnBrand : theme.text },
                              ]}>
                              {mode.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.departurePills}>
                      {SELECTABLE_TIMES.map((time) => {
                        const isSel = outwardTime === time;
                        return (
                          <Pressable
                            key={time}
                            onPress={() => setOutwardTime(time)}
                            style={[
                              styles.pill,
                              { backgroundColor: isSel ? theme.tint : theme.surfaceSecondary },
                            ]}>
                            <Text
                              style={[
                                styles.pillText,
                                { color: isSel ? theme.buttonTextOnBrand : theme.text },
                              ]}>
                              {time}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <TransitOptionsList
                      options={outwardOptions}
                      state={outwardState}
                      source={outwardSource}
                      selectedId={selectedOutwardTrain?.id ?? null}
                      onSelect={(option) =>
                        setOutwardSelection({
                          key: outwardKey,
                          train: toTrainOption(option, isRealSource(outwardSource)),
                        })
                      }
                      onRetry={handleRetry}
                      theme={theme}
                    />
                  </View>
                );
              })()}

              {tripType === 'round' && (
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Train retour</Text>
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    {rando.endStation} → {departurePoint.name}, à partir de {returnStartTime}.
                  </Text>

                  <TransitOptionsList
                    options={returnOptions}
                    state={returnState}
                    source={returnSource}
                    selectedId={selectedReturnTrain?.id ?? null}
                    onSelect={(option) =>
                      setReturnSelection({
                        key: returnKey,
                        train: toTrainOption(option, isRealSource(returnSource)),
                      })
                    }
                    onRetry={handleRetry}
                    theme={theme}
                  />
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* CTA collant */}
        {phase === 'config' ? (
          datesValidated && openSection !== 'dates' ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 34) }]}>
              <Button
                title="Lancer la recherche"
                variant="primary"
                disabled={!canSearch}
                onPress={() => setPhase('results')}
              />
            </View>
          ) : null
        ) : (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 34) }]}>
            <Button
              title="Finaliser ma planification"
              variant="primary"
              disabled={!selectedOutwardTrain || (tripType === 'round' && !selectedReturnTrain)}
              onPress={handleFinalize}
            />
          </View>
        )}
      </View>

      <PassengersBottomSheet
        ref={passengersSheetRef}
        passengers={passengers}
        onChange={setPassengers}
        onValidate={() => passengersSheetRef.current?.dismiss()}
      />

      <AutoReturnInfoSheet
        ref={autoReturnSheetRef}
        onDismiss={() => autoReturnSheetRef.current?.dismiss()}
      />

      <DeparturePointSheet
        ref={departureSheetRef}
        currentLocation={gpsDeparture}
        onSelect={(point) => {
          setCustomDeparture(point);
          departureSheetRef.current?.dismiss();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
  },
  // En-tête fixe : ne défile jamais, conformément à la structure Figma où le
  // bloc actions + carte origine/destination est hors du conteneur scrollable.
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionsSpacer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  cardExpanded: {
    flex: 1,
  },
  calendarScroll: {
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    gap: 12,
    paddingBottom: 16,
  },
  passengerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
  },
  passengerChipText: {
    // Heading/Medium dans Figma : Bricolage Grotesque Medium 14, et non Satoshi.
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  journeyColumn: {
    flex: 1,
    gap: 12,
  },
  journeyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journeyText: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  journeySeparator: {
    height: 1,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  departurePills: {
    gap: 6,
    paddingTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
  },
  sectionSummary: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  helperText: {
    fontFamily: 'Satoshi',
    fontSize: 13,
    lineHeight: 18,
  },
  passengersInline: {
    paddingTop: 4,
  },
  autoReturnBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  autoReturnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoReturnTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  autoReturnBody: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 18,
  },
  autoReturnLink: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentedItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  segmentedText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timeModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timeModePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 100,
  },
  trainOptionsList: {
    gap: 8,
  },
  listMessage: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  listMessageText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  retryBtnText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  fallbackNotice: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 2,
  },
  trainCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
  },
  trainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainCardTime: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  trainCardPrice: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  trainCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainCardMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  trainCardDuration: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
});
