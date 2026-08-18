import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import ToggleRow from '@/components/ToggleRow';
import SettingsPage from '@/components/profile/SettingsPage';
import { showToast } from '@/utils/toast';

/**
 * « Communication » — ce que Névé a le droit d'envoyer.
 *
 * Une bascule s'applique là où on la bascule : pas de bouton « Enregistrer » sur
 * une page de consentement, où l'écart entre ce qu'on voit coché et ce qui est
 * réellement enregistré n'a pas lieu d'exister.
 */
export default function CommunicationSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { user, profile, updateProfile } = useAuth();

  const handleNewsletterChange = async (accepted: boolean) => {
    const { error } = await updateProfile({ newsletterConsent: accepted });
    if (error) {
      showToast.error('Enregistrement impossible', error);
    }
  };

  return (
    <SettingsPage title="Communication">
      <View style={styles.group}>
        <View style={[styles.card, { backgroundColor: theme.transparent }]}>
          <ToggleRow
            title="Newsletter Névé"
            value={profile?.newsletterConsent ?? false}
            onValueChange={handleNewsletterChange}
            backgroundColor={theme.transparent}
            style={styles.toggle}
          />
        </View>

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Quelques nouvelles par an : nouveaux sentiers desservis, évolutions de l{'’'}app. Rien
          de commercial, et un désabonnement dans chaque envoi.
        </Text>
      </View>

      {user?.email ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Les e-mails partent vers {user.email}.
        </Text>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  /* Aligné sur les lignes de menu : mêmes marges, même hauteur utile. */
  toggle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  hint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
