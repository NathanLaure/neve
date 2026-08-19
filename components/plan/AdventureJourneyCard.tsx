import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, Clock4 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/Button';
import { TransitOption } from '@/services/transitService';

export interface AdventureJourneyCardProps {
  phase: 'outward' | 'return';
  /** Date pleine du trajet, « 20 mars 2027 ». */
  dateLabel: string;
  option: TransitOption;
  /** Lieu d'où l'on part et lieu où l'on arrive, tels que l'utilisateur les a posés. */
  originName: string;
  destinationName: string;
  /** Ouvre le détail pas-à-pas du trajet, dans la feuille tenue par l'écran. */
  onPressDetails: () => void;
  /**
   * Absent, le bouton de modification n'est pas rendu : une sortie passée se
   * relit, elle ne se replanifie plus trajet par trajet.
   */
  onModify?: () => void;
}

/**
 * Un trajet du résumé, aller ou retour (Figma 348:13384 / 349:13730).
 *
 * La carte se lit de haut en bas comme le trajet se vit : heure et lieu de
 * départ, durée du voyage, heure et lieu d'arrivée. Le bandeau du milieu ouvre le
 * détail des tronçons dans la même feuille que pendant le choix de l'itinéraire —
 * l'itinéraire retenu se relit donc exactement comme il a été choisi.
 */
export default function AdventureJourneyCard({
  phase,
  dateLabel,
  option,
  originName,
  destinationName,
  onPressDetails,
  onModify,
}: AdventureJourneyCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const phaseLabel = phase === 'outward' ? 'ALLER' : 'RETOUR';
  const modifyLabel = phase === 'outward' ? "Modifier l'aller" : 'Modifier le retour';

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <CalendarDays size={16} color={theme.textMuted} />
        <Text style={[styles.headerText, { color: theme.textMuted }]}>
          {phaseLabel} : {dateLabel}
        </Text>
      </View>

      <View style={[styles.body, { borderTopColor: theme.borderLight }]}>
        <View style={styles.endpoint}>
          <Text style={[styles.time, { color: theme.text }]}>{option.departureTime}</Text>
          <Text style={[styles.place, { color: theme.textMuted }]} numberOfLines={1}>
            {originName}
          </Text>
        </View>

        <Pressable
          onPress={onPressDetails}
          android_ripple={{ color: theme.ripple, foreground: true }}
          style={[styles.accordion, { backgroundColor: theme.background }]}>
          <View style={styles.accordionText}>
            <View style={styles.duration}>
              <Clock4 size={16} color={theme.text} />
              <Text style={[styles.accordionLabel, { color: theme.text }]}>
                {option.durationFormatted}
              </Text>
            </View>
            <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />
            {/* Le nombre de correspondances a laissé place à l'action : il se lit
                déjà dans la timeline que ce bandeau ouvre. */}
            <Text style={[styles.accordionLabel, { color: theme.text }]}>Voir le trajet</Text>
          </View>
          {/* Chevron vers la droite et non vers le bas : rien ne se déplie ici,
              le détail s'ouvre en feuille — même affordance que la carte de
              résultat pendant le choix (`SearchTransportCard`). */}
          <ChevronRight size={16} color={theme.text} />
        </Pressable>

        <View style={styles.endpoint}>
          <Text style={[styles.time, { color: theme.text }]}>{option.arrivalTime}</Text>
          <Text style={[styles.place, { color: theme.textMuted }]} numberOfLines={1}>
            {destinationName}
          </Text>
        </View>

        {onModify ? (
          <Button title={modifyLabel} variant="tertiary" style={styles.modify} onPress={onModify} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    paddingTop: 8,
    gap: 8,
    // Figma `shadow-box`.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  headerText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    gap: 12,
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
    // Largeur fixe : les heures des deux extrémités s'alignent, et le lieu
    // démarre au même endroit sur les deux lignes.
    minWidth: 60,
  },
  place: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  accordion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accordionDivider: {
    width: 1,
    alignSelf: 'stretch',
    borderRadius: 100,
  },
  accordionLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  modify: {
    width: '100%',
  },
});
