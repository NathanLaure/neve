import React, { useCallback, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import SettingsPage from '@/components/profile/SettingsPage';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';

type PermissionState = 'granted' | 'denied' | 'unknown';

const STATE_LABELS: Record<PermissionState, string> = {
  granted: 'Autorisé',
  denied: 'Refusé',
  unknown: 'Non demandé',
};

/**
 * « Autorisations » — l'état des permissions système et le chemin pour en changer.
 *
 * Rien ne se bascule ici : une fois la permission refusée, iOS comme Android
 * cessent de rejouer leur boîte de dialogue, et seul le panneau système de
 * l'appareil peut revenir dessus. La page ne peut donc que constater et y mener,
 * ce qui vaut mieux qu'un interrupteur qui ne ferait rien.
 */
export default function PermissionsSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [location, setLocation] = useState<PermissionState>('unknown');
  const [notifications, setNotifications] = useState<PermissionState>('unknown');

  /*
   * Relu à chaque retour sur l'écran ET à chaque retour d'arrière-plan : c'est
   * précisément le trajet que fait l'utilisateur quand il part changer un
   * réglage dans le panneau système, et l'état affiché doit avoir suivi.
   */
  const refresh = useCallback(async () => {
    const [locationStatus, notificationStatus] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);

    setLocation(locationStatus.granted ? 'granted' : locationStatus.canAskAgain ? 'unknown' : 'denied');
    setNotifications(
      notificationStatus.granted ? 'granted' : notificationStatus.canAskAgain ? 'unknown' : 'denied'
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') refresh();
      });
      return () => subscription.remove();
    }, [refresh])
  );

  return (
    <SettingsPage title="Autorisations">
      <View style={styles.group}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ProfileMenuRow
            label={`Localisation · ${STATE_LABELS[location]}`}
            trailing="external"
            onPress={() => Linking.openSettings()}
          />
          <ProfileMenuRow
            label={`Notifications · ${STATE_LABELS[notifications]}`}
            trailing="external"
            onPress={() => Linking.openSettings()}
          />
        </View>

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          La localisation sert à classer les randonnées par temps de trajet depuis l{'’'}endroit
          où vous êtes. Refusée, Névé se rabat sur votre adresse de domicile.
        </Text>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Ces réglages appartiennent au téléphone : les modifier ouvre le panneau système de
          Névé.
        </Text>
      </View>
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
  hint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
