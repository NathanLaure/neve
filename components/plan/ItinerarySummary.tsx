import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ItinerarySummaryProps {
  /** Traversée : les deux gares diffèrent, on les distingue par les pastilles A/B. */
  isTraverse: boolean;
  departureName: string;
  returnName: string;
  arrivalStationName: string;
  departBackStationName: string;
}

/** Mêmes teintes que les pastilles de la timeline — voir ItineraryCard. */
const BADGE_START = '#FF2D55';
const BADGE_END = '#34C759';

const StationBadge: React.FC<{ letter: string; color: string }> = ({ letter, color }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={styles.badgeText}>{letter}</Text>
  </View>
);

/**
 * Résumé compact de l'itinéraire, affiché dans l'en-tête replié à la place du
 * titre « Planification » (Figma 590:17295, variante Type5 de ItinaryBox).
 *
 * Deux lignes : l'aller et le retour, chacune « origine → destination ». C'est la
 * même information que la carte dépliée, réduite à ce qui tient en 14px.
 */
export default function ItinerarySummary({
  isTraverse,
  departureName,
  returnName,
  arrivalStationName,
  departBackStationName,
}: ItinerarySummaryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.text, { color: theme.text }]}>Aller : </Text>
        <Text style={[styles.text, styles.shrinkable, { color: theme.text }]} numberOfLines={1}>
          {departureName}
        </Text>
        <Text style={[styles.text, { color: theme.text }]}> → </Text>
        {isTraverse && <StationBadge letter="A" color={BADGE_START} />}
        <Text style={[styles.text, styles.shrinkable, { color: theme.text }]} numberOfLines={1}>
          {arrivalStationName}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.text, { color: theme.text }]}>Retour : </Text>
        {isTraverse && <StationBadge letter="B" color={BADGE_END} />}
        <Text style={[styles.text, styles.shrinkable, { color: theme.text }]} numberOfLines={1}>
          {departBackStationName}
        </Text>
        <Text style={[styles.text, { color: theme.text }]}> → </Text>
        <Text style={[styles.text, styles.shrinkable, { color: theme.text }]} numberOfLines={1}>
          {returnName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  /**
   * Les seuls textes de longueur variable. `minWidth: 0` est indispensable :
   * sans lui un Text refuse de passer sous sa largeur intrinsèque et déborde de
   * la ligne au lieu de s'élider.
   */
  shrinkable: {
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
