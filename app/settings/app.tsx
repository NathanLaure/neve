import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';
import SettingsInfoRow from '@/components/profile/SettingsInfoRow';
import { showToast } from '@/utils/toast';

/**
 * Préfixes des caches purgeables.
 *
 * Uniquement ce qui se reconstruit tout seul depuis Supabase. En sont exclus le
 * thème et l'état d'accueil (des préférences, pas des copies), ainsi que les
 * randonnées hors ligne — celles-là ont été téléchargées exprès, elles se
 * gèrent depuis leur propre page.
 */
const CACHE_KEY_PREFIXES = ['@neve_favorites_cache_', '@neve_planned_adventures_'];

/**
 * « Réglages » — ce qui touche à l'application elle-même et non au compte :
 * données stockées sur l'appareil, versions installées.
 */
export default function AppSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { refreshFavorites, refreshAdventures } = useAdventure();
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = async () => {
    setIsClearing(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      /* Les clés portent l'identifiant du compte en suffixe : on filtre par
         préfixe plutôt que de les reconstruire, ce qui emporte au passage les
         restes d'un compte précédemment connecté sur cet appareil. */
      const stale = keys.filter((key) => CACHE_KEY_PREFIXES.some((p) => key.startsWith(p)));
      if (stale.length > 0) {
        await AsyncStorage.multiRemove(stale);
      }

      // Le cache vidé, la mémoire de l'app le serait aussi au prochain
      // démarrage : on la recharge tout de suite depuis le réseau.
      await Promise.all([refreshFavorites(), refreshAdventures()]);
      showToast.success('Cache vidé', 'Vos favoris et aventures ont été rechargés.');
    } catch (error: any) {
      showToast.error('Impossible de vider le cache', error?.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearCache = () => {
    if (isClearing) return;
    Alert.alert(
      'Vider le cache ?',
      "Les favoris et aventures enregistrés sur cet appareil seront rechargés depuis votre compte. Vos randonnées hors ligne ne sont pas touchées.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCache },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '—';
  const buildLines = [
    `Version ${version}`,
    Platform.OS === 'ios' ? 'iOS' : 'Android',
  ];

  return (
    <SettingsPage title="Réglages">
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Données</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Randonnées hors ligne"
            onPress={() => router.push('/settings/offline-hikes')}
          />
          <ProfileMenuRow
            label={isClearing ? 'Nettoyage…' : 'Vider le cache'}
            trailing="none"
            onPress={handleClearCache}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>À propos</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <SettingsInfoRow label="Névé" lines={buildLines} />
          <SettingsInfoRow
            label="Informations sur l'appareil"
            lines={[
              `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${String(Platform.Version)}`,
              `Expo SDK ${Constants.expoConfig?.sdkVersion ?? '—'}`,
            ]}
          />
        </View>
      </View>
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
});
