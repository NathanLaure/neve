import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import ScreenFooter from '@/components/ScreenFooter';
import SettingsPage from '@/components/profile/SettingsPage';
import TransportPassPicker from '@/components/TransportPassPicker';
import { TransportPassId } from '@/types/passenger';
import { showToast } from '@/utils/toast';

/**
 * « Abonnement de transport » — ce que l'utilisateur possède déjà.
 *
 * La sélection reste locale jusqu'à l'enregistrement : quitter la page d'un
 * retour doit laisser le profil intact, pas y déposer des cases cochées au
 * passage.
 */
export default function TransportPassesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { profile, updateProfile } = useAuth();
  const saved = profile?.transportPasses ?? [];
  const [draft, setDraft] = useState<TransportPassId[]>(saved);
  const [isSaving, setIsSaving] = useState(false);

  /* Comparaison par appartenance et non par position : le sélecteur ajoute à la
     fin de la liste, alors que le profil la renvoie triée — cocher puis
     décocher deux abonnements donnerait sinon un ordre « différent » sans
     qu'aucun choix n'ait bougé. */
  const hasChanges =
    draft.length !== saved.length || draft.some((pass) => !saved.includes(pass));

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({ transportPasses: draft });
    setIsSaving(false);

    if (error) {
      showToast.error('Enregistrement impossible', error);
      return;
    }
    router.back();
  };

  return (
    <SettingsPage
      title="Abonnement de transport"
      footer={
        <ScreenFooter>
          <Button
            title="Enregistrer"
            onPress={handleSave}
            loading={isSaving}
            disabled={!hasChanges}
          />
        </ScreenFooter>
      }>
      <Text style={[styles.intro, { color: theme.textMuted }]}>
        Cochez les abonnements que vous possédez : Névé n{'’'}affichera que les billets qu{'’'}il
        vous reste réellement à acheter pour rejoindre vos sentiers.
      </Text>

      <TransportPassPicker value={draft} onChange={setDraft} showNoneOption />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
