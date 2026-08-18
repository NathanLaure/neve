import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Mail } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';
import { showToast } from '@/utils/toast';

/** Adresse de contact de l'équipe. Une seule boîte, deux objets différents. */
const SUPPORT_EMAIL = 'contact@neve-rando.fr';

/**
 * « Suggestions et assistance ».
 *
 * Névé n'a pas de messagerie intégrée : l'assistance passe par l'e-mail, et le
 * message part pré-rempli avec l'objet et l'adresse du compte pour éviter le
 * premier aller-retour « qui êtes-vous ? ».
 */
export default function SupportSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();

  const openMail = async (subject: string, intro: string) => {
    const body = `${intro}\n\n\n---\nCompte : ${user?.email ?? 'non connecté'}`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showToast.info('Aucune application e-mail', `Écrivez-nous à ${SUPPORT_EMAIL}.`);
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <SettingsPage title="Suggestions et assistance">
      <Text style={[styles.intro, { color: theme.textMuted }]}>
        Un itinéraire faux, un train qui n{'’'}apparaît pas, une idée pour la suite : écrivez-nous,
        c{'’'}est une vraie personne qui lit.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <ProfileMenuRow
          label="Signaler un problème"
          trailing="external"
          onPress={() =>
            openMail(
              'Névé — signalement',
              'Décrivez ce qui ne va pas (écran concerné, ce que vous attendiez) :'
            )
          }
        />
        <ProfileMenuRow
          label="Proposer une idée"
          trailing="external"
          onPress={() =>
            openMail('Névé — suggestion', 'Votre idée pour améliorer Névé :')
          }
        />
      </View>

      <View style={styles.mailRow}>
        <Mail size={16} color={theme.textMuted} />
        <Text style={[styles.mailText, { color: theme.textMuted }]}>{SUPPORT_EMAIL}</Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  mailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mailText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
});
