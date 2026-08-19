import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, EllipsisVertical, Plus, Share2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';
import ScreenFooter, { useScreenFooterPadding } from '@/components/ScreenFooter';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import {
  formatAdventureRange,
  formatDayMonth,
  formatFullDate,
  toISODate,
} from '@/components/plan/DateRangeCalendar';
import AdventureJourneyCard from '@/components/plan/AdventureJourneyCard';
import AdventureHikeCard from '@/components/plan/AdventureHikeCard';
import AdventureStepConnector, {
  AdventureTimelineCaption,
} from '@/components/plan/AdventureStepConnector';
import AdventureActionsSheet from '@/components/plan/AdventureActionsSheet';
import BuyTicketsSheet from '@/components/plan/BuyTicketsSheet';
import JourneyDetailSheet from '@/components/plan/JourneyDetailSheet';
import { useAdventure, isOneWayAdventure } from '@/context/AdventureContext';
import { usePlanDraft } from '@/context/PlanDraftContext';
import { MOCK_RANDOS } from '@/constants/RandosData';
import {
  BookingProvider,
  buildTrainlineSearchUrl,
  isFullyCoveredByNavigo,
  openBookingProvider,
} from '@/services/bookingService';
import {
  buildAdventureEdit,
  buildAdventurePlanParams,
  suggestReturnTime,
} from '@/services/adventureEditing';
import { buildAdventureShare } from '@/services/adventureSharing';
import { fromTrainOption, toTrainOption } from '@/services/transitService';
import {
  allPassengersHave,
  createDefaultPassengers,
  formatPassengerCount,
  normalizePassengers,
} from '@/types/passenger';
import { showToast } from '@/utils/toast';

/**
 * Fiche d'une aventure enregistrée.
 *
 * Même récit que le résumé de planification, et volontairement la même mise en
 * page : c'est le même voyage, il ne doit pas changer d'allure une fois rangé
 * dans « Aventures ». Ce qui change est la source — l'aventure en base et non le
 * brouillon — et les issues : rien à enregistrer ici, seulement des billets à
 * prendre s'ils ne l'ont pas été, et des trajets à corriger.
 */
