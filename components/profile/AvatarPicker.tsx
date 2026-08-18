import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, UserRound } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { removeAvatar, uploadAvatar } from '@/services/avatarService';
import { showToast } from '@/utils/toast';

const SIZE = 96;

export interface AvatarPickerProps {
  userId: string;
  avatarUrl?: string | null;
  /** Reçoit la nouvelle URL, ou `null` quand la photo est retirée. */
  onChange: (url: string | null) => Promise<void> | void;
}

/**
 * Aperçu et modification de la photo de profil.
 *
 * L'envoi est immédiat et ne passe pas par le bouton « Enregistrer » de la page :
 * une image part sur le réseau, et laisser croire qu'un retour l'annulerait
 * serait mentir — le fichier serait déjà dans le bucket.
 *
 * L'image est recadrée en carré à la sélection : l'aperçu est rond partout dans
 * l'app, autant l'imposer une fois pour toutes plutôt que de laisser un portrait
 * se faire rogner différemment à chaque endroit.
 */
export default function AvatarPicker({ userId, avatarUrl, onChange }: AvatarPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isBusy, setIsBusy] = useState(false);

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error(
        'Accès refusé',
        'Autorisez Névé à accéder à vos photos pour changer votre portrait.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;

    setIsBusy(true);
    const { url, error } = await uploadAvatar(userId, asset.uri, asset.mimeType);
    if (error || !url) {
      setIsBusy(false);
      showToast.error('Envoi impossible', error ?? undefined);
      return;
    }

    await onChange(url);
    setIsBusy(false);
  };

  const handleRemove = async () => {
    setIsBusy(true);
    const { error } = await removeAvatar(userId);
    if (error) {
      setIsBusy(false);
      showToast.error('Suppression impossible', error);
      return;
    }

    await onChange(null);
    setIsBusy(false);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Changer la photo de profil"
        onPress={handlePick}
        disabled={isBusy}
        style={styles.avatarPress}>
        <View style={[styles.avatar, { backgroundColor: theme.blueBadge }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <UserRound size={44} color={theme.text} strokeWidth={1.5} />
          )}

          {isBusy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {/* Pastille posée à cheval sur le bord du portrait : elle annonce que
            l'aperçu est aussi le bouton, sans texte à traduire. */}
        <View
          style={[styles.badge, { backgroundColor: theme.text, borderColor: theme.background }]}>
          <Camera size={14} color={theme.background} />
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={handlePick} disabled={isBusy} hitSlop={8}>
          <Text style={[styles.action, { color: theme.tint }]}>
            {avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
          </Text>
        </Pressable>

        {avatarUrl ? (
          <>
            <Text style={[styles.separator, { color: theme.textMuted }]}>·</Text>
            <Pressable onPress={handleRemove} disabled={isBusy} hitSlop={8}>
              <Text style={[styles.action, { color: theme.statusBgError }]}>Supprimer</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  avatarPress: {
    width: SIZE,
    height: SIZE,
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
});
