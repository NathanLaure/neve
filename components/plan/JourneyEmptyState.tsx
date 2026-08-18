import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/**
 * Pourquoi la liste d'itinéraires est vide.
 *
 * La panne du calculateur ne figure pas ici : elle est portée par
 * `JourneyUnavailableSheet`, une feuille bloquante, parce qu'elle demande une
 * décision (réessayer ou demander de l'aide) là où ces cas-ci n'appellent qu'un
 * ajustement des critères.
 */
export type JourneyEmptyReason = 'no-results' | 'no-results-return' | 'no-mode-match';

const MESSAGES: Record<JourneyEmptyReason, string> = {
  'no-results':
    'Aucun itinéraire trouvé pour cette date. Essayez de modifier les critères de recherche.',
  'no-results-return': 'Aucun itinéraire de retour trouvé pour cette date.',
  'no-mode-match': 'Aucun itinéraire ne correspond aux modes de transport sélectionnés.',
};

export interface JourneyEmptyStateProps {
  reason: JourneyEmptyReason;
}

/**
 * Encart affiché à la place de la liste d'itinéraires. Partagé par l'aller et le
 * retour, qui posaient jusqu'ici le même bloc chacun de leur côté.
 */
export default function JourneyEmptyState({ reason }: JourneyEmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.box, { borderColor: theme.border }]}>
      <Text style={[styles.text, { color: theme.textMuted }]}>{MESSAGES[reason]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  text: {
    fontFamily: 'Satoshi_Variable',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
