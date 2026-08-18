import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Map, Satellite } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import ChoiceChip from '@/components/ChoiceChip';
import Chip from '@/components/Chip';
import SettingsPage from '@/components/profile/SettingsPage';
import { SORT_OPTIONS } from '@/constants/SortOptions';
import {
  MapStylePreference,
  SEARCH_RADIUS_CHOICES,
  setPreference,
  usePreferences,
} from '@/utils/preferences';

const MAP_STYLES: { id: MapStylePreference; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'default', label: 'Plan', Icon: Map },
  { id: 'satellite', label: 'Satellite', Icon: Satellite },
];

/**
 * « Préférences de recherche » — les valeurs de départ de l'explorateur.
 *
 * Ce sont des réglages de l'appareil et non du compte : ils ne partent pas en
 * base et survivent à une déconnexion. Chaque choix s'applique sans validation,
 * comme partout ailleurs dans les réglages.
 *
 * Le rayon ne borne pas ce qui est affiché mais ce qui est chargé autour de la
 * position : large, on voit plus loin dès l'ouverture ; étroit, l'app démarre
 * plus vite et consomme moins.
 */
export default function SearchSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const preferences = usePreferences();

  return (
    <SettingsPage title="Préférences de recherche">
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Fond de carte</Text>
        <View style={styles.chipsRow}>
          {MAP_STYLES.map((style) => {
            const selected = preferences.mapStyle === style.id;
            return (
              <View key={style.id} style={styles.chipSlot}>
                <ChoiceChip
                  label={style.label}
                  selected={selected}
                  onPress={() => setPreference('mapStyle', style.id)}
                  leading={<style.Icon size={18} color={selected ? theme.primary : theme.text} />}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Rayon de chargement</Text>
        <Text style={[styles.groupHint, { color: theme.textMuted }]}>
          Distance autour de vous dans laquelle les randonnées sont chargées à l{'’'}ouverture.
        </Text>
        <View style={styles.chipsWrap}>
          {SEARCH_RADIUS_CHOICES.map((radius) => (
            <Chip
              key={radius}
              label={`${radius} km`}
              selected={preferences.searchRadiusKm === radius}
              onPress={() => setPreference('searchRadiusKm', radius)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Tri par défaut</Text>
        <View style={styles.list}>
          {SORT_OPTIONS.map((option) => (
            <ChoiceChip
              key={option.id}
              label={option.label}
              selected={preferences.sortOption === option.id}
              radio
              onPress={() => setPreference('sortOption', option.id)}
            />
          ))}
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  groupHint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // `ChoiceChip` occupe toute la largeur qu'on lui laisse : c'est le créneau qui
  // partage la ligne en deux, pas le chip lui-même.
  chipSlot: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 12,
  },
});
