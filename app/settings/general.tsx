import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';
import DeleteAccountSheet from '@/components/profile/DeleteAccountSheet';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
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

  const { user, resetPassword, deleteAccount } = useAuth();

  const deleteSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Suppression du compte, exigée par le RGPD (article 17) et, plus
   * concrètement, par Google Play depuis 2024 pour toute app permettant de créer
   * un compte — sous peine de refus en production.
   *
   * On ne navigue pas : la disparition de la session fait basculer `app/index`
   * vers l'écran d'accueil de son propre chef. Pousser une route en plus
   * risquerait de croiser cette redirection.
   */
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);

    if (error) {
      showToast.error('Suppression impossible', error);
      return;
    }

    deleteSheetRef.current?.dismiss();
    showToast.success('Compte supprimé', 'Tes données ont été effacées.');
  };

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

      {/* Sa propre carte, à l'écart des rubriques anodines : c'est le patron que
          suit déjà la déconnexion sur la page de profil, et la seule action de
          l'app que rien ne rattrape. */}
      <View style={styles.group}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Supprimer mon compte"
            tone="danger"
            trailing="none"
            onPress={() => deleteSheetRef.current?.present()}
          />
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

      <DeleteAccountSheet
        ref={deleteSheetRef}
        isDeleting={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => deleteSheetRef.current?.dismiss()}
      />
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
