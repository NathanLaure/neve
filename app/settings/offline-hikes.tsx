import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, MapPin, Trash2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import ScreenFooter from '@/components/ScreenFooter';
import SettingsPage from '@/components/profile/SettingsPage';

/**
 * « Randonnées hors ligne » — ce qui a été téléchargé pour marcher sans réseau.
 *
 * Jusqu'ici le téléchargement se déclenchait depuis la fiche d'une randonnée,
 * mais rien ne disait ce qui était déjà pris ni ne permettait de faire le ménage
 * autrement qu'en rouvrant chaque fiche une à une.
 */
export default function OfflineHikesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { hikes, offlineHikeIds, toggleOffline } = useAdventure();
  const [isClearing, setIsClearing] = useState(false);

  const offlineHikes = useMemo(
    () => hikes.filter((hike) => offlineHikeIds.has(hike.id)),
    [hikes, offlineHikeIds]
  );

  const handleRemove = (id: string, title: string) => {
    Alert.alert('Supprimer le téléchargement ?', `« ${title} » ne sera plus disponible hors ligne.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          toggleOffline(id, false);
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Tout supprimer ?',
      `Les ${offlineHikes.length} randonnées téléchargées seront retirées de cet appareil. Elles restent consultables en ligne.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            /* En série et non en parallèle : chaque appel relit puis réécrit la
               même entrée d'AsyncStorage, et des écritures concurrentes se
               perdraient les unes les autres. */
            for (const hike of offlineHikes) {
              await toggleOffline(hike.id, false);
            }
            setIsClearing(false);
          },
        },
      ]
    );
  };

  if (offlineHikes.length === 0) {
    return (
      <SettingsPage title="Randonnées hors ligne" fill contentContainerStyle={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
          <CloudOff size={32} color={theme.text} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun téléchargement</Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Depuis la fiche d{'’'}une randonnée, enregistrez-la hors ligne pour garder son tracé
          sous la main même sans réseau.
        </Text>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      title="Randonnées hors ligne"
      contentContainerStyle={styles.list}
      footer={
        <ScreenFooter>
          <Button
            variant="outlined"
            title="Tout supprimer"
            onPress={handleClearAll}
            loading={isClearing}
          />
        </ScreenFooter>
      }>
      <Text style={[styles.count, { color: theme.textMuted }]}>
        {offlineHikes.length} randonnée{offlineHikes.length > 1 ? 's' : ''} disponible
        {offlineHikes.length > 1 ? 's' : ''} sans réseau.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {offlineHikes.map((hike) => (
          <Pressable
            key={hike.id}
            accessibilityRole="button"
            accessibilityLabel={hike.title}
            onPress={() => router.push(`/rando/${hike.id}`)}
            android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
            style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                {hike.title}
              </Text>
              <View style={styles.rowMeta}>
                <MapPin size={12} color={theme.textMuted} />
                <Text style={[styles.rowMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                  {hike.location || hike.startStation} · {hike.distance}
                </Text>
              </View>
            </View>

            <IconButton
              variant="plain"
              icon={<Trash2 size={18} color={theme.statusBgError} />}
              onPress={() => handleRemove(hike.id, hike.title)}
              accessibilityLabel={`Supprimer le téléchargement de ${hike.title}`}
            />
          </Pressable>
        ))}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  count: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMetaText: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
    paddingBottom: 200,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 24,
    fontWeight: '800',
  },
  emptyText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
});