export default function RecapScreen() {
  const { adventureId } = useLocalSearchParams<{ adventureId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { plannedAdventures, updateAdventure, hikes, loadHikeDetail } = useAdventure();
  const { draft, restoreForEdit, restoreForReturn, resetDraft } = usePlanDraft();

  const buySheetRef = useRef<BaseBottomSheetModalRef>(null);
  const journeyDetailSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
  // Une seule feuille de détail pour les deux trajets, comme sur les écrans de
  // choix : c'est le trajet dont on vient d'ouvrir le détail qui la remplit.
  const [detailedPhase, setDetailedPhase] = useState<'outward' | 'return'>('outward');

  const adventure = plannedAdventures.find((item) => item.id === adventureId) ?? null;

  /*
   * Randonnée de l'aventure, avec deux replis : le jeu d'essai, puis l'instantané
   * enregistré avec l'aventure. Une sortie passée doit rester lisible même si son
   * sentier a disparu du catalogue.
   */
  const rando = useMemo(() => {
    if (!adventure) return null;

    const found =
      hikes.find((item) => item.id === adventure.randoId) ||
      MOCK_RANDOS.find((item) => item.id === adventure.randoId);
    if (found) return found;

    if (adventure.hikeSnapshot) {
      return {
        id: adventure.randoId,
        title: adventure.hikeSnapshot.title,
        imageUrl:
          adventure.hikeSnapshot.imageUrl ||
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
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
    if (adventure && !hikes.some((item) => item.id === adventure.randoId)) {
      loadHikeDetail(adventure.randoId);
    }
  }, [adventure, hikes, loadHikeDetail]);

  const isOneWay = adventure ? isOneWayAdventure(adventure) : false;

  /* Les trajets enregistrés relus comme des itinéraires : c'est la forme qu'attendent
     les cartes et la feuille de détail, partagées avec le parcours de planification. */
  const outwardJourney = useMemo(
    () => (adventure ? fromTrainOption(adventure.outwardTrain) : null),
    [adventure]
  );
  const returnJourney = useMemo(
    () => (adventure && !isOneWay ? fromTrainOption(adventure.returnTrain) : null),
    [adventure, isOneWay]
  );

  const outwardDate = adventure?.outwardDate ?? null;
  const returnDate = adventure && !isOneWay ? adventure.returnDate : null;

  const isReversed = adventure?.isReversed ?? false;

  // Gares du sentier, dans le sens de parcours retenu — mêmes règles que les
  // écrans aller et retour, dont cette fiche n'est que la relecture.
  const arrivalStationName = isReversed ? (rando?.endStation ?? '') : (rando?.startStation ?? '');
  const departBackStationName = isReversed
    ? (rando?.startStation ?? '')
    : (rando?.endStation ?? rando?.startStation ?? '');

  const departureName = adventure?.departureStationName || 'Votre position';
  const returnName = adventure?.returnStationName || departureName;

  const passengers = useMemo(
    () => normalizePassengers(adventure?.passengers) ?? createDefaultPassengers(),
    [adventure?.passengers]
  );

  const isPastAdventure = adventure
    ? (adventure.returnDate || adventure.outwardDate) < toISODate(new Date())
    : false;

  /*
   * Correction revenue d'un écran de choix.
   *
   * Elle s'applique ici, à l'écran qui possède la fiche : le brouillon porte
   * l'itinéraire retenu et l'identifiant de cette aventure, il ne manque que de
   * l'écrire. Sans ça, corriger un trajet depuis cette page n'aurait laissé
   * aucune trace — c'est le résumé qui enregistrait, et on ne repasse plus par lui.
   *
   * Revenir sans avoir rien choisi ne déclenche rien : `buildAdventureEdit`
   * réinjecte les trajets existants, la comparaison les retrouve identiques. Et
   * l'écriture rend la comparaison vraie, l'effet ne se rejoue pas.
   */
  React.useEffect(() => {
    const { savedAdventureId, outwardJourney: nextOutward, returnJourney: nextReturn } = draft;
    if (!adventure || savedAdventureId !== adventure.id || !nextOutward) return;

    const nextIsOneWay = !nextReturn;
    const nextOutwardDate = draft.startDate ?? adventure.outwardDate;
    const nextReturnDate = nextIsOneWay
      ? nextOutwardDate
      : (draft.endDate ?? adventure.returnDate);

    const unchanged =
      adventure.outwardTrain.id === nextOutward.id &&
      adventure.returnTrain.id === (nextReturn ?? nextOutward).id &&
      adventure.outwardDate === nextOutwardDate &&
      adventure.returnDate === nextReturnDate &&
      (adventure.isOneWay ?? false) === nextIsOneWay;

    if (unchanged) return;

    updateAdventure(adventure.id, {
      outwardDate: nextOutwardDate,
      returnDate: nextReturnDate,
      outwardTrain: toTrainOption(nextOutward, draft.outwardIsRealtime),
      // En aller simple, `returnTrain` recopie l'aller : le modèle en exige un,
      // c'est `isOneWay` qui dit qu'il n'a jamais été planifié.
      returnTrain: toTrainOption(
        nextReturn ?? nextOutward,
        nextReturn ? draft.returnIsRealtime : draft.outwardIsRealtime
      ),
      isOneWay: nextIsOneWay,
    });

    const returnWasAdded = (adventure.isOneWay ?? false) && !nextIsOneWay;
    showToast.success(
      returnWasAdded ? 'Retour ajouté' : 'Aventure mise à jour',
      returnWasAdded
        ? 'Ton voyage est désormais un aller-retour.'
        : 'Ta fiche a été corrigée.'
    );
  }, [adventure, draft, updateAdventure]);

  const handleShare = useCallback(async () => {
    if (!adventure || !rando) return;

    const share = buildAdventureShare(adventure, {
      hikeTitle: rando.title,
      isPast: isPastAdventure,
    });
    // Le jeton est enregistré avant l'envoi, sans quoi un second partage de la
    // même aventure pointerait vers une autre adresse.
    if (share.isNewToken) updateAdventure(adventure.id, { shareToken: share.shareToken });

    try {
      await Share.share({ title: share.title, message: share.message, url: share.url });
    } catch (error) {
      console.warn('Partage impossible :', error);
    }
  }, [adventure, isPastAdventure, rando, updateAdventure]);

  const handleOpenProvider = useCallback(
    async (provider: BookingProvider) => {
      if (!adventure) return;

      const url =
        provider === 'trainline' && outwardDate
          ? buildTrainlineSearchUrl({
              originName: departureName,
              destinationName: arrivalStationName,
              outwardDate,
              outwardTime: outwardJourney?.departureTime ?? '08:00',
              returnDate,
              returnTime: returnJourney?.departureTime ?? null,
            })
          : undefined;

      const opened = await openBookingProvider(provider, url);
      // Le distributeur ne nous dit pas si l'achat a abouti : on note seulement
      // que la démarche est engagée, l'utilisateur reste maître de l'état depuis
      // la feuille d'options.
      if (opened) updateAdventure(adventure.id, { isBooked: true });
    },
    [
      adventure,
      arrivalStationName,
      departureName,
      outwardDate,
      outwardJourney,
      returnDate,
      returnJourney,
      updateAdventure,
    ]
  );

  const handleBuyDone = useCallback(
    (allHaveNavigo?: boolean) => {
      buySheetRef.current?.dismiss();
      if (allHaveNavigo && adventure) updateAdventure(adventure.id, { isBooked: true });
      showToast.success(
        'Aventure prête !',
        allHaveNavigo
          ? 'Pass Navigo validé pour tous les randonneurs.'
          : 'Tes billets et trajets sont enregistrés.'
      );
    },
    [adventure, updateAdventure]
  );

  const handleOpenDetails = useCallback((phase: 'outward' | 'return') => {
    setDetailedPhase(phase);
    journeyDetailSheetRef.current?.present();
  }, []);

  /*
   * Correction d'un trajet.
   *
   * Toujours en poussant : aucun écran de choix ne se trouve sous cette fiche,
   * contrairement au résumé atteint au bout du parcours de planification. Le
   * brouillon est posé au passage, et le résumé qui sortira de la correction
   * mettra cette aventure à jour plutôt que d'en déposer une seconde.
   */
  const handleModify = useCallback(
    (phase: 'outward' | 'return') => {
      journeyDetailSheetRef.current?.dismiss();
      if (!adventure) return;

      const planParams = buildAdventurePlanParams(adventure);
      restoreForEdit(buildAdventureEdit(adventure));

      if (phase === 'outward') {
        router.push({
          pathname: '/plan/outward',
          params: { ...planParams, editOnly: 'outward' },
        });
      } else {
        router.push({
          pathname: '/plan/return',
          params: {
            ...planParams,
            outwardId: adventure.outwardTrain.id,
            editOnly: 'return',
          },
        });
      }
    },
    [adventure, restoreForEdit, router]
  );

  /**
   * Ajout d'un retour à une aventure en aller simple.
   *
   * L'aller retenu est réinjecté dans le brouillon, puis le calendrier s'ouvre
   * pour dater le retour — proposer des horaires avant que la date soit choisie
   * reviendrait à décider du jour à la place de l'utilisateur. La modale enchaîne
   * ensuite sur les trajets. L'aventure est corrigée à l'arrivée sur le résumé,
   * pas dupliquée : son identifiant repart avec le brouillon.
   */
  const handleAddReturn = useCallback(() => {
    if (!adventure) return;

    restoreForReturn({
      startDate: adventure.outwardDate,
      endDate: null,
      outwardJourney: fromTrainOption(adventure.outwardTrain),
      outwardIsRealtime: adventure.outwardTrain.isRealtime ?? false,
      savedAdventureId: adventure.id,
    });

    /* `editOnly` traverse le calendrier, qui relaie ses paramètres : l'écran de
       choix ne doit pas rester dans la pile derrière le résumé, sans quoi le
       retour arrière y ramènerait au lieu de rendre la main à cette fiche. */
    router.push({
      pathname: '/plan/dates',
      params: {
        ...buildAdventurePlanParams(adventure),
        next: 'return',
        editOnly: 'return',
        outwardId: adventure.outwardTrain.id,
        /* En aller simple, `returnTrain` recopie l'aller : le `returnTime` des
           paramètres vaut l'heure du départ du matin. On lui substitue la fin
           estimée de la marche, seule heure de retour qui ait un sens. */
        returnTime: suggestReturnTime(adventure.outwardTrain.arrivalTime, rando?.durationHours),
      },
    });
  }, [adventure, restoreForReturn, router]);

  /**
   * Repartir sur ce sentier.
   *
   * Seule issue d'une sortie passée : ses trajets ne se corrigent plus, mais rien
   * n'empêche d'y retourner. Le brouillon est remis à neuf — sans quoi son
   * `savedAdventureId` ferait écraser l'aventure passée par la nouvelle, au lieu
   * d'en déposer une seconde.
   */
  const handleReplan = useCallback(() => {
    if (!rando) return;
    resetDraft();
    router.push(`/plan?randoId=${rando.id}`);
  }, [rando, resetDraft, router]);

  /*
   * En-tête repliable, sur le patron du résumé : le grand titre défile avec le
   * contenu et cède sa place à une version compacte, posée entre les boutons de
   * la barre fixe.
   *
   * La hauteur du bloc est mesurée et non codée en dur : elle dépend de la
   * longueur du nom de commune et de la taille de police système.
   */
  const scrollY = useSharedValue(0);
  const titleBlockHeight = useSharedValue(0);

  const headerScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  /** 0 = titre entièrement visible, 1 = entièrement sorti par le haut. */
  const collapse = useDerivedValue(() => {
    if (titleBlockHeight.value <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY.value / titleBlockHeight.value));
  });

  // Relais et non fondu croisé : le grand titre s'efface sur la première moitié
  // de la course, le compact n'arrive que sur la seconde — sinon deux titres à
  // demi transparents se superposent à mi-chemin.
  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: 8 * (1 - collapse.value) }],
  }));

  /*
   * Le pied de page flotte au-dessus du contenu : la liste réserve elle-même la
   * place du bouton d'achat, plus de quoi laisser respirer la légende de fin.
   *
   * `useScreenFooterPadding` comptabilise déjà la barre système : il reste donc
   * la seule source d'inset, y compris sans bouton — la dernière ligne butait
   * sinon contre le bord bas de l'écran.
   */
  const footerPadding = useScreenFooterPadding();
  /* Une sortie passée n'a plus de billet à prendre, seulement un sentier où
     retourner : les deux issues s'excluent et occupent la même place. */
  const showBuyButton = !!adventure && !adventure.isBooked && !isPastAdventure;
  const showFooter = showBuyButton || isPastAdventure;
  const scrollBottomClearance = footerPadding + (showFooter ? 48 + 12 + 40 : 40);

  if (!adventure || !rando || !outwardJourney || !outwardDate) {
    return (
      <View style={[styles.screen, styles.loadingScreen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  // « Votre aventure à Montmin » : la commune du sentier situe mieux la sortie
  // que son titre, déjà repris par la carte au centre de la frise.
  const placeName = rando.location?.split(',')[0]?.trim() || arrivalStationName || rando.title;

  const isReturnDetail = detailedPhase === 'return';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {/* Barre fixe : elle ne défile jamais et reste opaque jusqu'au bord haut,
            c'est elle qui masque le titre qui remonte. */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 8, backgroundColor: theme.background },
          ]}>
          {/* Pastille claire dans les deux thèmes — même règle que tous les
              retours de l'app. Le partage et les options, eux, suivent le thème. */}
          <IconButton
            variant="circle"
            icon={<ArrowLeft size={20} color={Colors.light.buttonIconColor} />}
            style={{ backgroundColor: Colors.light.buttonBgIcon }}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(tabs)/adventures')
            }
          />

          <View style={styles.headerCenter} pointerEvents="none">
            <Animated.Text
              numberOfLines={1}
              style={[styles.compactTitle, { color: theme.text }, compactTitleStyle]}>
              Votre aventure à {placeName}
            </Animated.Text>
          </View>

          <IconButton
            variant="circle"
            icon={<Share2 size={20} color={theme.buttonIconColor} />}
            style={{ backgroundColor: theme.buttonBgIcon }}
            onPress={handleShare}
          />

          <IconButton
            variant="circle"
            icon={<EllipsisVertical size={20} color={theme.buttonIconColor} />}
            style={{ backgroundColor: theme.buttonBgIcon }}
            onPress={() => actionsSheetRef.current?.present()}
          />
        </View>

        <Animated.ScrollView
          onScroll={headerScrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingBottom: scrollBottomClearance }]}
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[styles.titleBlock, bigTitleStyle]}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              if (height > 0) titleBlockHeight.value = height;
            }}>
            <Text style={[styles.title, { color: theme.text }]}>Votre aventure à {placeName}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {formatAdventureRange(outwardDate, returnDate)}
            </Text>
          </Animated.View>

          <AdventureTimelineCaption label="C'est le début de l'aventure !" />

          <AdventureJourneyCard
            phase="outward"
            dateLabel={formatFullDate(outwardDate)}
            option={outwardJourney}
            originName={departureName}
            destinationName={arrivalStationName}
            onPressDetails={() => handleOpenDetails('outward')}
            onModify={isPastAdventure ? undefined : () => handleModify('outward')}
          />

          <AdventureStepConnector label={formatDayMonth(outwardDate)} />

          <AdventureHikeCard
            title={rando.title}
            imageUrl={rando.imageUrl}
            location={rando.location}
            distance={rando.distance}
            durationHours={rando.durationHours}
            rating={rando.ratingAvg}
            onPress={() => router.push(`/rando/${rando.id}`)}
          />

          {returnJourney && returnDate && (
            <>
              <AdventureStepConnector label={formatDayMonth(returnDate)} />

              <AdventureJourneyCard
                phase="return"
                dateLabel={formatFullDate(returnDate)}
                option={returnJourney}
                originName={departBackStationName}
                destinationName={returnName}
                onPressDetails={() => handleOpenDetails('return')}
                onModify={isPastAdventure ? undefined : () => handleModify('return')}
              />
            </>
          )}

          {/* Aller simple : le retour n'a pas été planifié, mais rien n'oblige à
              refaire le parcours pour l'ajouter. L'aventure déjà construite est
              conservée, seul le trajet retour reste à choisir. */}
          {!returnJourney && !isPastAdventure && (
            <Button
              title="Ajouter un trajet retour"
              variant="outlined"
              icon={<Plus size={18} color={theme.text} />}
              style={[styles.addReturnButton, { borderColor: theme.borderStrong || theme.border }]}
              textStyle={{ color: theme.text }}
              onPress={handleAddReturn}
            />
          )}

          <AdventureTimelineCaption
            label="Fin de l'aventure... avant la prochaine."
            arrow="above"
          />
        </Animated.ScrollView>

        {/* Une seule issue, et seulement tant qu'elle a un objet : les billets
            restés à prendre après un « Plus tard » sur le résumé. Une fois la
            démarche engagée, l'état se reprend depuis la feuille d'options. */}
        {showFooter && (
          <ScreenFooter>
            {showBuyButton ? (
              <Button
                title="Acheter les billets"
                variant="primary"
                onPress={() => buySheetRef.current?.present()}
              />
            ) : (
              <Button title="Replanifier cette sortie" variant="primary" onPress={handleReplan} />
            )}
          </ScreenFooter>
        )}
      </View>

      <BuyTicketsSheet
        ref={buySheetRef}
        outwardJourney={outwardJourney}
        returnJourney={returnJourney}
        passengers={passengers}
        passengersCount={formatPassengerCount(passengers)}
        outwardDateLabel={formatFullDate(outwardDate)}
        returnDateLabel={returnDate ? formatFullDate(returnDate) : null}
        onOpenProvider={handleOpenProvider}
        onDone={handleBuyDone}
      />

      <AdventureActionsSheet
        ref={actionsSheetRef}
        adventure={adventure}
        hikeTitle={rando.title}
        isPast={isPastAdventure}
        /* L'aventure supprimée, il ne reste rien à récapituler : on rend la main
           à la liste plutôt que de laisser l'écran sur une fiche fantôme. */
        onDeleted={() => router.replace('/(tabs)/adventures')}
      />

      {/* Détail pas-à-pas du trajet, la même feuille que pendant le choix. Le
          bouton d'engagement change seul de rôle : l'itinéraire est déjà retenu,
          il ne reste qu'à revenir le changer. */}
      <JourneyDetailSheet
        ref={journeyDetailSheetRef}
        option={isReturnDetail ? returnJourney : outwardJourney}
        departureName={isReturnDetail ? departBackStationName : departureName}
        destinationName={isReturnDetail ? returnName : arrivalStationName}
        primaryLabel={isReturnDetail ? 'Modifier le retour' : "Modifier l'aller"}
        // Sortie passée : la feuille montre le trajet, elle n'engage plus rien.
        onConfirm={isPastAdventure ? undefined : () => handleModify(detailedPhase)}
        showNavigoBadge={
          allPassengersHave(passengers, 'navigo') &&
          isFullyCoveredByNavigo(isReturnDetail ? returnJourney : outwardJourney)
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  compactTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  titleBlock: {
    // Le bloc porte lui-même l'écart qui le sépare de la frise : sorti de
    // l'écran, il emporte cet espace avec lui.
    marginBottom: 4,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 32,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  /* Posé dans la frise, à l'emplacement qu'occuperait la carte du retour :
     l'aventure se lit toujours de haut en bas, avec une étape en attente. */
  addReturnButton: {
    marginTop: 16,
  },
});
