import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';
import ScreenFooter, { useScreenFooterPadding } from '@/components/ScreenFooter';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import AdventureJourneyCard from '@/components/plan/AdventureJourneyCard';
import AdventureHikeCard from '@/components/plan/AdventureHikeCard';
import AdventureStepConnector, {
  AdventureTimelineCaption,
} from '@/components/plan/AdventureStepConnector';
import JourneyDetailSheet from '@/components/plan/JourneyDetailSheet';
import SharedInvitationSheet from '@/components/share/SharedInvitationSheet';
import { useAdventure } from '@/context/AdventureContext';
import { fetchSharedAdventure, SharedAdventure } from '@/services/sharedAdventure';
import { fromTrainOption } from '@/services/transitService';
import {
  formatAdventureRange,
  formatDayMonth,
  formatFullDate,
  toISODate,
} from '@/components/plan/DateRangeCalendar';

/**
 * Aventure reçue par un lien de partage.
 *
 * Modale plein écran plutôt qu'écran de pile : un lien peut arriver à n'importe
 * quel moment — depuis une messagerie, l'app ouverte sur n'importe quel onglet —
 * et il ne doit pas déranger la navigation en cours. On la referme, on retrouve
 * exactement ce qu'on faisait.
 *
 * Lecture seule, contrairement au récapitulatif dont elle reprend la mise en
 * page : ce voyage appartient à quelqu'un d'autre. Rien n'y est modifiable, et
 * la seule issue est de le reprendre à son compte.
 */
