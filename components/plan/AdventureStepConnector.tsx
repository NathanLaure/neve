import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/**
 * Trait pointillé qui relie deux étapes du résumé, coupé en son milieu par la
 * date du jour concerné (Figma 348:13302).
 *
 * Les tirets sont des segments posés un par un plutôt qu'un `borderStyle:
 * 'dashed'` : Android n'applique pas le pointillé à une bordure d'un seul côté,
 * la ligne y sortirait pleine alors qu'elle serait en tirets sur iOS.
 */
export interface AdventureStepConnectorProps {
  /** `JJ/MM` — le jour où l'on passe d'une étape à l'autre. */
  label: string;
}

const DASHES_PER_HALF = 2;

export default function AdventureStepConnector({ label }: AdventureStepConnectorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const half = (
    <View style={styles.half}>
      {Array.from({ length: DASHES_PER_HALF }, (_, index) => (
        <View key={index} style={[styles.dash, { backgroundColor: theme.text }]} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {half}
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {half}
    </View>
  );
}

/**
 * Flèche isolée des deux extrémités de la frise (« C'est le début de
 * l'aventure ! » / « Fin de l'aventure... »), qui n'ont pas de date à porter.
 */
export function AdventureTimelineCaption({
  label,
  arrow = 'below',
}: {
  label: string;
  /** Côté où pointe la flèche par rapport au texte. */
  arrow?: 'above' | 'below';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const arrowIcon = <ArrowDown size={12} color={theme.text} />;

  return (
    <View style={styles.caption}>
      {arrow === 'above' && arrowIcon}
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {arrow === 'below' && arrowIcon}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  half: {
    alignItems: 'center',
    gap: 4,
  },
  dash: {
    width: 2,
    height: 5,
    borderRadius: 100,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 15,
  },
  caption: {
    alignItems: 'center',
    gap: 4,
  },
});
