import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
  const scrollBottomClearance = useScreenFooterPadding();

  const { hikes, loadHikeDetail } = useAdventure();
  const journeyDetailSheetRef = useRef<BaseBottomSheetModalRef>(null);
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

  const handleOpenDetails = (phase: 'outward' | 'return') => {
    setDetailedPhase(phase);
    journeyDetailSheetRef.current?.present();
  };

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
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Une croix et non une flèche : on ferme une parenthèse, on ne remonte
          pas d'un cran dans un parcours. */}
      <View style={styles.header}>
        <IconButton
          variant="circle"
          icon={<X size={20} color={Colors.light.buttonIconColor} />}
          style={{ backgroundColor: Colors.light.buttonBgIcon }}
          onPress={() => router.back()}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomClearance }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: theme.tint }]}>On t’invite à l’aventure</Text>
          <Text style={[styles.title, { color: theme.text }]}>{rando.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {formatAdventureRange(adventure.outwardDate, adventure.returnDate)}
          </Text>
        </View>

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

        <AdventureTimelineCaption label="Fin de l'aventure... avant la prochaine." arrow="above" />

        {/* Dit avant l'appui, pas après : le bouton ne recopie pas le voyage de
            quelqu'un d'autre, il ouvre la planification du même sentier. */}
        <Text style={[styles.note, { color: theme.textMuted }]}>
          Les horaires ci-dessus sont ceux de la personne qui t’a envoyé ce lien. En ajoutant
          l’aventure, tes propres trajets seront calculés depuis ton point de départ.
        </Text>
      </ScrollView>

      <ScreenFooter>
        <Button title="Ajouter à mes aventures" variant="primary" onPress={handleAdd} />
      </ScreenFooter>

      <JourneyDetailSheet
        ref={journeyDetailSheetRef}
        option={detailedPhase === 'outward' ? outwardJourney : returnJourney}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
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
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
