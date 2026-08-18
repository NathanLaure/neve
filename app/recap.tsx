import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Plus,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import ScreenFooter, { useScreenFooterPadding } from '@/components/ScreenFooter';
import { useAdventure, isOneWayAdventure } from '@/context/AdventureContext';
import { MOCK_RANDOS } from '@/constants/RandosData';
import { buildTrainlineSearchUrl, openBookingProvider } from '@/services/bookingService';
import { fromTrainOption } from '@/services/transitService';
import { usePlanDraft } from '@/context/PlanDraftContext';

export default function RecapScreen() {
  const { adventureId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  // Le footer est en `position: absolute` : il ne prend aucune place dans le flux.
  // Ce cale-pied suit son padding bas, plus la hauteur de ses boutons.
  const scrollBottomClearance = useScreenFooterPadding() + 112;

  const { plannedAdventures, updateAdventure, hikes, loadHikeDetail } = useAdventure();
  const { restoreForReturn } = usePlanDraft();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectProvider, setRedirectProvider] = useState<'trainline' | 'sncf' | 'idf'>(
    'trainline'
  );

  // Expanded details state for timeline steps
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Find the adventure
  const adventure = plannedAdventures.find((adv) => adv.id === adventureId);
  const rando = React.useMemo(() => {
    if (!adventure) return null;
    const found = hikes.find((r) => r.id === adventure.randoId) || MOCK_RANDOS.find((r) => r.id === adventure.randoId);
    if (found) return found;
    if (adventure.hikeSnapshot) {
      return {
        id: adventure.randoId,
        title: adventure.hikeSnapshot.title,
        imageUrl: adventure.hikeSnapshot.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        startStation: adventure.hikeSnapshot.startStation,
        startStationCoords: { latitude: 0, longitude: 0 },
        endStation: adventure.hikeSnapshot.endStation || adventure.hikeSnapshot.startStation,
        endStationCoords: { latitude: 0, longitude: 0 },
        distance: adventure.hikeSnapshot.distance,
        durationHours: adventure.hikeSnapshot.durationHours,
        difficulty: adventure.hikeSnapshot.difficulty,
        elevation: adventure.hikeSnapshot.elevation || 'Plat',
        weatherTemp: adventure.hikeSnapshot.weatherTemp || '18°C',
        weatherIcon: adventure.hikeSnapshot.weatherIcon || '☀️',
        trainDurationMinutes: 45,
        trainType: 'Transilien / RER',
        priceEst: 0,
        gpxTrace: [],
        trainOptionsGo: [],
        trainOptionsBack: [],
        description: '',
      } as any;
    }
    return null;
  }, [adventure, hikes]);

  React.useEffect(() => {
    if (adventure && !hikes.some((h) => h.id === adventure.randoId)) {
      loadHikeDetail(adventure.randoId);
    }
  }, [adventure, hikes, loadHikeDetail]);

  if (!adventure || !rando) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Réservation introuvable</Text>
        <Pressable onPress={() => router.replace('/')}>
          <View style={[styles.backBtn, { backgroundColor: theme.tint }]}>
            <Text style={styles.backBtnText}>{"Retourner à l'Explorer"}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const isIDF = rando.trainType.toLowerCase().includes('transilien');

  // Build the Trainline search link
  const handleOpenTrainline = async () => {
    setRedirectProvider('trainline');
    setIsRedirecting(true);

    const trainlineUrl = buildTrainlineSearchUrl({
      originName: adventure.departureStationName,
      destinationName: rando.startStation,
      outwardDate: adventure.outwardDate,
      outwardTime: adventure.outwardTrain.time,
      returnDate: adventure.returnDate,
      returnTime: adventure.returnTrain.time,
    });

    // Mark as booked in our local state
    updateAdventure(adventure.id, { isBooked: true });

    setTimeout(async () => {
      await openBookingProvider('trainline', trainlineUrl);
      setIsRedirecting(false);
    }, 1200); // Small delay to show redirect screen
  };

  const handleOpenIDF = async (provider: 'sncf' | 'idf') => {
    setRedirectProvider(provider);
    setIsRedirecting(true);

    // Mark as booked in our local state
    updateAdventure(adventure.id, { isBooked: true });

    setTimeout(async () => {
      await openBookingProvider(provider === 'sncf' ? 'sncf' : 'idfm');
      setIsRedirecting(false);
    }, 1200);
  };

  const handleBuyLater = () => {
    // Go to "Aventures" tab
    router.replace('/(tabs)/adventures');
  };

  /**
   * Ajout d'un retour à une aventure déjà enregistrée.
   *
   * L'aller retenu est réinjecté dans le brouillon, puis le calendrier s'ouvre
   * pour dater le retour — proposer des horaires avant que la date soit choisie
   * reviendrait à décider du jour à la place de l'utilisateur. La modale
   * enchaîne ensuite sur les trajets. L'aventure est corrigée à l'arrivée sur le
   * résumé, pas dupliquée : son identifiant repart avec le brouillon.
   */
  const handleAddReturn = () => {
    if (!adventure || !rando) return;

    restoreForReturn({
      startDate: adventure.outwardDate,
      endDate: null,
      outwardJourney: fromTrainOption(adventure.outwardTrain),
      outwardIsRealtime: adventure.outwardTrain.isRealtime ?? false,
      savedAdventureId: adventure.id,
    });

    router.push({
      pathname: '/plan/dates',
      params: {
        next: 'return',
        randoId: adventure.randoId,
        outwardId: adventure.outwardTrain.id,
        departureName: adventure.departureStationName,
        returnName: adventure.returnStationName ?? adventure.departureStationName,
        passengersCount: adventure.passengersCount,
        passengers: JSON.stringify(adventure.passengers ?? []),
        isReversed: String(adventure.isReversed ?? false),
      },
    });
  };

  const toggleExpandStep = (stepIdx: number) => {
    setExpandedStep(expandedStep === stepIdx ? null : stepIdx);
  };

  // Date labels
  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Récapitulatif de Voyage',
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.card },
          headerLeft: () => (
            <Pressable onPress={handleBuyLater} style={styles.headerBack}>
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      {isRedirecting ? (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Connexion sécurisée à{' '}
            {redirectProvider === 'trainline'
              ? 'Trainline'
              : redirectProvider === 'sncf'
                ? 'SNCF Connect'
                : 'IDF Mobilités'}
            ...
          </Text>
          <Text style={[styles.loadingSubText, { color: theme.textMuted }]}>
            {redirectProvider === 'trainline'
              ? `Nous préparons votre recherche de ${adventure.departureStationName} vers ${rando.startStation} pour le ${formatDate(adventure.outwardDate)}.`
              : `Redirection vers le site pour l'achat de vos billets.`}
          </Text>
        </View>
      ) : (
        <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: adventure.isBooked ? theme.greenBadge : theme.orangeBadge,
                  borderColor: adventure.isBooked ? theme.tint : theme.warning,
                },
              ]}>
              {adventure.isBooked ? (
                <CheckCircle2 size={22} color={theme.tint} />
              ) : (
                <AlertTriangle size={22} color={theme.warning} />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusTitle,
                    { color: adventure.isBooked ? theme.text : '#D35400' },
                  ]}>
                  {adventure.isBooked
                    ? 'Train Réservé • Prêt à Partir !'
                    : 'Action Requise : Réserver le Train'}
                </Text>
                <Text style={[styles.statusSub, { color: theme.textMuted }]}>
                  {adventure.isBooked
                    ? "Vos billets sont réservés. N'oubliez pas votre équipement !"
                    : 'Le trajet est planifié mais les billets ne sont pas encore achetés.'}
                </Text>
              </View>
            </View>

            {/* Transilien Warning Card */}
            {isIDF && (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: theme.blueBadge,
                    borderColor: theme.secondary,
                  },
                ]}>
                <Info size={22} color={theme.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: theme.text }]}>
                    Ticket Île-de-France (Navigo)
                  </Text>
                  <Text style={[styles.infoCardSub, { color: theme.textMuted }]}>
                    Les trajets Transilien nécessitent un chargement sur Passe Navigo. Ouvrez SNCF
                    Connect ou IDF Mobilités pour acheter et charger vos titres.
                  </Text>
                </View>
              </View>
            )}

            {/* Dynamic Voyage Map */}
            <View
              style={[
                styles.mapSection,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {"Carte de l'itinéraire"}
              </Text>
              <View style={[styles.journeyMap, { backgroundColor: theme.greenBadge }]}>
                {/* stylized dynamic trail rendering */}
                <View style={styles.topoGrid}>
                  <View
                    style={[
                      styles.topoLine,
                      {
                        borderStyle: 'solid',
                        borderColor: theme.border,
                        width: '100%',
                        top: '40%',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.topoLine,
                      {
                        borderStyle: 'solid',
                        borderColor: theme.border,
                        width: '100%',
                        top: '70%',
                      },
                    ]}
                  />
                </View>

                {/* Train Line */}
                <View
                  style={[
                    styles.mapLine,
                    {
                      borderColor: theme.secondary,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      width: '50%',
                      top: '55%',
                      left: '10%',
                      transform: [{ rotate: '-15deg' }],
                    },
                  ]}
                />

                {/* Walk Loop Trace */}
                <View style={[styles.walkLoop, { borderColor: theme.tint }]} />

                {/* Markers */}
                <View style={[styles.marker, { left: '10%', top: '55%' }]}>
                  <View style={[styles.markerDot, { backgroundColor: theme.secondary }]} />
                  <Text style={[styles.markerLabel, { color: theme.text }]}>
                    {adventure.departureStationName.replace('Paris ', '')}
                  </Text>
                </View>
                <View style={[styles.marker, { left: '60%', top: '40%' }]}>
                  <View style={[styles.markerDot, { backgroundColor: theme.tint }]} />
                  <Text style={[styles.markerLabel, { color: theme.text }]}>
                    {rando.startStation.replace('Gare de ', '')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Timeline Steps (Dates -> Train Aller -> Rando -> Train Retour) */}
            <View style={styles.timelineContainer}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, marginLeft: 16, marginBottom: 12 },
                ]}>
                Déroulé du voyage
              </Text>

              {/* STEP 1: TRAIN GO */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLineWrapper}>
                  <View style={[styles.timelineNode, { backgroundColor: theme.secondary }]} />
                  <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                </View>
                <View
                  style={[
                    styles.timelineCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <Pressable onPress={() => toggleExpandStep(1)} style={styles.timelineCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineStepLabel, { color: theme.textMuted }]}>
                        TRAIN ALLER • {formatDate(adventure.outwardDate)}
                      </Text>
                      <Text style={[styles.timelineStepTitle, { color: theme.text }]}>
                        {adventure.outwardTrain.time} : {adventure.departureStationName} →{' '}
                        {rando.startStation}
                      </Text>
                    </View>
                    {expandedStep === 1 ? (
                      <ChevronUp size={16} color={theme.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={theme.textMuted} />
                    )}
                  </Pressable>

                  {expandedStep === 1 && (
                    <View style={styles.timelineCardDetails}>
                      <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Type de Train :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.outwardTrain.type} ({adventure.outwardTrain.trainNumber})
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Durée du trajet :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.outwardTrain.duration}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Tarif estimé :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.outwardTrain.price.toFixed(2)}€
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push(`/plan?randoId=${rando.id}`)}
                        style={[styles.editInlineBtn, { borderColor: theme.border }]}>
                        <Text style={[styles.editInlineText, { color: theme.tint }]}>
                          Modifier ce trajet
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {/* STEP 2: THE RANDO */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLineWrapper}>
                  <View style={[styles.timelineNode, { backgroundColor: theme.tint }]} />
                  <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                </View>
                <View
                  style={[
                    styles.timelineCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <Pressable onPress={() => toggleExpandStep(2)} style={styles.timelineCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineStepLabel, { color: theme.textMuted }]}>
                        RANDONNÉE • {rando.distance} ({rando.durationHours}h)
                      </Text>
                      <Text style={[styles.timelineStepTitle, { color: theme.text }]}>
                        {rando.title}
                      </Text>
                    </View>
                    {expandedStep === 2 ? (
                      <ChevronUp size={16} color={theme.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={theme.textMuted} />
                    )}
                  </Pressable>

                  {expandedStep === 2 && (
                    <View style={styles.timelineCardDetails}>
                      <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Difficulté :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {rando.difficulty}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Dénivelé :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {rando.elevation}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Météo prévue :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {rando.weatherIcon} {rando.weatherTemp}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push(`/rando/${rando.id}`)}
                        style={[styles.editInlineBtn, { borderColor: theme.border }]}>
                        <Text style={[styles.editInlineText, { color: theme.tint }]}>
                          Voir la fiche rando
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {/* STEP 3: TRAIN BACK — en aller simple, il n'y en a pas : la fiche
                  propose de l'ajouter plutôt que d'afficher la copie de l'aller
                  que `returnTrain` porte alors. */}
              {isOneWayAdventure(adventure) ? (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLineWrapper}>
                    <View style={[styles.timelineNode, { backgroundColor: theme.border }]} />
                  </View>
                  <View
                    style={[
                      styles.timelineCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}>
                    <Text style={[styles.timelineStepLabel, { color: theme.textMuted }]}>
                      ALLER SIMPLE
                    </Text>
                    <Text style={[styles.timelineStepTitle, { color: theme.text }]}>
                      Aucun trajet retour planifié
                    </Text>
                    <Pressable
                      onPress={handleAddReturn}
                      style={[styles.addReturnBtn, { backgroundColor: theme.tint }]}>
                      <Plus size={16} color={theme.buttonTextOnBrand} />
                      <Text style={[styles.addReturnText, { color: theme.buttonTextOnBrand }]}>
                        Ajouter un trajet retour
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
              <View style={styles.timelineItem}>
                <View style={styles.timelineLineWrapper}>
                  <View style={[styles.timelineNode, { backgroundColor: theme.secondary }]} />
                </View>
                <View
                  style={[
                    styles.timelineCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <Pressable onPress={() => toggleExpandStep(3)} style={styles.timelineCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineStepLabel, { color: theme.textMuted }]}>
                        TRAIN RETOUR • {formatDate(adventure.returnDate)}
                      </Text>
                      <Text style={[styles.timelineStepTitle, { color: theme.text }]}>
                        {adventure.returnTrain.time} : {rando.endStation} →{' '}
                        {adventure.returnStationName ?? adventure.departureStationName}
                      </Text>
                    </View>
                    {expandedStep === 3 ? (
                      <ChevronUp size={16} color={theme.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={theme.textMuted} />
                    )}
                  </Pressable>

                  {expandedStep === 3 && (
                    <View style={styles.timelineCardDetails}>
                      <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Type de Train :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.returnTrain.type} ({adventure.returnTrain.trainNumber})
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Durée du trajet :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.returnTrain.duration}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>
                          Tarif estimé :
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.text }]}>
                          {adventure.returnTrain.price.toFixed(2)}€
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push(`/plan?randoId=${rando.id}`)}
                        style={[styles.editInlineBtn, { borderColor: theme.border }]}>
                        <Text style={[styles.editInlineText, { color: theme.tint }]}>
                          Modifier ce trajet
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
              )}
            </View>

            <View style={{ height: scrollBottomClearance }} />
          </ScrollView>

          {/* Booking Action Buttons */}
          <ScreenFooter surface="card">
            {isIDF ? (
              <View style={styles.idfButtonsContainer}>
                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => handleOpenIDF('sncf')}
                    style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
                    <View style={[styles.bookBtn, { backgroundColor: theme.tint, width: '100%' }]}>
                      <ExternalLink size={16} color="#FFFFFF" />
                      <Text style={styles.bookBtnText} numberOfLines={1}>
                        SNCF Connect
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => handleOpenIDF('idf')}
                    style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
                    <View
                      style={[styles.bookBtn, { backgroundColor: theme.secondary, width: '100%' }]}>
                      <ExternalLink size={16} color="#FFFFFF" />
                      <Text style={styles.bookBtnText} numberOfLines={1}>
                        IDF Mobilités
                      </Text>
                    </View>
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleBuyLater}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: '100%' })}>
                  <View style={[styles.laterBtnVertical, { borderColor: theme.border }]}>
                    <Text style={[styles.laterBtnText, { color: theme.text }]}>Plus tard</Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Pressable
                  onPress={handleBuyLater}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
                  <View style={[styles.laterBtn, { borderColor: theme.border, width: '100%' }]}>
                    <Text style={[styles.laterBtnText, { color: theme.text }]}>Plus tard</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={handleOpenTrainline}
                  style={({ pressed }) => ({ flex: 2.5, opacity: pressed ? 0.85 : 1 })}>
                  <View style={[styles.bookBtn, { backgroundColor: theme.tint, width: '100%' }]}>
                    <ExternalLink size={16} color="#FFFFFF" />
                    <Text style={styles.bookBtnText}>
                      {adventure.isBooked ? 'Réserver à nouveau' : 'Réserver (Trainline)'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}
          </ScreenFooter>
        </View>
      )}
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
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  statusTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  statusSub: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoCardTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  infoCardSub: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 16,
  },
  mapSection: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  journeyMap: {
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  topoGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  topoLine: {
    position: 'absolute',
    borderTopWidth: 1,
  },
  mapLine: {
    position: 'absolute',
  },
  walkLoop: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    left: '50%',
    top: '30%',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  markerLabel: {
    fontFamily: 'Satoshi',
    fontSize: 8,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  timelineLineWrapper: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginTop: 18,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    zIndex: 1,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStepLabel: {
    fontFamily: 'Satoshi',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timelineStepTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  timelineCardDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '600',
  },
  detailVal: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '700',
  },
  /* Plein et en couleur de marque, à la différence des « Modifier ce trajet » :
     ce n'est pas une retouche, c'est l'étape qui manque au voyage. */
  addReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  addReturnText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  editInlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  editInlineText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  laterBtn: {
    flex: 1,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  laterBtnText: {
    fontFamily: 'Satoshi',
    fontSize: 15,
    fontWeight: '800',
  },
  laterBtnVertical: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
    width: '100%',
  },
  idfButtonsContainer: {
    width: '100%',
  },
  bookBtn: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#1F5F3E',
  },
  bookBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  loadingSubText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
