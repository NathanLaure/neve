import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SettingsInfoRowProps {
  label: string;
  /** Une ligne par valeur — « Android 17 », « Version 1.0.0 ». */
  lines: string[];
}

/**
 * Ligne d'information d'une page de réglages : un intitulé, des valeurs, rien à
 * appuyer.
 *
 * Volontairement distincte de `ProfileMenuRow`, qui reste nue et cliquable. Une
 * ligne qui mène ailleurs n'a pas à afficher sa valeur — la page de destination
 * s'en charge ; une ligne qui ne mène nulle part n'existe que pour la sienne.
 */
export default function SettingsInfoRow({ label, lines }: SettingsInfoRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} : ${lines.join(', ')}`}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {lines.map((line) => (
        <Text key={line} style={[styles.value, { color: theme.textMuted }]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  value: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
