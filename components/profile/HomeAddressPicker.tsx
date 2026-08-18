import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { House, Lock } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import PlaceSearchField, { formatPlaceLabel } from '@/components/PlaceSearchField';
import { GeocodedPlace, reverseGeocodePlace } from '@/services/geocodingService';
import { showToast } from '@/utils/toast';

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/nlaure/cmqeb16wa001u01qn7zxmgncl',
};

/** Paris Châtelet — le cadrage d'ouverture quand rien n'est encore choisi. */
const DEFAULT_CENTER: [number, number] = [2.3488, 48.8584];
const DEFAULT_ZOOM = 10.5;
const PICKED_ZOOM = 14;

export interface HomeAddressPickerProps {
  value: GeocodedPlace | null;
  onChange: (place: GeocodedPlace | null) => void;
  /**
   * Adresse déjà enregistrée au profil. Sert de texte de départ au champ et de
   * repli au cadrage tant que rien n'a été rechoisi.
   */
  savedLabel?: string;
  savedCoords?: { latitude: number; longitude: number };
}

/**
 * Choix de l'adresse de domicile : recherche par nom, ou point posé sur la carte.
 *
 * Partagé par la page de réglages et par l'étape d'inscription — c'est la même
 * question posée à deux moments, et deux implémentations auraient divergé dès la
 * première correction. Seuls diffèrent l'en-tête et le bouton, laissés à
 * l'appelant.
 *
 * Un tap sur la carte repasse par le géocodage inverse : on veut un libellé
 * lisible sous le nom du randonneur, pas un couple de coordonnées.
 */
export default function HomeAddressPicker({
  value,
  onChange,
  savedLabel,
  savedCoords,
}: HomeAddressPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isResolving, setIsResolving] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const marker: [number, number] | null = value
    ? [value.longitude, value.latitude]
    : savedCoords
      ? [savedCoords.longitude, savedCoords.latitude]
      : null;

  const handleMapPress = async (event: any) => {
    const coordinates = event?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return;

    const [longitude, latitude] = coordinates;
    setIsResolving(true);
    const place = await reverseGeocodePlace(latitude, longitude);
    setIsResolving(false);

    if (place) onChange(place);
  };

  const handleGpsPress = async () => {
    if (isLocatingGps) return;
    setIsLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast.info('Permission de localisation requise');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const place = await reverseGeocodePlace(latitude, longitude);
      if (place) {
        onChange(place);
      } else {
        showToast.error('Impossible de trouver votre adresse');
      }
    } catch (err) {
      console.warn('Error locating user for home address:', err);
      showToast.error('Erreur de localisation');
    } finally {
      setIsLocatingGps(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.intro, { color: theme.text }]}>
        Recherchez une adresse ou sélectionnez un point sur la carte.
      </Text>

      <PlaceSearchField
        label="Adresse de domicile"
        placeholder="Ville, quartier ou adresse"
        value={value}
        onSelect={onChange}
        initialQuery={savedLabel}
        onGpsLocate={handleGpsPress}
        isLocatingGps={isLocatingGps}
      />

      <View style={[styles.mapCard, { backgroundColor: theme.card }]}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={colorScheme === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light}
          scaleBarEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          onPress={handleMapPress}>
          {/* `centerCoordinate` change avec la sélection : la caméra suit donc le
              lieu choisi, qu'il vienne de la recherche ou d'un tap. */}
          <Mapbox.Camera
            centerCoordinate={marker ?? DEFAULT_CENTER}
            zoomLevel={marker ? PICKED_ZOOM : DEFAULT_ZOOM}
            animationDuration={600}
          />

          {marker ? (
            <Mapbox.PointAnnotation id="home" coordinate={marker}>
              <View style={[styles.pin, { backgroundColor: theme.text }]}>
                <House size={16} color={theme.background} />
              </View>
            </Mapbox.PointAnnotation>
          ) : null}
        </Mapbox.MapView>

        {isResolving ? (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="small" color={theme.tint} />
          </View>
        ) : null}
      </View>

      {value ? (
        <Text style={[styles.picked, { color: theme.textMuted }]} numberOfLines={2}>
          Point retenu : {formatPlaceLabel(value)}
        </Text>
      ) : null}

      <View style={styles.privacyRow}>
        <Lock size={16} color={theme.textMuted} />
        <Text style={[styles.privacyText, { color: theme.textMuted }]}>
          Vous seul(e) pouvez voir cette adresse.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  intro: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  mapCard: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  /* Voile d'attente pendant le géocodage inverse : le point est posé mais son
     nom n'est pas encore connu, et rien ne doit laisser croire à un gel. */
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picked: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
