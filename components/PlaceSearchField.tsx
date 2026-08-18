import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocateFixed, MapPin } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Input } from '@/components/Input';
import PlaceSuggestionRow, { getPlaceKind } from '@/components/PlaceSuggestionRow';
import { GeocodedPlace, searchPlaces } from '@/services/geocodingService';

/**
 * Niveaux Mapbox trop fins pour se suffire à eux-mêmes : « Batignolles » ne dit
 * rien sans « Paris » derrière, là où « Paris » se passe de « Île-de-France ».
 */
const NEEDS_CONTEXT = new Set(['neighborhood', 'locality', 'address', 'postcode']);

/** Libellé retenu pour un lieu choisi — c'est lui qui s'affichera sous le nom. */
export function formatPlaceLabel(place: GeocodedPlace): string {
  if (!NEEDS_CONTEXT.has(place.placeType ?? '')) return place.name;
  const [parent] = place.context.split(',').map((part) => part.trim());
  return parent && parent !== place.name ? `${place.name}, ${parent}` : place.name;
}

export interface PlaceSearchFieldProps {
  label: string;
  placeholder?: string;
  /** Lieu retenu, `null` tant que rien n'a été choisi. */
  value: GeocodedPlace | null;
  onSelect: (place: GeocodedPlace | null) => void;
  /** Libellé de départ quand le lieu vient du profil et non d'une recherche. */
  initialQuery?: string;
  /** Callback optionnel pour déclencher la géolocalisation GPS en un tap. */
  onGpsLocate?: () => void;
  /** Indique si la recherche de position GPS est en cours. */
  isLocatingGps?: boolean;
}

/**
 * Champ de recherche de lieu avec suggestions, partagé par l'inscription et les
 * paramètres du compte.
 *
 * Taper efface la sélection en cours : un libellé qui ne correspond plus au
 * point retenu vaut mieux effacé qu'affiché à côté de coordonnées périmées.
 */
export default function PlaceSearchField({
  label,
  placeholder = 'Ville, quartier ou adresse',
  value,
  onSelect,
  initialQuery,
  onGpsLocate,
  isLocatingGps = false,
}: PlaceSearchFieldProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /* `null` = rien de tapé depuis le dernier choix : c'est alors le lieu retenu
     qui s'affiche. Distinguer « pas de frappe » de « frappe vide » est ce qui
     permet à un point posé sur la carte de reprendre la main sur le champ. */
  const [typed, setTyped] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [syncedValueId, setSyncedValueId] = useState<string | null>(value?.id ?? null);

  /* Ajustement en cours de rendu plutôt qu'en effet : un lieu choisi ailleurs
     (tap sur la carte) doit s'afficher dès la première image, sans le rendu
     intermédiaire où le champ montrerait encore l'ancienne frappe. */
  const currentValueId = value?.id ?? null;
  if (currentValueId !== syncedValueId) {
    setSyncedValueId(currentValueId);
    if (value) {
      setTyped(null);
      setResults([]);
    }
  }

  const display = typed ?? (value ? formatPlaceLabel(value) : (initialQuery ?? ''));

  /* Géocodage débrayé, et indexé sur la frappe seule : Mapbox est facturé à
     l'appel, et relancer une recherche sur le libellé qu'on vient de choisir
     ferait rouvrir la liste de suggestions juste après l'avoir refermée. */
  useEffect(() => {
    const query = typed?.trim() ?? '';
    if (query.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await searchPlaces(query, 6));
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [typed]);

  const handleChange = (next: string) => {
    setTyped(next);
    if (value) onSelect(null);
    if (next.trim().length < 2) setResults([]);
  };

  const handlePick = (place: GeocodedPlace) => {
    setTyped(null);
    setResults([]);
    onSelect(place);
  };

  const gpsButton = onGpsLocate ? (
    <Pressable
      onPress={onGpsLocate}
      disabled={isLocatingGps}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Utiliser ma position actuelle"
      android_ripple={{
        color: theme.ripple,
        borderless: true,
      }}
      style={styles.gpsButton}>
      {isLocatingGps ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <LocateFixed size={18} color={theme.textMuted} />
      )}
    </Pressable>
  ) : undefined;

  return (
    <View style={styles.wrapper}>
      <Input
        variant="outlined"
        label={label}
        placeholder={placeholder}
        value={display}
        onChangeText={handleChange}
        icon={<MapPin size={18} color={theme.textMuted} />}
        rightIcon={gpsButton}
        autoCorrect={false}
        returnKeyType="search"
        onClear={() => {
          setTyped('');
          setResults([]);
          onSelect(null);
        }}
      />

      {isSearching && results.length === 0 ? (
        <View style={styles.searching}>
          <ActivityIndicator size="small" color={theme.tint} />
          <Text style={[styles.searchingText, { color: theme.textMuted }]}>Recherche…</Text>
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={[styles.results, { backgroundColor: theme.card }]}>
          {results.map((place) => (
            <PlaceSuggestionRow
              key={place.id}
              kind={getPlaceKind(place.name, place.context, place.placeType)}
              name={place.name}
              dept={place.context}
              scheme={colorScheme}
              textColor={theme.text}
              mutedColor={theme.textMuted}
              onPress={() => handlePick(place)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  gpsButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  searchingText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  results: {
    borderRadius: 12,
    padding: 4,
  },
});
