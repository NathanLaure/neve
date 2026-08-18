import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crown } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import SettingsPage from '@/components/profile/SettingsPage';

/**
 * « Névé+ ».
 *
 * L'offre n'existe pas encore : la page l'annonce et s'arrête là. Pas de grille
 * de tarifs ni de liste d'avantages inventée pour meubler — ce serait promettre
 * à la place du produit.
 */
export default function NevePlusScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <SettingsPage title="Névé+" fill contentContainerStyle={styles.center}>
      <View style={[styles.badge, { backgroundColor: theme.orangeBadge }]}>
        <Crown size={32} color={theme.tint} strokeWidth={1.6} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Bientôt disponible</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Névé+ n{'’'}est pas encore ouvert. Dès que l{'’'}offre sera prête, elle apparaîtra ici —
        rien ne vous sera facturé sans que vous l{'’'}ayez choisi.
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
