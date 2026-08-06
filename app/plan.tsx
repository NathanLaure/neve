import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, Check, ChevronRight, CheckCircle2, RefreshCw } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Skeleton from '@/components/Skeleton';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, calculateDistanceKm } from '@/context/AdventureContext';
import { TrainOption } from '@/constants/RandosData';
import {
  calculateCo2Impact,
  fetchTransitOptions,
  findNearestStations,
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
/** On ne propose pas de retour au-delà : au-delà, les dessertes franciliennes se raréfient. */
const LATEST_RETURN_TIME_MINUTES = 21 * 60;

type LoadState = 'loading' | 'ready' | 'error';

interface DeparturePoint {
  name: string;
  latitude: number;
  longitude: number;
}

// Generate dynamic dates (next 7 days starting tomorrow)
const generateDates = () => {
  const dates = [];
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    // Format YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const isoString = `${yyyy}-${mm}-${dd}`;

    dates.push({
      isoString,
      displayString: date.toLocaleDateString('fr-FR', options),
      dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNum: date.getDate(),
    });
  }
  return dates;
};

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
 * le cas vide). Avant, l'écran se contentait d'un tableau vide et n'affichait
 * strictement rien — l'utilisateur restait bloqué sans explication.
 *
 * Habillage volontairement sobre : le design définitif attend les maquettes.
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
                {option.transfers === 0
                  ? 'direct'
                  : `${option.transfers} corresp.`}
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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { addAdventure, userLocationName, userLocation, hikes } = useAdventure();

  // Find the hike
  const rando = hikes.find((r) => r.id === randoId);

  // Flow State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const availableDates = useMemo(() => generateDates(), []);

  // Step 1 State: Dates
  const [selectedOutwardDate, setSelectedOutwardDate] = useState<string>(
    availableDates[0].isoString
  );
  const [selectedReturnDate, setSelectedReturnDate] = useState<string>(availableDates[0].isoString); // Default same day

  // Step 2 State: Departure Point
  const [departurePoint, setDeparturePoint] = useState<DeparturePoint>({
    name: userLocationName,
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  });

  // Heure souhaitée pour l'aller, et sens dans lequel la lire : « je pars après »
  // ou « je veux être arrivé avant ». Navitia traite les deux nativement, donc le
  // second mode ne coûte pas un appel de plus.
  const [outwardTime, setOutwardTime] = useState<string>(DEFAULT_OUTWARD_TIME);
  const [outwardTimeMode, setOutwardTimeMode] = useState<TimeMode>('departure');

  // Incrémenté par les boutons « Réessayer » pour relancer les effets de chargement.
  const [retryToken, setRetryToken] = useState(0);

  // Départ possible : la position de l'utilisateur, plus les gares réellement
  // proches de lui. Remplace la liste figée de trois terminus parisiens, qui
  // n'avait aucun sens pour quelqu'un habitant hors de Paris.
  const departureOptions = useMemo<DeparturePoint[]>(() => {
    const nearby = findNearestStations(userLocation.latitude, userLocation.longitude, 3, 15).map(
      (station) => ({
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
      })
    );
    return [
      {
        name: userLocationName,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
      ...nearby.filter((station) => station.name !== userLocationName),
    ];
  }, [userLocation, userLocationName]);

  // Itinéraires récupérés auprès du calculateur Île-de-France Mobilités.
  //
  // Chaque résultat et chaque sélection est étiqueté par la « clé » de la requête
  // qui l'a produit, et l'état affiché en découle. C'est plus robuste qu'un
  // setState('loading') en début d'effet : une réponse lente ne peut pas se
  // rattacher à une autre date ni à un autre point de départ, et la sélection de
  // l'utilisateur s'invalide d'elle-même quand la question change.
  const outwardKey = [
    rando?.id ?? '',
    departurePoint.latitude,
    departurePoint.longitude,
    selectedOutwardDate,
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

  // Heure à partir de laquelle chercher un retour : arrivée de l'aller + durée de
  // la rando, pour ne pas proposer un train que le randonneur ne peut pas prendre.
  // Sur un séjour de plusieurs jours, ce calcul n'a plus de sens : on retombe sur
  // une fin d'après-midi.
  const returnStartTime = useMemo(() => {
    if (!rando || !selectedOutwardTrain?.arrivalTime) return DEFAULT_RETURN_TIME;
    if (selectedReturnDate !== selectedOutwardDate) return DEFAULT_RETURN_TIME;

    const [hours, minutes] = selectedOutwardTrain.arrivalTime.split(':').map(Number);
    const readyAt = hours * 60 + minutes + Math.round((rando.durationHours || 0) * 60);
    const capped = Math.min(readyAt, LATEST_RETURN_TIME_MINUTES);
    return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
  }, [rando, selectedOutwardTrain, selectedOutwardDate, selectedReturnDate]);

  const returnKey = [
    rando?.id ?? '',
    departurePoint.latitude,
    departurePoint.longitude,
    selectedReturnDate,
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

  // Dépendances d'effet en valeurs primitives, jamais en objets : `hikes` est
  // rechargé par AdventureContext (sync realtime des favoris, retour au premier
  // plan), ce qui recrée l'objet `rando` à l'identique. Sur des objets, chaque
  // rechargement relancerait deux appels à PRIM pour rien — et le quota est à
  // 1 000 par jour.
  const startStationLat = rando?.startStationCoords?.latitude;
  const startStationLng = rando?.startStationCoords?.longitude;
  const endStationLat = rando?.endStationCoords?.latitude;
  const endStationLng = rando?.endStationCoords?.longitude;
  const startStationName = rando?.startStation;
  const endStationName = rando?.endStation;

  const departureName = departurePoint.name;
  const departureLat = departurePoint.latitude;
  const departureLng = departurePoint.longitude;

  // Aller : du point de départ choisi vers la gare de début de rando.
  useEffect(() => {
    if (startStationLat == null || startStationLng == null || !startStationName) return;

    // Une réponse lente ne doit jamais s'appliquer à une question devenue obsolète.
    let isStale = false;
    fetchTransitOptions({
      from: { latitude: departureLat, longitude: departureLng },
      to: { latitude: startStationLat, longitude: startStationLng },
      fromName: departureName,
      toName: startStationName,
      date: selectedOutwardDate,
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
    outwardKey,
    departureLat,
    departureLng,
    departureName,
    startStationLat,
    startStationLng,
    startStationName,
    selectedOutwardDate,
    outwardTime,
    outwardTimeMode,
  ]);

  // Retour : de la gare de fin de rando vers le point de départ.
  useEffect(() => {
    if (endStationLat == null || endStationLng == null || !endStationName) return;

    let isStale = false;
    fetchTransitOptions({
      from: { latitude: endStationLat, longitude: endStationLng },
      to: { latitude: departureLat, longitude: departureLng },
      fromName: endStationName,
      toName: departureName,
      date: selectedReturnDate,
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
    returnKey,
    departureLat,
    departureLng,
    departureName,
    endStationLat,
    endStationLng,
    endStationName,
    selectedReturnDate,
    returnStartTime,
  ]);

  const handleRetry = useCallback(() => setRetryToken((token) => token + 1), []);

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

  // Handle collapsible toggle
  const toggleStep = (step: 1 | 2 | 3) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveStep(step);
  };

  const handleConfirmDates = () => {
    toggleStep(2);
  };

  const handleConfirmOutward = () => {
    if (selectedOutwardTrain) {
      toggleStep(3);
    }
  };

  const handleFinalize = () => {
    if (selectedOutwardTrain && selectedReturnTrain) {
      const advId = addAdventure({
        randoId: rando.id,
        outwardDate: selectedOutwardDate,
        returnDate: selectedReturnDate,
        outwardTrain: selectedOutwardTrain,
        returnTrain: selectedReturnTrain,
        departureStationName: departurePoint.name,
        isBooked: false,
      });

      // Navigate to Recap screen
      router.replace(`/recap?adventureId=${advId}`);
    }
  };

  // Helper date labels
  const outwardDateLabel =
    availableDates.find((d) => d.isoString === selectedOutwardDate)?.displayString ||
    selectedOutwardDate;
  const returnDateLabel =
    availableDates.find((d) => d.isoString === selectedReturnDate)?.displayString ||
    selectedReturnDate;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Planification',
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.card },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerBack}>
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}>
        {/* Hike Header Summary */}
        {(() => {
          // Le CO₂ économisé porte sur le TRAJET (aller-retour depuis chez soi),
          // pas sur la longueur de la randonnée : comparer des kilomètres à pied
          // à des kilomètres en voiture n'avait aucun sens.
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
          const isTraverse = rando.startStation !== rando.endStation;

          return (
            <View
              style={[
                styles.hikeSummaryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.hikeSummaryLabel, { color: theme.textMuted }]}>
                  {"Planification de l'éco-rando"}
                </Text>
                {isTraverse && (
                  <View style={{ backgroundColor: theme.tint + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: theme.tint, fontSize: 11, fontFamily: 'Satoshi-Bold' }}>
                      🚶‍♂️ Traversée Gare à Gare
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.hikeSummaryTitle, { color: theme.text }]}>{rando.title}</Text>
              <Text style={[styles.hikeSummarySpecs, { color: theme.tint, marginTop: 4 }]}>
                🚆 {departurePoint.name} → {rando.startStation} {isTraverse ? `→ ${rando.endStation}` : ''} • 🥾 {rando.distance} ({rando.durationHours}h)
              </Text>
              
              {/* Eco CO2 Impact Banner */}
              <View
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: '#E8F5E9',
                  borderWidth: 1,
                  borderColor: '#C8E6C9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Text style={{ fontSize: 18 }}>🌱</Text>
                <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: 'Satoshi-Medium', flex: 1 }}>
                  <Text style={{ fontFamily: 'Satoshi-Bold' }}>-{co2.savedCo2Kg} kg CO₂ économisés</Text> en venant en train par rapport à la voiture !
                </Text>
              </View>
            </View>
          );
        })()}

        {/* STEP 1: DATES */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 1 ? (
            // Collapsed Step 1
            <Pressable onPress={() => toggleStep(1)} style={styles.collapsedHeader}>
              <View style={styles.stepNumLabelWrapper}>
                <View style={[styles.stepDoneBadge, { backgroundColor: theme.tint }]}>
                  <Check size={12} color="#FFFFFF" />
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>
                  Dates du voyage
                </Text>
              </View>
              <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                {selectedOutwardDate === selectedReturnDate
                  ? outwardDateLabel
                  : `Du ${outwardDateLabel} au ${returnDateLabel}`}
              </Text>
            </Pressable>
          ) : (
            // Expanded Step 1
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Sélectionner les dates
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 14 }]}>
                Date Aller :
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelectorRow}>
                {availableDates.map((date) => {
                  const isSelected = selectedOutwardDate === date.isoString;
                  return (
                    <Pressable
                      key={date.isoString}
                      onPress={() => {
                        setSelectedOutwardDate(date.isoString);
                        // Enforce return date >= outward date
                        if (new Date(selectedReturnDate) < new Date(date.isoString)) {
                          setSelectedReturnDate(date.isoString);
                        }
                      }}
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? theme.tint : theme.background,
                          borderColor: isSelected ? theme.tint : theme.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dateCardDay,
                          { color: isSelected ? '#FFFFFF' : theme.textMuted },
                        ]}>
                        {date.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardNum,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}>
                        {date.dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 16 }]}>
                Date Retour :
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelectorRow}>
                {availableDates.map((date) => {
                  // Must not be before outward date
                  const isDisabled = new Date(date.isoString) < new Date(selectedOutwardDate);
                  const isSelected = selectedReturnDate === date.isoString;

                  return (
                    <Pressable
                      key={date.isoString}
                      disabled={isDisabled}
                      onPress={() => setSelectedReturnDate(date.isoString)}
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? theme.tint : theme.background,
                          borderColor: isSelected ? theme.tint : theme.border,
                          opacity: isDisabled ? 0.3 : 1,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dateCardDay,
                          { color: isSelected ? '#FFFFFF' : theme.textMuted },
                        ]}>
                        {date.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardNum,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}>
                        {date.dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={handleConfirmDates}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, width: '100%' })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Valider les dates</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* STEP 2: OUTWARD JOURNEY */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 2 ? (
            // Collapsed Step 2
            <Pressable
              disabled={activeStep < 2}
              onPress={() => toggleStep(2)}
              style={[styles.collapsedHeader, { opacity: activeStep < 2 ? 0.5 : 1 }]}>
              <View style={styles.stepNumLabelWrapper}>
                <View
                  style={[
                    styles.stepDoneBadge,
                    { backgroundColor: selectedOutwardTrain ? theme.tint : theme.border },
                  ]}>
                  {selectedOutwardTrain ? (
                    <Check size={12} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumberTextCollapsed, { color: theme.textMuted }]}>
                      2
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>Train aller</Text>
              </View>
              {selectedOutwardTrain && (
                <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                  {selectedOutwardTrain.time} ({selectedOutwardTrain.price.toFixed(2)}€)
                </Text>
              )}
            </Pressable>
          ) : (
            // Expanded Step 2
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Choisir le train aller
                </Text>
              </View>

              <Text style={[styles.stepHelperText, { color: theme.textMuted }]}>
                Trajet de {departurePoint.name} vers {rando.startStation} le {outwardDateLabel},{' '}
                {outwardTimeMode === 'arrival'
                  ? `en arrivant avant ${outwardTime}`
                  : `en partant après ${outwardTime}`}
                .
              </Text>

              {/* Departure Point Changer */}
              <View
                style={[
                  styles.stationSelector,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}>
                <Text style={[styles.stationSelectorText, { color: theme.text }]}>
                  Point de départ :
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}>
                  {departureOptions.map((option) => {
                    const isSel = departurePoint.name === option.name;
                    return (
                      <Pressable
                        key={option.name}
                        onPress={() => setDeparturePoint(option)}
                        style={[
                          styles.stationPill,
                          {
                            backgroundColor: isSel ? theme.tint : theme.card,
                            borderColor: isSel ? theme.tint : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.stationPillText,
                            { color: isSel ? '#FFFFFF' : theme.text },
                          ]}>
                          {option.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Horaire souhaité + sens de lecture (partir après / arriver avant) */}
              <View
                style={[
                  styles.stationSelector,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}>
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
                            backgroundColor: isSel ? theme.tint : theme.card,
                            borderColor: isSel ? theme.tint : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.stationPillText,
                            { color: isSel ? '#FFFFFF' : theme.text },
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
                  contentContainerStyle={{ gap: 6 }}>
                  {SELECTABLE_TIMES.map((time) => {
                    const isSel = outwardTime === time;
                    return (
                      <Pressable
                        key={time}
                        onPress={() => setOutwardTime(time)}
                        style={[
                          styles.stationPill,
                          {
                            backgroundColor: isSel ? theme.tint : theme.card,
                            borderColor: isSel ? theme.tint : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.stationPillText,
                            { color: isSel ? '#FFFFFF' : theme.text },
                          ]}>
                          {time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

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

              <Pressable
                disabled={!selectedOutwardTrain}
                onPress={handleConfirmOutward}
                style={({ pressed }) => ({
                  opacity: selectedOutwardTrain ? (pressed ? 0.85 : 1) : 0.5,
                  width: '100%',
                })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Valider le train aller</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* STEP 3: RETURN JOURNEY */}
        <View
          style={[
            styles.stepContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          {activeStep !== 3 ? (
            // Collapsed Step 3
            <Pressable
              disabled={activeStep < 3}
              onPress={() => toggleStep(3)}
              style={[styles.collapsedHeader, { opacity: activeStep < 3 ? 0.5 : 1 }]}>
              <View style={styles.stepNumLabelWrapper}>
                <View
                  style={[
                    styles.stepDoneBadge,
                    { backgroundColor: selectedReturnTrain ? theme.tint : theme.border },
                  ]}>
                  {selectedReturnTrain ? (
                    <Check size={12} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumberTextCollapsed, { color: theme.textMuted }]}>
                      3
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepTitleCollapsed, { color: theme.text }]}>Train retour</Text>
              </View>
              {selectedReturnTrain && (
                <Text style={[styles.collapsedSummaryText, { color: theme.tint }]}>
                  {selectedReturnTrain.time} ({selectedReturnTrain.price.toFixed(2)}€)
                </Text>
              )}
            </Pressable>
          ) : (
            // Expanded Step 3
            <View style={styles.expandedContent}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepTitleExpanded, { color: theme.text }]}>
                  Choisir le train retour
                </Text>
              </View>

              <Text style={[styles.stepHelperText, { color: theme.textMuted }]}>
                Trajet de {rando.endStation} vers {departurePoint.name} le {returnDateLabel}, à
                partir de {returnStartTime}.
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

              <Pressable
                disabled={!selectedReturnTrain}
                onPress={handleFinalize}
                style={({ pressed }) => ({
                  opacity: selectedReturnTrain ? (pressed ? 0.85 : 1) : 0.5,
                  width: '100%',
                })}>
                <View style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.confirmBtnText}>Finaliser ma planification</Text>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Satoshi',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerBack: {
    padding: 8,
    marginRight: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  hikeSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  hikeSummaryLabel: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hikeSummaryTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 6,
  },
  hikeSummarySpecs: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNumLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumberTextCollapsed: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  stepDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepTitleCollapsed: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 15,
    fontWeight: '700',
  },
  collapsedSummaryText: {
    fontFamily: 'Satoshi',
    fontSize: 13,
    fontWeight: '800',
  },
  expandedContent: {
    width: '100%',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitleExpanded: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
  },
  stepHelperText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  customDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  customDateInputText: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateSelectorRow: {
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 58,
    height: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateCardDay: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateCardNum: {
    fontFamily: 'Satoshi',
    fontSize: 18,
    fontWeight: '850',
  },
  stationSelector: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  stationSelectorText: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  stationPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timeModePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stationPillText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  trainOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  listMessage: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 16,
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
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '800',
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
    fontFamily: 'Satoshi',
    fontSize: 16,
    fontWeight: '800',
  },
  trainCardPrice: {
    fontFamily: 'Satoshi',
    fontSize: 15,
    fontWeight: '850',
  },
  trainCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainCardMeta: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '600',
  },
  trainCardDuration: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '500',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#1F5F3E',
  },
  confirmBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
