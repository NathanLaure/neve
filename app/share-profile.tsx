import React from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Copy, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import SettingsPage from '@/components/profile/SettingsPage';
import { showToast } from '@/utils/toast';

const PROFILE_BASE_URL = 'https://neve-rando.fr/u';

/**
 * Un QR se lit par contraste : modules sombres sur fond clair. Ces deux valeurs
 * sont donc figées et ne suivent pas le thème — un code inversé en mode sombre
 * n'est pas scanné par la moitié des appareils.
 */
const QR_FOREGROUND = '#111111';
const QR_BACKGROUND = '#FFFFFF';

/**
 * « Partager mon profil ».
 *
 * Le lien ne mène encore nulle part : les profils publics arriveront dans une
 * mise à jour ultérieure. Il est néanmoins définitif — il est construit sur
 * l'identifiant du compte, qui ne changera pas — donc un code déjà partagé
 * fonctionnera le jour où la page existera.
 */
export default function ShareProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, profile } = useAuth();

  const displayName =
    profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Randonneur';
  const profileUrl = user?.id ? `${PROFILE_BASE_URL}/${user.id}` : PROFILE_BASE_URL;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(profileUrl);
    showToast.success('Lien copié', 'Le lien de votre profil est dans le presse-papiers.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Retrouvez-moi sur Névé : ${profileUrl}`,
      });
    } catch (error) {
      console.warn('Partage impossible:', error);
    }
  };

  return (
    <SettingsPage title="Partager mon profil" contentContainerStyle={styles.content}>
      <View style={[styles.qrCard, { backgroundColor: QR_BACKGROUND }]}>
        <QRCode
          value={profileUrl}
          size={200}
          color={QR_FOREGROUND}
          backgroundColor={QR_BACKGROUND}
        />
      </View>

      <View style={styles.identity}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.url, { color: theme.textMuted }]} numberOfLines={1}>
          {profileUrl}
        </Text>
      </View>

      <Text style={[styles.notice, { color: theme.textMuted }]}>
        Les profils publics arrivent dans une prochaine mise à jour : ce code sera alors le
        moyen le plus court de suivre les aventures de quelqu{'’'}un.
      </Text>

      <View style={styles.actions}>
        <Button
          variant="outlined"
          title="Copier le lien"
          icon={<Copy size={18} color={theme.text} />}
          onPress={handleCopy}
        />
        <Button
          variant="primary"
          title="Partager le profil"
          icon={<Share2 size={18} color={theme.buttonTextOnBrand} />}
          onPress={handleShare}
        />
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 16,
  },
  /* Le fond blanc du QR déborde le code de 20px : sans cette « zone calme »,
     les lecteurs peinent à délimiter le motif. */
  qrCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
  },
  identity: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  url: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  notice: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 4,
  },
});