export default function SharedAdventureScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  /* `useScreenFooterPadding` comptabilise la barre systeme, pas le bouton qui
     flotte au-dessus du contenu : on ajoute sa hauteur, son espacement et une
     respiration, comme le recapitulatif. Sans quoi la derniere ligne se lit
     sous le bouton. */
  const scrollBottomClearance = useScreenFooterPadding() + 48 + 12 + 40;

  const { hikes, loadHikeDetail } = useAdventure();
  const journeyDetailSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const invitationSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const [detailedPhase, setDetailedPhase] = useState<'outward' | 'return'>('outward');

  const [adventure, setAdventure] = useState<SharedAdventure | null>(null);
  /* Sans jeton, l'état de départ est déjà la réponse : le poser depuis un effet
     coûterait un rendu de plus pour une conclusion qu'on tient d'emblée. */
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    token ? 'loading' : 'missing'
  );

  useEffect(() => {
    if (!token) return;

    let isStale = false;
    fetchSharedAdventure(token).then(({ adventure: found, error }) => {
      if (isStale) return;
      setAdventure(found);
      setStatus(error || !found ? 'missing' : 'ready');
    });

    return () => {
      isStale = true;
    };
  }, [token]);

  /* La randonnée partagée n'est pas forcément dans le magasin : le lien peut
     désigner un sentier qu'on n'a jamais ouvert. On la charge, et l'instantané
     enregistré avec l'aventure sert de repli le temps que ça arrive — ou pour
     toujours, si le sentier a quitté le catalogue. */
  useEffect(() => {
    if (adventure && !hikes.some((item) => item.id === adventure.randoId)) {
      loadHikeDetail(adventure.randoId);
    }
  }, [adventure, hikes, loadHikeDetail]);

  const rando = useMemo(() => {
    if (!adventure) return null;
    const found = hikes.find((item) => item.id === adventure.randoId);
    if (found) return found;
    if (!adventure.hikeSnapshot) return null;
    return {
      id: adventure.randoId,
      title: adventure.hikeSnapshot.title,
      imageUrl: adventure.hikeSnapshot.imageUrl,
      location: adventure.hikeSnapshot.startStation,
      distance: adventure.hikeSnapshot.distance,
      durationHours: adventure.hikeSnapshot.durationHours,
      ratingAvg: null,
    } as any;
  }, [adventure, hikes]);

  const outwardJourney = useMemo(
    () => (adventure ? fromTrainOption(adventure.outwardTrain) : null),
    [adventure]
  );
  const returnJourney = useMemo(
    () => (adventure && !adventure.isOneWay ? fromTrainOption(adventure.returnTrain) : null),
    [adventure]
  );

  const arrivalStationName = adventure?.isReversed
    ? (rando?.endStation ?? '')
    : (rando?.startStation ?? '');
  const departBackStationName = adventure?.isReversed
    ? (rando?.startStation ?? '')
    : (rando?.endStation ?? rando?.startStation ?? '');

  /*
   * L'invitation nomme son auteur. Sans nom — profil incomplet, aventure
   * partagée avant que la fonction ne le renvoie — on reste sur une formule qui
   * dit la même chose sans mentir sur qui l'envoie.
   *
   * Le prénom seul : c'est ainsi qu'on annonce quelqu'un, et le nom complet
   * n'ajoute rien à une invitation entre gens qui se connaissent déjà.
   */
  const invitationLabel = useMemo(() => {
    const firstName = adventure?.authorName?.split(' ')[0]?.trim();
    return firstName ? `${firstName} t’invite à venir randonner` : 'On t’invite à venir randonner';
  }, [adventure]);

  /* L'invitation s'annonce dès que l'aventure est là, et une seule fois : on
     accueille quelqu'un à son arrivée, on ne le rattrape pas plus tard. */
  useEffect(() => {
    if (status !== 'ready') return;
    invitationSheetRef.current?.present();
  }, [status]);

  /*
   * Le pied flottant s'efface tant qu'une feuille est ouverte.
   *
   * Il est en position absolue, posé par-dessus le contenu, et il occupe
   * exactement la bande où une feuille range ses propres actions. Superposés,
   * les deux se disputent les appuis dans cette bande — et l'invitation, dont
   * les deux boutons y tombent, ne répondait plus. Le voile de la feuille le
   * recouvre de toute façon : personne ne le voit disparaître.
   *
   * L'invitation s'ouvre systématiquement à l'arrivée : elle est donc déjà
   * comptée ouverte au premier rendu, avant même d'être présentée.
   */
  const [isInvitationOpen, setIsInvitationOpen] = useState(true);
  const [isJourneyDetailOpen, setIsJourneyDetailOpen] = useState(false);
  const isSheetOpen = isInvitationOpen || isJourneyDetailOpen;

  const handleOpenDetails = (phase: 'outward' | 'return') => {
    setDetailedPhase(phase);
    setIsJourneyDetailOpen(true);
    journeyDetailSheetRef.current?.present();
  };

  /*
   * En-tête qui prend le relais du titre au défilement, comme le récapitulatif :
   * le grand titre s'efface sur la première moitié de la course, le compact
   * n'arrive que sur la seconde. Un fondu croisé superposerait deux titres à
   * demi transparents à mi-chemin.
   */
  const scrollY = useSharedValue(0);
  const titleBlockHeight = useSharedValue(0);

  const headerScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const collapse = useDerivedValue(() => {
    if (titleBlockHeight.value <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY.value / titleBlockHeight.value));
  });

  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: 8 * (1 - collapse.value) }],
  }));

  /**
   * Reprendre l'aventure à son compte.
   *
   * On emporte la randonnée et la date, pas le voyage : les trains de
   * l'expéditeur partent de chez lui, pas de chez soi. La planification les
   * recalculera depuis le point de départ du destinataire — ce qui évite au
   * passage de recopier l'adresse de quelqu'un d'autre dans son propre compte.
   *
   * `replace` et non `push` : la modale a rempli son office, revenir en arrière
   * depuis la planification doit ramener là où l'on était, pas au lien.
   */
  const handleAdd = useCallback(() => {
    if (!adventure) return;
    /* La date n'est proposée que si elle est encore devant nous : un lien
       retrouvé des semaines plus tard ne doit pas préremplir un jour passé. */
    const isUpcoming = adventure.outwardDate >= toISODate(new Date());
    router.replace({
      pathname: '/plan',
      params: {
        randoId: adventure.randoId,
        ...(isUpcoming ? { startDate: adventure.outwardDate } : {}),
      },
    });
  }, [adventure, router]);

  if (status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (status === 'missing' || !adventure || !rando || !outwardJourney) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <IconButton
            variant="circle"
            icon={<X size={20} color={Colors.light.buttonIconColor} />}
            style={{ backgroundColor: Colors.light.buttonBgIcon }}
            onPress={() => router.back()}
          />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Aventure introuvable</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Ce lien n’est plus valide. Son auteur a peut-être annulé la sortie, ou l’adresse a été
            recopiée en partie.
          </Text>
        </View>
      </View>
    );
  }

  return (
    /*
     * Fournisseur local : les feuilles gorhom sortent dans un portail rattaché
     * au fournisseur le plus proche. Sans celui-ci, elles viseraient celui de la
     * racine, qui se trouve sous cette modale native — elles s'ouvriraient
     * derrière l'écran, donc invisibles. Même raison que sur `/plan/dates`.
     */
    <BottomSheetModalProvider>
      <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* La modale plein écran ouvre son propre contexte : le style posé à la
          racine ne la suit pas, et les icônes système restaient claires sur le
          fond clair de l'app. */}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} animated />

        {/* Une croix et non une flèche : on ferme une parenthèse, on ne remonte
          pas d'un cran dans un parcours.

          Barre opaque et fixe : c'est elle qui masque le titre qui remonte. */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <IconButton
            variant="circle"
            icon={<X size={20} color={Colors.light.buttonIconColor} />}
            style={{ backgroundColor: Colors.light.buttonBgIcon }}
            onPress={() => router.back()}
          />

          <View style={styles.headerCenter} pointerEvents="none">
            <Animated.Text
              numberOfLines={1}
              style={[styles.compactTitle, { color: theme.text }, compactTitleStyle]}>
              {rando.title}
            </Animated.Text>
          </View>

          {/* Symétrique de la croix, invisible : sans lui le titre se centre sur
            l'espace restant et se retrouve décalé d'une demi-pastille. */}
          <View style={styles.headerSpacer} />
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
            <Text style={[styles.eyebrow, { color: theme.textMuted }]}>{invitationLabel}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{rando.title}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {formatAdventureRange(adventure.outwardDate, adventure.returnDate)}
            </Text>
          </Animated.View>

          <AdventureTimelineCaption label="C'est le début de l'aventure !" />

          <AdventureJourneyCard
            phase="outward"
            dateLabel={formatFullDate(adventure.outwardDate)}
            option={outwardJourney}
            originName={adventure.departureStationName}
            destinationName={arrivalStationName}
            onPressDetails={() => handleOpenDetails('outward')}
          />

          <AdventureStepConnector label={formatDayMonth(adventure.outwardDate)} />

          <AdventureHikeCard
            title={rando.title}
            imageUrl={rando.imageUrl}
            location={rando.location}
            distance={rando.distance}
            durationHours={rando.durationHours}
            rating={rando.ratingAvg}
            onPress={() => router.push(`/rando/${rando.id}`)}
          />

          {returnJourney && adventure.returnDate && (
            <>
              <AdventureStepConnector label={formatDayMonth(adventure.returnDate)} />
              <AdventureJourneyCard
                phase="return"
                dateLabel={formatFullDate(adventure.returnDate)}
                option={returnJourney}
                originName={departBackStationName}
                destinationName={adventure.returnStationName ?? adventure.departureStationName}
                onPressDetails={() => handleOpenDetails('return')}
              />
            </>
          )}

          <AdventureTimelineCaption
            label="Fin de l'aventure... avant la prochaine."
            arrow="above"
          />

          {/* Dit avant l'appui, pas après : le bouton ne recopie pas le voyage de
            quelqu'un d'autre, il ouvre la planification du même sentier. */}
          <Text style={[styles.note, { color: theme.textMuted }]}>
            Les horaires ci-dessus sont ceux de la personne qui t’a envoyé ce lien. En ajoutant
            l’aventure, tes propres trajets seront calculés depuis ton point de départ.
          </Text>
        </Animated.ScrollView>

        {!isSheetOpen && (
          <ScreenFooter>
            <Button title="Ajouter à mes aventures" variant="primary" onPress={handleAdd} />
          </ScreenFooter>
        )}

        <JourneyDetailSheet
          ref={journeyDetailSheetRef}
          option={detailedPhase === 'outward' ? outwardJourney : returnJourney}
          onClose={() => setIsJourneyDetailOpen(false)}
        />

        <SharedInvitationSheet
          ref={invitationSheetRef}
          title={invitationLabel}
          dateLabel={formatFullDate(adventure.outwardDate)}
          onAccept={handleAdd}
          onDismiss={() => invitationSheetRef.current?.dismiss()}
          onClose={() => setIsInvitationOpen(false)}
        />
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  /* Symétrique de la croix : sans lui, le titre se centre sur l'espace restant
     et se retrouve décalé d'une demi-pastille. */
  headerSpacer: {
    width: 40,
  },
  compactTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  titleBlock: {
    gap: 4,
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 20,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  note: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 20,
  },
});
