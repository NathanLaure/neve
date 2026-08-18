import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';
import { showToast } from '@/utils/toast';

/**
 * « Paramètres » — le sommaire des réglages.
 *
 * Rien ne se règle ici : chaque rubrique mène à sa page. Les catégories ne sont
 * pas décoratives, elles répondent à « où est-ce que je vais chercher ça ? » —
 * ce qui touche au compte d'un côté, ce qui touche aux trajets de l'autre.
 */
export default function GeneralSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { user, resetPassword } = useAuth();

  // Compte créé via Google/Apple : il n'y a pas de mot de passe Névé à changer.
  const isEmailAccount = user?.app_metadata?.provider === 'email';

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) {
      showToast.error('Envoi impossible', error);
      return;
    }
    showToast.success(
      'E-mail envoyé 📩',
      `Un lien de changement de mot de passe part vers ${user.email}.`
    );
  };

  return (
    <SettingsPage title="Paramètres">
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Compte</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Informations de profil"
            onPress={() => router.push('/settings/profile-info')}
          />
          <ProfileMenuRow
            label="Adresse de domicile"
            onPress={() => router.push('/settings/home-address')}
          />
          <ProfileMenuRow
            label="Communication"
            onPress={() => router.push('/settings/communication')}
          />
          {isEmailAccount ? (
            <ProfileMenuRow
              label="Modifier le mot de passe"
              trailing="external"
              onPress={handlePasswordReset}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Voyages</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Abonnement de transport"
            onPress={() => router.push('/settings/transport-passes')}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Application</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Préférences de recherche"
            onPress={() => router.push('/settings/search')}
          />
          <ProfileMenuRow
            label="Autorisations"
            onPress={() => router.push('/settings/permissions')}
          />
          <ProfileMenuRow label="Réglages" onPress={() => router.push('/settings/app')} />
        </View>
      </View>

      {!isEmailAccount ? (
        <View style={styles.providerRow}>
          <Mail size={16} color={theme.textMuted} />
          <Text style={[styles.providerText, { color: theme.textMuted }]}>
            Compte connecté via un fournisseur externe : le mot de passe se gère de son côté.
          </Text>
        </View>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  providerText: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
