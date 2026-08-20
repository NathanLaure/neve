import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ArrowLeft, EllipsisVertical, Plus, Share2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';
import ScreenFooter, { useScreenFooterPadding } from '@/components/ScreenFooter';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { useAdventure } from '@/context/AdventureContext';
import { usePlanDraft } from '@/context/PlanDraftContext';
import { buildAdventureEdit, buildAdventurePlanParams } from '@/services/adventureEditing';
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
import BuyTicketsSheet from '@/components/plan/BuyTicketsSheet';
import JourneyDetailSheet from '@/components/plan/JourneyDetailSheet';
import AdventureActionsSheet from '@/components/plan/AdventureActionsSheet';
import { parseCoordinates, toTrainOption } from '@/services/transitService';
import {
  BookingProvider,
  buildTrainlineSearchUrl,
  isFullyCoveredByNavigo,
  openBookingProvider,
} from '@/services/bookingService';
import {
  allPassengersHave,
  createDefaultPassengers,
  formatPassengerCount,
  normalizePassengers,
} from '@/types/passenger';
import { showToast } from '@/utils/toast';

/**
 * Résumé de l'aventure planifiée, dernière étape avant enregistrement
 * (Figma 348:13130).
 *
 * L'écran raconte le voyage dans l'ordre où il se vivra — aller, marche, retour —
 * plutôt que dans l'ordre où il a été construit. C'est le seul endroit où les
 * deux trajets choisis se voient ensemble : jusqu'ici chacun se choisissait sans
 * l'autre sous les yeux.
 *
 * Les deux issues enregistrent l'aventure. Elles ne diffèrent que sur la suite
 * immédiate : acheter les billets tout de suite, ou plus tard depuis sa fiche.
 */
