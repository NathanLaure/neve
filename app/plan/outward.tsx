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

export default function OutwardPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const disruptionsSheetRef = React.useRef<BaseBottomSheetModalRef>(null);

  const params = useLocalSearchParams<{
    randoId?: string;
    departureName?: string;
    departureLat?: string;
    departureLng?: string;
    returnName?: string;
    returnLat?: string;
    returnLng?: string;
    outwardDate?: string;
    returnDate?: string;
    passengersCount?: string;
  }>();

  const { hikes, userLocationName, userLocation } = useAdventure();

  const rando = useMemo(
    () => hikes.find((r) => r.id === params.randoId) ?? hikes[0],
    [hikes, params.randoId]
  );

  const departureName = params.departureName || userLocationName || 'Paris';
  // Le point choisi dans l'écran de planification l'emporte sur le GPS : c'est
  // lui que le libellé affiche, l'itinéraire doit partir du même endroit.
  const departureCoords =
    parseCoordinates(params.departureLat, params.departureLng) ?? userLocation;
  // `startStation` : c'est la gare desservant la rando, même si l'itinéraire va
  // désormais jusqu'au sentier. Les champs visés jusqu'ici (`endStationName`,
  // `stationName`) n'existent pas sur RandoData — le libellé valait donc
  // toujours « Destination ».
  const destinationName = rando?.startStation || rando?.title || 'Destination';
  const outwardDate = params.outwardDate || new Date().toISOString().split('T')[0];
  const passengersCountText = params.passengersCount || '1 pers.';

  // State pour le transit
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
        // PRIM sait router jusqu'à une adresse : on vise le vrai départ du
        // sentier plutôt que la gare la plus proche, pour que la marche finale
        // fasse partie de l'itinéraire au lieu d'être laissée au randonneur.
        const trailhead =
          rando.start_lat != null && rando.start_lng != null
            ? { latitude: rando.start_lat, longitude: rando.start_lng }
            : rando.startStationCoords;

        const baseQuery = {
          from: departureCoords,
          fromName: departureName,
          toName: destinationName,
          date: outwardDate,
          time: '08:00',
          direction: 'go' as const,
        };

        const result = await fetchTransitOptionsWithFallback(
          { ...baseQuery, to: trailhead },
          // Repli : un sentier en pleine forêt peut être hors de portée du
          // calculateur, la gare reste toujours desservie.
          { ...baseQuery, to: rando.startStationCoords }
        );
        setOptions(result.options);
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
    // Primitives et non l'objet `departureCoords`, recréé à chaque rendu.
  }, [rando?.id, outwardDate, departureName, departureCoords.latitude, departureCoords.longitude]);

  const handleSelectOption = (option: TransitOption) => {
    setSelectedId(option.id);
    // Naviguer vers la page Retour
    router.push({
      pathname: '/plan/return',
      // Tout le contexte de planification suit : l'écran de retour en a besoin
      // pour viser le bon lieu, à la bonne date. Ce qui n'est pas transmis ici
      // est définitivement perdu, il retomberait sur le GPS et sur aujourd'hui.
      params: {
        randoId: rando?.id,
        outwardId: option.id,
        departureName,
        departureLat: params.departureLat,
        departureLng: params.departureLng,
        returnName: params.returnName,
        returnLat: params.returnLat,
        returnLng: params.returnLng,
        outwardDate,
        returnDate: params.returnDate,
        passengersCount: passengersCountText,
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
        dateFormatted={outwardDate}
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
              Aucun itinéraire trouvé pour cette date. Essayez de modifier les critères de recherche.
            </Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {options.map((option, index) => {
              const isRecommended = index === 0;
              const isSelected = selectedId === option.id;

              const cardProps = {
                option,
                isSelected,
                departureName,
                destinationName,
                onSelect: () => handleSelectOption(option),
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
