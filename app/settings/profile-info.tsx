import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import ScreenFooter from '@/components/ScreenFooter';
import SettingsPage from '@/components/profile/SettingsPage';
import AvatarPicker from '@/components/profile/AvatarPicker';
import { showToast } from '@/utils/toast';

/**
 * « Informations de profil » — ce qui identifie le randonneur : sa photo, son
 * nom, son adresse e-mail.
 *
 * Rien d'autre : l'adresse de domicile, les abonnements et la lettre
 * d'information décrivent ses trajets ou ses envois, pas son identité, et vivent
 * chacun dans leur page.
 */
export default function ProfileInfoScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { user, profile, updateProfile, updateUserEmail } = useAuth();

  const savedName = profile?.fullName ?? '';
  const savedEmail = user?.email ?? '';

  const [fullName, setFullName] = useState(savedName);
  const [email, setEmail] = useState(savedEmail);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  const nameChanged = trimmedName !== savedName;
  const emailChanged = cleanEmail !== savedEmail.toLowerCase();
  /* Le bouton ne s'allume que sur une modification réellement enregistrable :
     un nom vidé n'en est pas une, et proposer d'enregistrer pour se faire
     répondre « nom requis » ne rend service à personne. */
  const canSave = (nameChanged || emailChanged) && trimmedName.length > 0;

  /* La photo est déjà dans le bucket quand ce rappel se déclenche : on ne fait
     qu'enregistrer où elle se trouve — d'où l'écriture immédiate, sans attendre
     le bouton de la page. */
  const handleAvatarChange = async (url: string | null) => {
    const { error } = await updateProfile({ avatarUrl: url });
    if (error) {
      showToast.error('Enregistrement impossible', error);
      return;
    }
    showToast.success(url ? 'Photo mise à jour' : 'Photo retirée');
  };

  const handleSave = async () => {
    setIsSaving(true);

    if (nameChanged) {
      const { error } = await updateProfile({ fullName: trimmedName });
      if (error) {
        setIsSaving(false);
        showToast.error('Enregistrement impossible', error);
        return;
      }
    }

    if (emailChanged) {
      const { error } = await updateUserEmail(cleanEmail);
      setIsSaving(false);

      if (error) {
        showToast.error('Changement impossible', error);
        return;
      }
      /* Pas de `router.back()` ici : l'ancienne adresse reste affichée tant que
         le lien n'est pas ouvert, et quitter la page donnerait l'impression que
         le changement n'a pas été pris. */
      showToast.info(
        'Confirmez la nouvelle adresse 📩',
        `Un lien vient de partir vers ${cleanEmail}. Votre adresse actuelle reste active jusqu'à ce que vous l'ouvriez.`
      );
      setEmail(savedEmail);
      return;
    }

    setIsSaving(false);
    showToast.success('Profil mis à jour');
    router.back();
  };

  return (
    <SettingsPage
      title="Informations de profil"
      footer={
        <ScreenFooter>
          <Button
            title="Enregistrer"
            onPress={handleSave}
            loading={isSaving}
            disabled={!canSave}
          />
        </ScreenFooter>
      }>
      {user?.id ? (
        <AvatarPicker
          userId={user.id}
          avatarUrl={profile?.avatarUrl}
          onChange={handleAvatarChange}
        />
      ) : null}

      <View style={styles.group}>
        <Input variant="outlined" label="Nom" value={fullName} onChangeText={setFullName} />
        <Input
          variant="outlined"
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Votre nom et votre photo apparaissent sur votre profil et sur les aventures que vous
          partagez. Changer d{'’'}adresse e-mail demande de confirmer la nouvelle par un lien.
        </Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  hint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
