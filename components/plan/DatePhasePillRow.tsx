import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type TripPhase = 'outward' | 'return';

export interface DatePhasePillRowProps {
  /** Phase affichée par l'écran courant : détermine quel pill est en avant. */
  activePhase: TripPhase;
  outwardLabel: string;
  /** `null` en aller simple : le pill retour se grise sans date. */
  returnLabel: string | null;
  onPress: () => void;
}

/**
 * Rappel des dates aller/retour sous la carte d'itinéraire (Figma 572:10681).
 * Purement indicatif — les deux pills ouvrent la même modale `/plan/dates`,
 * il n'y a pas de bascule de contenu entre aller et retour ici.
 */
export default function DatePhasePillRow({
  activePhase,
  outwardLabel,
  returnLabel,
  onPress,
}: DatePhasePillRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isOutwardActive = activePhase === 'outward';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        android_ripple={{
          color: isOutwardActive ? theme.rippleOnBrand : theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={[
          styles.pill,
          styles.pillLeft,
          {
            backgroundColor: isOutwardActive ? theme.brand : theme.card,
            overflow: 'hidden' as const,
          },
        ]}>
        <View style={styles.content}>
          {isOutwardActive && <ArrowRight size={16} color={theme.buttonTextOnBrand} />}
          <Text
            style={[
              styles.label,
              { color: isOutwardActive ? theme.buttonTextOnBrand : theme.textMuted },
            ]}>
            Aller
          </Text>
          <Text
            style={[
              styles.date,
              { color: isOutwardActive ? theme.buttonTextOnBrand : theme.text },
            ]}>
            {outwardLabel}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onPress}
        android_ripple={{
          color: !isOutwardActive ? theme.rippleOnBrand : theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={[
          styles.pill,
          styles.pillRight,
          {
            backgroundColor: !isOutwardActive ? theme.brand : theme.card,
            overflow: 'hidden' as const,
          },
        ]}>
        <View style={styles.content}>
          {!isOutwardActive && <ArrowRight size={16} color={theme.buttonTextOnBrand} />}
          <Text
            style={[
              styles.label,
              { color: !isOutwardActive ? theme.buttonTextOnBrand : theme.textMuted },
            ]}>
            Retour
          </Text>
          <Text
            style={[
              styles.date,
              { color: !isOutwardActive ? theme.buttonTextOnBrand : theme.text },
            ]}
            numberOfLines={1}>
            {returnLabel ?? '—'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pillLeft: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  pillRight: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  date: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 14,
    marginLeft: 'auto',
  },
});
