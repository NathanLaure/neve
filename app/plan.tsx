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
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  EllipsisVertical,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  Undo2,
  User,
  X,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Skeleton from '@/components/Skeleton';
import { Button } from '@/components/Button';
import ScreenFooter from '@/components/ScreenFooter';
import { IconButton } from '@/components/IconButton';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { TrainOption } from '@/constants/RandosData';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { usePlanDraft, resolveEndDate } from '@/context/PlanDraftContext';
import { addDays, formatDateRangeSummary } from '@/components/plan/DateRangeCalendar';
import { SELECTABLE_TIMES } from '@/components/plan/TimePickerSheet';
import PassengersEditor from '@/components/plan/PassengersEditor';
import PassengersBottomSheet from '@/components/plan/PassengersBottomSheet';
import AutoReturnInfoSheet from '@/components/plan/AutoReturnInfoSheet';
import DeparturePointSheet from '@/components/plan/DeparturePointSheet';
import ItinerarySummary from '@/components/plan/ItinerarySummary';
import JourneyOptionsSheet from '@/components/plan/JourneyOptionsSheet';
import { ItineraryCard } from '@/components/plan/ItineraryCard';
import {
  Passenger,
  createDefaultPassengers,
  formatPassengerCount,
} from '@/types/passenger';
import {
  calculateCo2Impact,
  fetchTransitOptions,
  toTrainOption,
  TimeMode,
  TransitOption,
  TransitSource,
} from '@/services/transitService';

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
/** Les dates ne sont plus une section dépliable : elles ont leur propre modale. */
type OpenSection = 'passengers' | null;

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
  const returnSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const journeyOptionsSheetRef = useRef<BaseBottomSheetModalRef>(null);

  /* --- En-tête repliable au scroll -------------------------------------
   *
   * La carte d'itinéraire est le premier élément du contenu défilant : c'est le
   * ScrollView natif, et lui seul, qui la fait remonter puis disparaître sous la
   * barre d'actions. Rien n'est animé, rien ne se redimensionne pendant le geste.
   *
   * C'est la seule structure qui reste fluide. Tant que la carte vivait dans
   * l'en-tête, la replier faisait remonter le corps — donc le cadre du
   * ScrollView — pendant que le doigt le défilait. Or un défileur natif mesure
   * le geste dans son propre repère : en déplaçant ce repère sous le doigt, on
   * annule une partie du mouvement, et le défilement devient dur puis se bloque.
   *
   * Ne restent animés que les échanges de l'en-tête, qui ne touchent ni à la
   * mise en page ni au défileur.
   */
  const bodyScrollRef = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);
  // Hauteur réelle du bloc carte, mesurée : elle dépend de la variante (boucle,
  // traversée, avec ou sans lieu de retour) et de la taille de police système.
  const headerCardHeight = useSharedValue(0);

  const headerScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  /** 0 = carte entièrement visible, 1 = entièrement sortie sous la barre. */
  const collapse = useDerivedValue(() => {
    if (headerCardHeight.value <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY.value / headerCardHeight.value));
  });

  // Relais plutôt que fondu croisé : le titre s'efface sur la première moitié du
  // parcours, le résumé n'apparaît que sur la seconde. Les superposer à mi-course
  // donnerait deux textes à moitié transparents l'un sur l'autre.
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -8 * collapse.value }],
  }));

  const headerSummaryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: 8 * (1 - collapse.value) }],
  }));

  // La puce sort par la droite plutôt que de simplement s'effacer : hors de
  // l'écran elle ne capte plus les appuis, et le résumé récupère la largeur.
  // 200px : largement de quoi sortir la puce du bord droit quelle que soit sa
  // largeur. Une vue à opacité nulle reste tactile, il faut vraiment l'éloigner.
  const headerChipStyle = useAnimatedStyle(() => ({
    opacity: 1 - collapse.value,
    transform: [{ translateX: 200 * collapse.value }],
  }));

  // Configuration puis résultats. Les maquettes séparent les deux : la recherche
  // n'est lancée qu'au clic sur « Voir les trajets disponibles », ce qui évite
  // aussi de brûler du quota PRIM à chaque tape sur le calendrier.
  const [phase, setPhase] = useState<Phase>('config');
  // Ouverte d'emblée : la carte voyageurs reste masquée tant que les dates ne
  // sont pas validées, elle apparaît donc déjà dépliée le moment venu.
  const [openSection, setOpenSection] = useState<OpenSection>('passengers');

  /**
   * Changer de section ou de phase remplace tout le contenu : on repart du haut.
   * C'est bien le défilement qu'on remet à zéro, et non la seule valeur suivie —
   * les fausser l'une par rapport à l'autre afficherait un en-tête déplié devant
   * une carte déjà sortie de l'écran.
   */
  useEffect(() => {
    bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [openSection, phase]);

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

  // Lieu où l'on rentre le soir, quand ce n'est pas celui d'où l'on est parti :
  // on part de chez soi et on rejoint de la famille, on enchaîne sur un autre
  // séjour… Tant qu'il est nul, le retour ramène au point de départ.
  const [returnPoint, setReturnPoint] = useState<DeparturePoint | null>(null);
  const arrivalPoint = returnPoint ?? departurePoint;

  const [passengers, setPassengers] = useState<Passenger[]>(createDefaultPassengers);

  // Sens de parcours. Sur une traversée (gare de fin ≠ gare de début), l'inverser
  // fait viser la gare de fin à l'aller et repartir de la gare de début au retour.
  // 156 des 431 randos franciliennes sont dans ce cas.
  const [isReversed, setIsReversed] = useState(false);

  // Les dates se choisissent dans la modale `/plan/dates`, une route frère de
  // celle-ci. Elles transitent par le brouillon partagé plutôt que par des
  // paramètres d'URL, qui imposeraient une synchronisation dans les deux sens.
  const { draft, setOutwardTime, resetDraft } = usePlanDraft();
  const { startDate, tripType, datesValidated, outwardTime } = draft;

  // Réinitialiser automatiquement les données stockées uniquement lors du changement de rando.
  const prevRandoIdRef = useRef<string | undefined>(rando?.id);
  useEffect(() => {
    if (prevRandoIdRef.current !== rando?.id) {
      prevRandoIdRef.current = rando?.id;
      resetDraft();
    }
  }, [rando?.id, resetDraft]);

  // Le sens de lecture de l'heure (« partir après » / « arriver avant ») ne se
  // règle qu'ici, en phase résultats : la modale des dates ne pose que la
  // question du départ.
  const [outwardTimeMode, setOutwardTimeMode] = useState<TimeMode>('departure');
  const [retryToken, setRetryToken] = useState(0);

  // Nombre de jours de marche, d'où découle la date de retour pré-remplie.
  const hikeDays = Math.max(1, Math.ceil((rando?.durationHours ?? 0) / HIKING_HOURS_PER_DAY));

  // Retour auto : départ + (jours de marche - 1). Une sortie à la journée revient
  // le soir même, une rando de 3 jours deux jours plus tard.
  const autoReturnDate = useMemo(
    () => (startDate ? addDays(startDate, hikeDays - 1) : null),
    [startDate, hikeDays]
  );

  const effectiveEndDate = resolveEndDate(draft, autoReturnDate);

  // Une rando qui commence et se termine à la même gare est une boucle :
  // l'inverser ne changerait rien, donc pas de bouton d'inversion.
  const isTraverse =
    !!rando && !!rando.endStation && rando.startStation !== rando.endStation;

  // Deux adresses sont en jeu : il faut dire laquelle est laquelle.
  const showPointPrefix = isTraverse || returnPoint !== null;

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

  /**
   * Ouvre le calendrier. La sélection, le type de trajet et le retour auto vivent
   * désormais dans `/plan/dates` : cet écran ne fait qu'afficher le résultat.
   */
  const openDatePicker = () => {
    router.push({ pathname: '/plan/dates', params: { randoId: rando?.id } });
  };

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

  const arrivalName = arrivalPoint.name;
  const arrivalLat = arrivalPoint.latitude;
  const arrivalLng = arrivalPoint.longitude;

  const outwardKey = [
    rando?.id ?? '',
    departureLat,
    departureLng,
    startStationLat ?? '',
    startStationLng ?? '',
    startStationName ?? '',
    startDate,
    outwardTime,
    outwardTimeMode,
    isReversed ? 'rev' : 'fwd',
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
    arrivalLat,
    arrivalLng,
    endStationLat ?? '',
    endStationLng ?? '',
    endStationName ?? '',
    effectiveEndDate ?? '',
    returnStartTime,
    isReversed ? 'rev' : 'fwd',
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
      to: { latitude: arrivalLat, longitude: arrivalLng },
      fromName: endStationName,
      toName: arrivalName,
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
    arrivalLat,
    arrivalLng,
    arrivalName,
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
      returnStationName: returnPoint?.name,
      isReversed,
      isBooked: false,
    });

    router.replace(`/recap?adventureId=${advId}`);
  };

  const dateSummary = formatDateRangeSummary(startDate, effectiveEndDate);
  const canSearch = datesValidated;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {/* En-tête FIXE : actions + carte origine/destination. Ne défile jamais. */}
        <View style={styles.header}>
          {/* La zone d'encoche fait partie de la barre, et non d'une marge du
              conteneur : c'est elle qui masque la carte qui remonte, il faut donc
              qu'elle soit opaque jusqu'au bord haut de l'écran. */}
          <View
            style={[
              styles.actions,
              { paddingTop: insets.top + 8, backgroundColor: theme.background },
            ]}>
            {/* Même bouton que la fiche rando (IconButton `circle`), seule la
                couleur change : fond clair sur cet écran, icône sombre. */}
            <IconButton
              variant="circle"
              icon={<ArrowLeft size={20} color={theme.buttonIconColor} />}
              style={{ backgroundColor: theme.buttonBgIcon }}
              onPress={() => (phase === 'results' ? setPhase('config') : router.back())}
            />
            {/* Titre et résumé se relaient au même endroit : le second est en
                absolu pour que la barre ne change pas de hauteur au passage. */}
            <View style={styles.headerCenter}>
              <Animated.Text
                style={[styles.headerTitle, { color: theme.text }, headerTitleStyle]}>
                Planification
              </Animated.Text>
              <Animated.View
                pointerEvents="none"
                style={[styles.headerSummary, headerSummaryStyle]}>
                <ItinerarySummary
                  isTraverse={isTraverse}
                  departureName={departurePoint.name?.trim() || 'Votre position'}
                  returnName={returnPoint?.name?.trim() || departurePoint.name?.trim() || 'Votre position'}
                  arrivalStationName={arrivalStation.name}
                  departBackStationName={isTraverse ? departBackStation.name : arrivalStation.name}
                />
              </Animated.View>
            </View>

            {/* En configuration, les voyageurs se règlent dans la carte « Qui part
                à l'aventure ? » : la puce ferait doublon. Elle reste en phase
                résultats, où cette carte n'est plus à l'écran. */}
            {phase === 'results' && (
              <Animated.View style={headerChipStyle}>
                <Pressable
                  onPress={() => passengersSheetRef.current?.present()}
                  style={[styles.passengerChip, { backgroundColor: theme.card }]}>
                  <User size={20} color={theme.text} />
                  <Text style={[styles.passengerChipText, { color: theme.text }]}>
                    {formatPassengerCount(passengers)}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Corps : une seule zone défilante, dont la carte d'itinéraire est le
            premier élément. C'est le défileur natif qui la fait sortir — voir le
            bloc « En-tête repliable au scroll ». */}
        <Animated.ScrollView
          ref={bodyScrollRef}
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: Math.max(insets.bottom, 34) },
          ]}
          onScroll={headerScrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {/* Carte d'itinéraire réutilisable (Figma 582:16283, 588:17244 & 590:17370) */}
          <View
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              if (height > 0) headerCardHeight.value = height;
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
              onSwapStations={() => setIsReversed((val) => !val)}
            />
          </View>

          {/* Quand partir à l'aventure ? (Figma 637:22958 vide / 650:33955 rempli) */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Quand partir à l’aventure ?
            </Text>
            <Pressable
              onPress={openDatePicker}
              style={[
                styles.dashedBox,
                {
                  borderColor: theme.borderStrong || '#989898',
                  borderStyle: datesValidated && startDate ? 'solid' : 'dashed',
                },
              ]}>
              <View style={styles.dashedBoxContent}>
                <CalendarDays
                  size={20}
                  color={datesValidated && startDate ? theme.tint : theme.text}
                />
                <Text
                  style={[
                    styles.dashedBoxLabel,
                    datesValidated && startDate
                      ? {
                          fontFamily: 'BricolageGrotesque-SemiBold',
                          fontSize: 16,
                          color: theme.text,
                        }
                      : {
                          fontFamily: 'Satoshi-Medium',
                          fontSize: 14,
                          color: theme.textMuted,
                        },
                  ]}
                  numberOfLines={1}>
                  {datesValidated && startDate
                    ? `${dateSummary}, ${outwardTime}`
                    : 'Choisir une date'}
                </Text>
              </View>

              {datesValidated && startDate ? (
                <ChevronRight size={20} color={theme.text} />
              ) : (
                <View style={[styles.plusButton, { backgroundColor: theme.tint }]}>
                  <Plus size={16} color={theme.buttonTextOnBrand} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Qui part ? (Figma 650:33691) */}
          {phase === 'config' && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Qui part ?
              </Text>
              <PassengersEditor passengers={passengers} onChange={setPassengers} />
            </View>
          )}

          {/* Phase résultats : choix des trains, réutilise le mécanisme existant */}
          {phase === 'results' && (
            <View style={styles.resultsContent}>
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
                    {rando.endStation} → {arrivalPoint.name}, à partir de {returnStartTime}.
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
            </View>
          )}
        </Animated.ScrollView>

        {/* Barre d'action collante en bas d'écran. */}
        {phase === 'config' && (
          // Aligné sur les cartes : mêmes 24px de marge latérale que le corps de page,
          // au lieu des 20px partagés par les autres footers.
          <ScreenFooter variant="inline" style={styles.footer}>
            <Button
              title="Voir les trajets disponibles"
              variant="primary"
              disabled={!canSearch}
              onPress={() =>
                router.push({
                  pathname: '/plan/outward',
                  params: {
                    randoId: rando.id,
                    // Les coordonnées voyagent avec le nom : sans elles, les
                    // écrans suivants routent depuis le GPS et une adresse
                    // saisie à la main n'est plus qu'un libellé.
                    departureName: departurePoint.name,
                    departureLat: String(departurePoint.latitude),
                    departureLng: String(departurePoint.longitude),
                    // Lieu de retour, quand on ne rentre pas d'où l'on est parti.
                    // `arrivalPoint` retombe sur le départ le reste du temps.
                    returnName: arrivalPoint.name,
                    returnLat: String(arrivalPoint.latitude),
                    returnLng: String(arrivalPoint.longitude),
                    outwardDate: startDate,
                    outwardTime: outwardTime,
                    returnDate: effectiveEndDate ?? undefined,
                    returnTime: returnStartTime,
                    passengersCount: formatPassengerCount(passengers),
                    isReversed: String(isReversed),
                  },
                })
              }
            />
          </ScreenFooter>
        )}
      </View>

      <PassengersBottomSheet
        ref={passengersSheetRef}
        passengers={passengers}
        onChange={setPassengers}
        onValidate={() => passengersSheetRef.current?.dismiss()}
      />

      <AutoReturnInfoSheet ref={autoReturnSheetRef} />

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
  // Barre d'actions fixe : ne défile jamais. Opaque et posée au-dessus du corps,
  // c'est elle qui masque la carte d'itinéraire qui sort par le haut.
  header: {
    paddingHorizontal: 24,
    // Pas de marge haute : la zone d'encoche appartient à la barre elle-même,
    // faute de quoi la carte s'apercevrait dans la bande laissée transparente.
    zIndex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    // Opaque et au-dessus : c'est elle qui masque la carte qui remonte, d'où
    // l'impression que celle-ci passe dessous. Sans ça la carte lui passerait
    // par-dessus, les frères se peignant dans l'ordre du rendu.
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    // Le résumé fait deux lignes de 20 plus 2 d'interligne : sans cette hauteur
    // minimale il déborderait de la barre d'actions, calée sur ses boutons de 40.
    minHeight: 44,
  },
  headerSummary: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  resultsContent: {
    gap: 12,
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
  // Boîte de section, commune aux cartes « Quand partir » et « Qui part ».
  // Figma : radius 20, 20px horizontaux, 16px verticaux, ombre portée douce.
  card: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
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
  // Variante « Default » : padding 12 / gap 12 (spacing/12).
  journeyCardLoop: {
    gap: 12,
  },
  // Variante « Type4 » : la carte se resserre à 8 pour laisser respirer les deux
  // encarts qu'elle contient.
  journeyCardTraverse: {
    padding: 8,
  },
  // Encart posé sur le fond de page : spacing/8 + border-radius/S.
  journeyInset: {
    padding: 8,
    borderRadius: 8,
  },
  journeyLine: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Body/Medium : Satoshi Medium 14, interligne 1.4. Sans `flex` : ce texte sert
  // aussi bien dans un conteneur en colonne — où une base nulle effondrerait sa
  // hauteur — que comme enfant direct d'une rangée, cas traité par `journeyTextGrow`.
  journeyText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  // Enfant direct d'une rangée : occupe la largeur restante pour se tronquer
  // proprement au lieu de pousser ses voisins.
  journeyTextGrow: {
    flex: 1,
  },
  // Body/Large : Satoshi Medium 16, interligne 1.5. Départ et retour sont d'un
  // cran au-dessus des deux extrémités du sentier.
  journeyPointText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  // La zone de texte prend toute la largeur restante pour que la tape porte sur
  // toute la ligne, et non sur les seuls caractères.
  journeyLabelPress: {
    flex: 1,
    justifyContent: 'center',
  },
  // Figma pose un fond `buttons/bg-btn-icon` sur ces boutons, mais il vaut la
  // même valeur que l'encart qui les porte dans les deux thèmes : invisible.
  //
  // `marginLeft: 'auto'` plaque le bouton contre le bord droit sans dépendre du
  // libellé voisin : il reste à droite même si celui-ci ne s'étire pas.
  journeyInlineButton: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 100,
  },
  journeySeparator: {
    height: 1,
    borderRadius: 100,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointToPointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointToPointContent: {
    flex: 1,
    gap: 4,
  },
  pointToPointBlock: {
    gap: 4,
  },
  // Body/Extra-small : Satoshi Medium 10, interligne 1.35.
  pointToPointLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 14,
  },
  pointToPointStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointToPointDivider: {
    height: 1,
    width: '100%',
    borderRadius: 100,
  },
  stationBadge: {
    width: 16,
    height: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  swapButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 100,
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
  dashedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 48,
    gap: 8,
  },
  dashedBoxContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashedBoxLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 24,
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