export default function PlanSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const buySheetRef = useRef<BaseBottomSheetModalRef>(null);
  const journeyDetailSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
  // Une seule feuille de détail pour les deux trajets, comme sur les écrans de
  // choix : c'est le trajet dont on vient d'ouvrir le détail qui la remplit.
  const [detailedPhase, setDetailedPhase] = useState<'outward' | 'return'>('outward');

  const params = useLocalSearchParams<{
    randoId?: string;
    departureName?: string;
    /** Coordonnées du départ, nécessaires pour repartir chercher un retour. */
    departureLat?: string;
    departureLng?: string;
    returnName?: string;
    returnLat?: string;
    returnLng?: string;
    outwardDate?: string;
    returnDate?: string;
    passengers?: string;
    isReversed?: string;
  }>();

  const navigation = useNavigation();

  const { hikes, addAdventure, updateAdventure, plannedAdventures } = useAdventure();
  const { draft, setSavedAdventureId, restoreForEdit } = usePlanDraft();
  const { outwardJourney, returnJourney, outwardIsRealtime, returnIsRealtime, savedAdventureId } =
    draft;

  /* Aventure déjà enregistrée que cet écran relit. Elle commande à la fois le
     bouton « … » de l'en-tête et la façon dont « Modifier » navigue. */
  const savedAdventure = savedAdventureId
    ? (plannedAdventures.find((item) => item.id === savedAdventureId) ?? null)
    : null;

  const rando = useMemo(
    () => hikes.find((item) => item.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  const isReversed = params.isReversed === 'true';

  // Gares du sentier, dans le sens de parcours retenu — mêmes règles que les
  // écrans aller et retour, dont cet écran n'est que la relecture.
  const arrivalStationName = isReversed
    ? (rando?.endStation ?? '')
    : (rando?.startStation ?? '');
  const departBackStationName = isReversed
    ? (rando?.startStation ?? '')
    : (rando?.endStation ?? rando?.startStation ?? '');

  const departureName = params.departureName || 'Votre position';
  const returnName = params.returnName || departureName;

  /* Mémorisés : `parseCoordinates` rend un objet neuf à chaque rendu, et
     `saveAdventure` les prend en dépendance. */
  const departureCoords = useMemo(
    () => parseCoordinates(params.departureLat, params.departureLng),
    [params.departureLat, params.departureLng]
  );
  const returnCoords = useMemo(
    () => parseCoordinates(params.returnLat, params.returnLng),
    [params.returnLat, params.returnLng]
  );

  const outwardDate = draft.startDate || params.outwardDate || null;
  const returnDate =
    draft.tripType === 'oneway' ? null : draft.endDate || params.returnDate || outwardDate;

  const passengers = useMemo(
    () => normalizePassengers(params.passengers) ?? createDefaultPassengers(),
    [params.passengers]
  );

  /*
   * L'aventure n'est enregistrée qu'une fois par parcours, quelle que soit
   * l'issue empruntée : acheter les billets puis revenir modifier l'aller doit
   * corriger ce qui a été enregistré, pas en déposer une deuxième version.
   *
   * D'où l'identifiant gardé dans le brouillon partagé et non ici : cet écran est
   * démonté puis remonté à chaque aller-retour vers les trajets.
   */
  const hasSavedRef = useRef(false);

  const saveAdventure = useCallback(
    async (
      explicitShareToken?: string
    ): Promise<{ id: string; shareToken: string } | null> => {
      if (!rando || !outwardJourney || !outwardDate) return null;

      // En aller simple il n'y a pas de retour à enregistrer : on réutilise l'aller
      // pour satisfaire le modèle de `PlannedAdventure`, qui en exige un.
      const returnOption = returnJourney ?? outwardJourney;
      const returnIsReal = returnJourney ? returnIsRealtime : outwardIsRealtime;

      const existingAdv = savedAdventureId
        ? plannedAdventures.find((a) => a.id === savedAdventureId)
        : undefined;

      const shareToken =
        explicitShareToken ||
        existingAdv?.shareToken ||
        Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

      const payload = {
        randoId: rando.id,
        outwardDate,
        returnDate: returnDate ?? outwardDate,
        outwardTrain: toTrainOption(outwardJourney, outwardIsRealtime),
        returnTrain: toTrainOption(returnOption, returnIsReal),
        departureStationName: departureName,
        returnStationName: returnName !== departureName ? returnName : undefined,
        /* Les coordonnées suivent les noms, sinon revenir corriger un trajet
           repartirait de la position de l'appareil à cet instant-là. Elles
           traversent le parcours en paramètres d'URL : c'est le seul endroit où
           on peut encore les attraper avant qu'il ne se termine. */
        departureCoords: departureCoords ?? undefined,
        returnCoords: returnName !== departureName ? (returnCoords ?? undefined) : undefined,
        isReversed,
        // `returnTrain` recopie l'aller en aller simple : sans ce drapeau, la
        // fiche de l'aventure afficherait un retour qui n'a jamais été planifié.
        isOneWay: !returnJourney,
        isBooked: false,
        passengersCount: formatPassengerCount(passengers),
        passengers,
        shareToken,
      };

      hasSavedRef.current = true;

      if (savedAdventureId) {
        // `isBooked` est délibérément absent : l'achat déjà engagé ne doit pas être
        // effacé par une correction d'itinéraire.
        const { isBooked, ...corrections } = payload;
        updateAdventure(savedAdventureId, corrections);
        return { id: savedAdventureId, shareToken };
      }

      const { id, error } = await addAdventure(payload);
      /* Écriture refusée : l'aventure n'existe qu'en mémoire et disparaîtra au
         premier rechargement. Mieux vaut le dire que laisser croire. */
      if (error) {
        hasSavedRef.current = false;
        return null;
      }

      setSavedAdventureId(id);
      return { id, shareToken };
    },
    [
      rando,
      outwardJourney,
      returnJourney,
      outwardIsRealtime,
      returnIsRealtime,
      outwardDate,
      returnDate,
      departureName,
      returnName,
      departureCoords,
      returnCoords,
      isReversed,
      returnJourney,
      passengers,
      savedAdventureId,
      plannedAdventures,
      addAdventure,
      updateAdventure,
      setSavedAdventureId,
    ]
  );

  /*
   * Sans itinéraire d'aller il n'y a rien à résumer : c'est le cas d'un lien
   * profond vers cette route, ou d'un retour en arrière pour changer les dates,
   * qui invalide les trajets déjà choisis. On repart alors d'où ils se
   * choisissent plutôt que d'afficher une page vide.
   */
  useEffect(() => {
    // `hasSavedRef` retient le cas de la sortie normale : l'enregistrement vide le
    // brouillon en quittant la pile, ce qui n'est pas un résumé à refaire.
    if (outwardJourney || hasSavedRef.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [outwardJourney, router]);

  const handleShare = useCallback(async () => {
    if (!rando || !outwardDate) return;

    const saved = await saveAdventure();
    if (!saved) {
      showToast.error("L'aventure n'a pas pu être enregistrée");
      return;
    }

    const { shareToken } = saved;
    const shareUrl = `https://neve-rando.fr/share/${shareToken}`;

    const dateStr = formatAdventureRange(outwardDate, returnDate);
    const durationStr = rando.durationHours ? `${rando.durationHours}h` : '';
    const distanceStr = rando.distance ? `${rando.distance} km` : '';
    const hikeDetails = [distanceStr, durationStr].filter(Boolean).join(' • ');

    const lines = [
      `🌲 Viens avec moi à l'aventure : ${rando.title} !`,
      '',
      `📅 Date : ${dateStr}`,
      hikeDetails ? `🥾 Randonnée : ${hikeDetails}` : null,
      outwardJourney
        ? `🚆 Train aller : ${outwardJourney.departureTime} (${departureName} → ${arrivalStationName})`
        : null,
      returnJourney
        ? `🚆 Train retour : ${returnJourney.departureTime} (${departBackStationName} → ${returnName})`
        : null,
      '',
      `🗺️ Retrouve la feuille de route, les horaires et l'itinéraire ici :`,
      shareUrl,
    ].filter((line) => line !== null);

    try {
      await Share.share({
        title: `Aventure Névé : ${rando.title}`,
        message: lines.join('\n'),
        url: shareUrl,
      });
    } catch (error) {
      console.warn('Partage impossible :', error);
    }
  }, [
    rando,
    outwardDate,
    returnDate,
    outwardJourney,
    returnJourney,
    departureName,
    returnName,
    arrivalStationName,
    departBackStationName,
    saveAdventure,
  ]);

  const handleBuyNow = useCallback(async () => {
    if (!(await saveAdventure())) {
      showToast.error("L'aventure n'a pas pu être enregistrée");
      return;
    }
    buySheetRef.current?.present();
  }, [saveAdventure]);

  const handleLater = useCallback(async () => {
    const saved = await saveAdventure();
    if (!saved) {
      showToast.error("L'aventure n'a pas pu être enregistrée");
      return;
    }
    showToast.success(
      'Aventure enregistrée',
      'Tes billets restent à prendre depuis sa fiche, dans Aventures.'
    );
    router.replace('/(tabs)/adventures');
  }, [saveAdventure, router]);

  const handleOpenProvider = useCallback(
    async (provider: BookingProvider) => {
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
      // la fiche de l'aventure.
      if (opened && savedAdventureId) {
        updateAdventure(savedAdventureId, { isBooked: true });
      }
    },
    [
      outwardDate,
      returnDate,
      departureName,
      arrivalStationName,
      outwardJourney,
      returnJourney,
      savedAdventureId,
      updateAdventure,
    ]
  );

  const handleBuyDone = useCallback(
    (allHaveNavigo?: boolean) => {
      buySheetRef.current?.dismiss();
      if (allHaveNavigo && savedAdventureId) {
        updateAdventure(savedAdventureId, { isBooked: true });
      }
      showToast.success(
        'Aventure prête !',
        allHaveNavigo
          ? 'Pass Navigo validé pour tous les randonneurs.'
          : 'Tes billets et trajets sont enregistrés.'
      );
      router.replace('/(tabs)/adventures');
    },
    [savedAdventureId, updateAdventure, router]
  );

  /*
   * Retour vers l'écran où le trajet se choisit. L'aller est deux crans plus bas
   * dans la pile — le retour a été poussé par-dessus, puis ce résumé.
   *
   * La feuille de détail est refermée d'abord : elle vit dans un portail à la
   * racine, une navigation ne l'emporterait pas avec l'écran.
   */
  const handleModify = useCallback(
    (phase: 'outward' | 'return') => {
      journeyDetailSheetRef.current?.dismiss();

      /* Seul l'écran immédiatement sous ce résumé est consulté, et au moment du
         geste. Chercher `plan/outward` n'importe où dans la pile se trompait dès
         qu'un parcours précédent en avait laissé un plus bas : « Modifier
         l'aller » dépilait alors dans le vide, ou atterrissait sur le retour. */
      const routes = (navigation.getState()?.routes ?? []) as { name?: string }[];
      const parentName = routes[routes.length - 2]?.name;
      const cameFromOutward = parentName === 'plan/outward';
      const cameFromReturn = parentName === 'plan/return';

      /* Résumé ouvert seul sur une aventure enregistrée : aucun écran de choix
         sous lui, il n'y a rien à dépiler. On pousse le parcours d'édition, comme
         la feuille d'options — le résumé qui en sortira corrigera cette aventure
         au lieu d'en déposer une seconde. */
      if (!cameFromOutward && !cameFromReturn) {
        if (!savedAdventure) return;

        const planParams = buildAdventurePlanParams(savedAdventure);
        restoreForEdit(buildAdventureEdit(savedAdventure));

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
              outwardId: savedAdventure.outwardTrain.id,
              editOnly: 'return',
            },
          });
        }
        return;
      }

      // Le choix du retour est juste en dessous.
      if (phase === 'return') {
        router.back();
        return;
      }

      /* Celui de l'aller est deux crans plus bas quand un retour a été choisi
         par-dessus, immédiatement en dessous sur un aller simple. `dismiss(2)`
         inconditionnel renvoyait ce dernier cas un écran trop loin. */
      router.dismiss(cameFromReturn ? 2 : 1);
    },
    [navigation, restoreForEdit, router, savedAdventure]
  );

  const handleOpenDetails = useCallback((phase: 'outward' | 'return') => {
    setDetailedPhase(phase);
    journeyDetailSheetRef.current?.present();
  }, []);

  /*
   * Une correction d'aventure s'enregistre d'elle-même.
   *
   * Rien d'autre ne la retenait : seuls « Acheter », « Plus tard » et « Partager »
   * appellent `saveAdventure`, si bien qu'un changement d'horaire n'était retenu
   * qu'en achetant un billet. L'écran affichait alors un voyage que la fiche ne
   * connaissait pas.
   *
   * Ne concerne que les fiches déjà enregistrées, jamais la création : `updateAdventure`
   * corrige, il ne dépose rien. Et la comparaison évite de réécrire à chaque simple
   * relecture d'une aventure — elle porte sur ce que `saveAdventure` écrirait,
   * `returnTrain` recopiant l'aller en aller simple.
   */
  useEffect(() => {
    if (!savedAdventure || !outwardJourney || !outwardDate) return;

    const unchanged =
      savedAdventure.outwardTrain.id === outwardJourney.id &&
      savedAdventure.returnTrain.id === (returnJourney ?? outwardJourney).id &&
      savedAdventure.outwardDate === outwardDate &&
      savedAdventure.returnDate === (returnDate ?? outwardDate) &&
      (savedAdventure.isOneWay ?? false) === !returnJourney;

    if (unchanged) return;
    void saveAdventure();
  }, [
    outwardDate,
    outwardJourney,
    returnDate,
    returnJourney,
    saveAdventure,
    savedAdventure,
  ]);

  /*
   * Ajout d'un retour à un aller simple déjà planifié.
   *
   * Passe par le calendrier avant les résultats : sans date, les horaires
   * proposés seraient ceux d'un jour choisi à la place de l'utilisateur. La
   * modale enchaîne ensuite d'elle-même sur les trajets de retour.
   */
  const handleAddReturn = useCallback(() => {
    router.push({
      pathname: '/plan/dates',
      params: {
        next: 'return',
        randoId: rando?.id,
        outwardId: outwardJourney?.id,
        departureName: params.departureName,
        departureLat: params.departureLat,
        departureLng: params.departureLng,
        returnName: params.returnName,
        returnLat: params.returnLat,
        returnLng: params.returnLng,
        passengers: JSON.stringify(passengers),
        isReversed: params.isReversed,
      },
    });
  }, [outwardJourney?.id, params, passengers, rando, router]);

  /*
   * En-tête repliable, sur le patron de l'écran de planification : le grand titre
   * défile avec le contenu et cède sa place à une version compacte, posée entre
   * les deux boutons de la barre fixe.
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
   * Le footer flotte au-dessus du contenu : la liste réserve elle-même la place
   * de ses deux boutons pour que le dernier élément se dégage en fin de course.
   * Les 24px du bout sont du dégagement pur — la légende de fin ne doit pas venir
   * buter contre les boutons.
   */
  const scrollBottomClearance = useScreenFooterPadding() + 2 * 48 + 12 + 12 + 24;

  /* Écran d'attente, et non page blanche : cet état est transitoire — la
     randonnée se charge, ou l'aller vient d'être remis en jeu par « Modifier ».
     Rendre une `View` vide en faisait une impasse muette, impossible à
     distinguer d'un plantage. */
  if (!rando || !outwardJourney || !outwardDate) {
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

  /* Les actions contextuelles ne valent que pour une aventure déjà enregistrée :
     en pleine planification, il n'y a encore rien à annuler ni à partager depuis
     une fiche. Le bouton « … » ne s'affiche donc qu'au retour sur une fiche
     existante. */
  const isPastAdventure = savedAdventure
    ? (savedAdventure.returnDate || savedAdventure.outwardDate) < toISODate(new Date())
    : false;

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
          {/* Pastille claire dans les deux thèmes — même règle que le retour de
              la planification. Le partage et les options, eux, suivent le thème. */}
          <IconButton
            variant="circle"
            icon={<ArrowLeft size={20} color={Colors.light.buttonIconColor} />}
            style={{ backgroundColor: Colors.light.buttonBgIcon }}
            onPress={() => router.back()}
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

          {savedAdventure && (
            <IconButton
              variant="circle"
              icon={<EllipsisVertical size={20} color={theme.buttonIconColor} />}
              style={{ backgroundColor: theme.buttonBgIcon }}
              onPress={() => actionsSheetRef.current?.present()}
            />
          )}
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
            onModify={() => handleModify('outward')}
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
                onModify={() => handleModify('return')}
              />
            </>
          )}

          {/* Aller simple : le retour n'a pas été planifié, mais rien n'oblige à
              refaire le parcours pour l'ajouter. L'aventure déjà construite est
              conservée, seul le trajet retour reste à choisir. */}
          {!returnJourney && (
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

        <ScreenFooter>
          <Button title="Acheter les billets" variant="primary" onPress={handleBuyNow} />
          <Button
            title="Plus tard"
            variant="outlined"
            style={[styles.laterButton, { backgroundColor: theme.card }]}
            onPress={handleLater}
          />
        </ScreenFooter>
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
        adventure={savedAdventure}
        hikeTitle={rando?.title}
        isPast={isPastAdventure}
        /* L'aventure supprimée, la fiche n'a plus d'objet : on rend la main à la
           liste plutôt que de laisser l'écran sur un résumé fantôme. */
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
        showNavigoBadge={
          allPassengersHave(passengers, 'navigo') &&
          isFullyCoveredByNavigo(isReturnDetail ? returnJourney : outwardJourney)
        }
        onConfirm={() => handleModify(detailedPhase)}
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
  laterButton: {
    borderWidth: 0,
  },
  /* Posé dans la frise, à l'emplacement qu'occuperait la carte du retour :
     l'aventure se lit toujours de haut en bas, avec une étape en attente. */
  addReturnButton: {
    marginTop: 16,
  },
});
