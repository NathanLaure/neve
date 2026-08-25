import React, { useCallback, useEffect, useState } from 'react';
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
 * Convertit le niveau d'API Android en nom commercial plus lisible.
 */
function formatSystemVersion(): string {
  if (Platform.OS === 'ios') {
    return `iOS ${Platform.Version}`;
  }
  const apiLevel = Number(Platform.Version);
  const versionMap: Record<number, string> = {
    28: 'Android 9',
    29: 'Android 10',
    30: 'Android 11',
    31: 'Android 12',
    32: 'Android 12L',
    33: 'Android 13',
    34: 'Android 14',
    35: 'Android 15',
    36: 'Android 16',
    37: 'Android 16 QPR',
  };
  const androidName = versionMap[apiLevel];
  if (androidName) {
    return `${androidName} (API ${apiLevel})`;
  }
  return `Android (API ${Platform.Version})`;
}

/** Formate une taille en octets en libellé lisible. */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 Ko';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `~${Math.max(1, Math.round(kb))} Ko`;
  }
  const mb = (kb / 1024).toFixed(1);
  return `~${mb} Mo`;
}

/**
 * « Réglages » — gestion du stockage local (randonnées hors ligne, cache)
 * et informations système de l'application.
 */
export default function AppSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { offlineHikeIds, refreshFavorites, refreshAdventures } = useAdventure();
  const [isClearing, setIsClearing] = useState(false);
  const [cacheSizeBytes, setCacheSizeBytes] = useState<number | null>(null);

  const measureCacheSize = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stale = keys.filter((key) => CACHE_KEY_PREFIXES.some((p) => key.startsWith(p)));
      if (stale.length === 0) {
        setCacheSizeBytes(0);
        return;
      }
      const entries = await AsyncStorage.multiGet(stale);
      let totalBytes = 0;
      for (const [key, val] of entries) {
        totalBytes += (key?.length ?? 0) + (val?.length ?? 0);
      }
      setCacheSizeBytes(totalBytes);
    } catch {
      setCacheSizeBytes(0);
    }
  }, []);

  useEffect(() => {
    measureCacheSize();
  }, [measureCacheSize]);

  const clearCache = async () => {
    setIsClearing(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stale = keys.filter((key) => CACHE_KEY_PREFIXES.some((p) => key.startsWith(p)));
      if (stale.length > 0) {
        await AsyncStorage.multiRemove(stale);
      }

      await Promise.all([refreshFavorites(), refreshAdventures()]);
      await measureCacheSize();
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
      'Les favoris et aventures enregistrés sur cet appareil seront rechargés depuis votre compte. Vos randonnées hors ligne ne sont pas touchées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCache },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const offlineCount = offlineHikeIds.size;
  const offlineLabel =
    offlineCount > 0 ? `${offlineCount} enregistrée${offlineCount > 1 ? 's' : ''}` : 'Aucune';

  const cacheLabel = cacheSizeBytes !== null ? formatBytes(cacheSizeBytes) : '…';

  return (
    <SettingsPage title="Réglages">
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Données & Stockage</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label="Randonnées hors ligne"
            value={offlineLabel}
            onPress={() => router.push('/settings/offline-hikes')}
          />
          <ProfileMenuRow
            label={isClearing ? 'Nettoyage en cours…' : 'Vider le cache'}
            subtitle="Favoris et aventures mis en mémoire"
            value={cacheLabel}
            trailing="none"
            onPress={handleClearCache}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Application</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <SettingsInfoRow label="Névé" lines={[`Version ${version}`]} />
          <SettingsInfoRow label="Système" lines={[formatSystemVersion()]} />
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
