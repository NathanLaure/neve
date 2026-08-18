import React, { forwardRef, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import PlaceSuggestionRow, { getPlaceKind } from '@/components/PlaceSuggestionRow';
import SearchInput from '@/components/SearchInput';
import { GeocodedPlace, searchPlaces } from '@/services/geocodingService';
import { searchStations } from '@/services/transitService';
import { formatStationLabel } from '@/utils/stationLabel';

export interface DeparturePoint {
  name: string;
  latitude: number;
  longitude: number;
}

export interface DeparturePointSheetProps {
  /** Position GPS courante, proposée en tête de liste. */
  currentLocation: DeparturePoint | null;
  onSelect: (point: DeparturePoint) => void;
  /** La même feuille sert au point de départ et au lieu de retour. */
  title?: string;
}

/** Même délai que l'écran de recherche : on ne géocode pas à chaque frappe. */
const DEBOUNCE_MS = 300;

/**
 * Gares franciliennes correspondant à la saisie, converties au format des
 * suggestions de lieu.
 *
 * Elles viennent du référentiel embarqué, pas du géocodeur : la réponse est
 * immédiate, tient hors ligne, et surtout les coordonnées sont exactement
 * celles que le calculateur d'itinéraires attend. Un « Gare de Melun » trouvé
 * par Mapbox tomberait à quelques dizaines de mètres du quai.
 */
function searchLocalStations(query: string, limit = 4): GeocodedPlace[] {
  return searchStations(query, limit).map((station) => ({
    id: `station-${station.id}`,
    name: formatStationLabel(station.name),
    context: 'Gare · Île-de-France',
    fullName: formatStationLabel(station.name),
    latitude: station.latitude,
    longitude: station.longitude,
    placeType: 'station',
  }));
}

/**
 * Saisie manuelle du point de départ.
 *
 * Reprend le géocodage et la présentation des résultats de l'écran de recherche
 * (`geocodingService` + `PlaceSuggestionRow`), pour que la même adresse s'affiche
 * de la même façon aux deux endroits.
 */
const DeparturePointSheet = forwardRef<BaseBottomSheetModalRef, DeparturePointSheetProps>(
  ({ currentLocation, onSelect, title = 'D’où pars-tu ?' }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodedPlace[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      /* Les gares du référentiel local s'affichent sans attendre le réseau, et
         restent en tête : c'est ce qu'on vient chercher ici en premier. Le
         géocodeur complète ensuite avec les adresses et les stations de métro,
         qui ne sont pas dans le référentiel. */
      const stations = searchLocalStations(query);
      setResults(stations);

      // Une réponse lente ne doit pas écraser les résultats d'une frappe plus
      // récente : `isStale` neutralise la requête abandonnée.
      let isStale = false;
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const places = await searchPlaces(query, { includeTransit: true });
          if (isStale) return;
          // Une gare déjà proposée localement ne doit pas revenir en doublon
          // sous son nom Mapbox, à quelques mètres près.
          const isDuplicate = (place: GeocodedPlace) =>
            stations.some(
              (station) =>
                Math.abs(station.latitude - place.latitude) < 0.002 &&
                Math.abs(station.longitude - place.longitude) < 0.002
            );
          setResults([...stations, ...places.filter((place) => !isDuplicate(place))]);
        } finally {
          if (!isStale) setIsSearching(false);
        }
      }, DEBOUNCE_MS);

      return () => {
        isStale = true;
        clearTimeout(timer);
      };
    }, [query]);

    const choose = (point: DeparturePoint) => {
      onSelect(point);
      setQuery('');
      setResults([]);
    };

    const showEmptyState = query.trim().length >= 2 && !isSearching && results.length === 0;

    // Pleine hauteur, arrêtée sous la barre d'état : la liste de résultats a
    // besoin de toute la place, et la feuille s'ouvre avec le clavier.
    return (
      <BaseBottomSheetModal
        ref={ref}
        title={title}
        snapPoints={['100%']}
        topInset={insets.top}>
        <View style={styles.content}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Adresse, ville, gare…"
            onClear={() => setQuery('')}
          />

          {/* BottomSheetScrollView et non ScrollView : à l'intérieur d'une feuille,
              c'est lui qui arbitre le geste entre le défilement de la liste et le
              glissement de la feuille. */}
          <BottomSheetScrollView
            style={styles.results}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled">
            {currentLocation && query.trim().length === 0 && (
              <PlaceSuggestionRow
                kind="nearby"
                name="Ma position actuelle"
                dept={currentLocation.name}
                scheme={colorScheme}
                textColor={theme.text}
                mutedColor={theme.textMuted}
                onPress={() => choose(currentLocation)}
              />
            )}

            {isSearching && (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.tint} />
              </View>
            )}

            {showEmptyState && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Aucun lieu trouvé pour « {query.trim()} ».
              </Text>
            )}

            {results.map((place) => (
              <PlaceSuggestionRow
                key={place.id}
                kind={getPlaceKind(place.name, place.context, place.placeType)}
                name={place.name}
                dept={place.context}
                scheme={colorScheme}
                textColor={theme.text}
                mutedColor={theme.textMuted}
                onPress={() =>
                  choose({
                    name: place.name,
                    latitude: place.latitude,
                    longitude: place.longitude,
                  })
                }
              />
            ))}
          </BottomSheetScrollView>
        </View>
      </BaseBottomSheetModal>
    );
  }
);

DeparturePointSheet.displayName = 'DeparturePointSheet';

export default DeparturePointSheet;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 8,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 16,
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

