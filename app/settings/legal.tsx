import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';

const TERMS_URL = 'https://www.neve-rando.fr/terms';
const PRIVACY_URL = 'https://www.neve-rando.fr/privacy';
/* `/legal` n'a jamais existé : le lien ouvrait une page introuvable. La page
   s'appelle `/mentions-legales`, comme le chemin que le site annonce. */
const LEGAL_NOTICE_URL = 'https://www.neve-rando.fr/mentions-legales';

/**
 * « Juridique » — les textes qui engagent Névé.
 *
 * Les CGU, politique de confidentialité et mentions légales vivent sur le site.
 * Les licences logicielles et crédits de bibliothèques s'affichent directement
 * dans l'application.
 */
export default function LegalSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SettingsPage title="Informations légales">
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <ProfileMenuRow
          label="Conditions d'utilisation"
          trailing="external"
          onPress={() => Linking.openURL(TERMS_URL)}
        />
        <ProfileMenuRow
          label="Données personnelles"
          trailing="external"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <ProfileMenuRow
          label="Mentions légales"
          trailing="external"
          onPress={() => Linking.openURL(LEGAL_NOTICE_URL)}
        />
        <ProfileMenuRow
          label="Licences logicielles"
          trailing="chevron"
          onPress={() => router.push('/settings/licenses')}
        />
      </View>

      <Text style={[styles.version, { color: theme.textMuted }]}>
        Névé version {version}
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  version: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
