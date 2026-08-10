import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';
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
import {
  fetchTransitOptionsWithFallback,
  parseCoordinates,
  Disruption,
  TransitOption,
} from '@/services/transitService';
import { OutwardHeader } from '@/components/plan/OutwardHeader';
import { SearchTransportCard } from '@/components/plan/SearchTransportCard';
import { RecommendedWrapper } from '@/components/plan/RecommendedWrapper';

import DisruptionsBottomSheet from '@/components/plan/DisruptionsBottomSheet';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';

export default function ReturnPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const disruptionsSheetRef = React.useRef<BaseBottomSheetModalRef>(null);

  const params = useLocalSearchParams<{
    randoId?: string;
    outwardId?: string;
    departureName?: string;
    departureLat?: string;
    departureLng?: string;
    returnName?: string;
    returnLat?: string;
    returnLng?: string;
    returnDate?: string;
    passengersCount?: string;
  }>();

  const { hikes, userLocationName, userLocation } = useAdventure();

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  // `endStation` : la gare de fin de rando. Les champs visés jusqu'ici
  // (`endStationName`, `stationName`) n'existent pas sur RandoData, le libellé
  // valait donc toujours « Départ Rando ».
  const departureName = rando?.endStation || rando?.title || 'Départ Rando';
  // Où l'on rentre le soir. Un lieu de retour explicite l'emporte sur le point
  // de départ, qui l'emporte lui-même sur le GPS : sans ça, choisir de rentrer
  // ailleurs n'avait aucun effet sur les trajets proposés.
  const destinationName =
    params.returnName || params.departureName || userLocationName || 'Paris';
  const destinationCoords =
    parseCoordinates(params.returnLat, params.returnLng) ??
    parseCoordinates(params.departureLat, params.departureLng) ??
    userLocation;
  const returnDate = params.returnDate || new Date().toISOString().split('T')[0];
  const passengersCountText = params.passengersCount || '1 pers.';

  // State transit
  const [options, setOptions] = useState<TransitOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Perturbations de l'itinéraire dont on a ouvert le détail : la sheet est
  // partagée entre toutes les cartes.
  const [openedDisruptions, setOpenedDisruptions] = useState<Disruption[]>([]);

  // Animation scroll
  const scrollY = useSharedValue(0);
  const cardHeight = useSharedValue(60);

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const loadTransit = async () => {
    setIsLoading(true);
    try {
      if (rando) {
        // Une boucle ou un aller-retour se termine là où il a commencé : on peut
        // donc partir du sentier lui-même. Un point à point finit ailleurs, et
        // ce point d'arrivée n'existe pas dans le modèle — on reste sur la gare.
        const endsWhereItStarted =
          rando.routeType === 'boucle' || rando.routeType === 'aller_retour';
        const trailhead =
          endsWhereItStarted && rando.start_lat != null && rando.start_lng != null
            ? { latitude: rando.start_lat, longitude: rando.start_lng }
            : rando.endStationCoords;

        const baseQuery = {
          to: destinationCoords,
          fromName: departureName,
          toName: destinationName,
          date: returnDate,
          time: '16:00',
          direction: 'back' as const,
        };

        const result = await fetchTransitOptionsWithFallback(
          { ...baseQuery, from: trailhead },
          // Repli : depuis un sentier isolé, le calculateur peut ne rien trouver.
          { ...baseQuery, from: rando.endStationCoords }
        );
        setOptions(result.options);
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
    // Primitives et non l'objet `destinationCoords`, recréé à chaque rendu.
  }, [
    rando?.id,
    returnDate,
    departureName,
    destinationCoords.latitude,
    destinationCoords.longitude,
  ]);

  const handleSelectOption = (option: TransitOption) => {
    setSelectedId(option.id);
    // Rediriger vers l'écran récapitulatif
    router.push({
      pathname: '/recap',
      params: {
        randoId: rando?.id,
        outwardId: params.outwardId,
        returnId: option.id,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header animé */}
      <OutwardHeader
        departureName={departureName}
        destinationName={destinationName}
        dateFormatted={`Retour : ${returnDate}`}
        passengersCountText={passengersCountText}
        onBack={() => router.back()}
        scrollY={scrollY}
        cardHeight={cardHeight}
      />

      {/* Scrollable Results List */}
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} width="100%" height={120} style={styles.skeletonCard} />
            ))}
          </View>
        ) : options.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Aucun itinéraire de retour trouvé pour cette date.
            </Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {options.map((option, index) => {
              const isRecommended = index === 0;
              const isSelected = selectedId === option.id;

              const card = (
                <SearchTransportCard
                  option={option}
                  isSelected={isSelected}
                  departureName={departureName}
                  destinationName={destinationName}
                  onSelect={() => handleSelectOption(option)}
                  onPressPerturbations={() => {
                    setOpenedDisruptions(option.disruptions ?? []);
                    disruptionsSheetRef.current?.present();
                  }}
                />
              );

              if (isRecommended) {
                return (
                  <RecommendedWrapper key={option.id}>
                    {card}
                  </RecommendedWrapper>
                );
              }

              return <View key={option.id}>{card}</View>;
            })}
          </View>
        )}
      </Animated.ScrollView>

      {/* BottomSheetModal pour les détails des perturbations */}
      <DisruptionsBottomSheet
        ref={disruptionsSheetRef}
        disruptions={openedDisruptions}
        onDismiss={() => disruptionsSheetRef.current?.dismiss()}
      />
    </View>
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
  emptyBox: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontFamily: 'Satoshi_Variable',
    fontSize: 14,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: 12,
  },
});
