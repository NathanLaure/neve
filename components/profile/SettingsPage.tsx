import React, { ReactNode } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { useScreenFooterHeight } from '@/components/ScreenFooter';

export interface SettingsPageProps {
  title: string;
  children: ReactNode;
  /**
   * Le corps occupe toute la hauteur au lieu de défiler. Pour un contenu qui se
   * centre — état vide, page d'annonce — et qui n'a rien à faire défiler.
   */
  fill?: boolean;
  /** Barre d'actions épinglée en bas de page. */
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Gabarit des pages ouvertes depuis le profil.
 *
 * Le profil ouvre ses rubriques en pages et non en feuilles : chacune a son
 * propre retour, son propre défilement et sa propre place dans l'historique de
 * navigation. Le gabarit tient l'en-tête commun — retour, titre, filet — pour
 * que ces pages ne se distinguent que par leur contenu.
 */
export default function SettingsPage({
  title,
  children,
  fill = false,
  footer,
  contentContainerStyle,
}: SettingsPageProps) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  /* Le pied est en `position: absolute` : il ne prend aucune place dans le
     flux, c'est au corps de réserver la sienne.

     Hauteur réelle du pied, plus une respiration. Le calcul précédent partait
     du seul rembourrage bas et ajoutait 64 : il tombait seize points sous la
     hauteur du pied, et la fin du contenu passait dessous. */
  const footerClearance = useScreenFooterHeight() + 24;

  /* `flex: 1` réservé au mode `fill` : dans une zone défilante, un enfant qui
     s'étire n'a aucune hauteur de référence et s'effondre à zéro. */
  const body = (
    <View style={[styles.body, fill && styles.bodyFill, contentContainerStyle]}>{children}</View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Même rythme que l'en-tête du profil : la ligne de boutons d'abord,
            le titre en dessous — pas côte à côte. */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {/* Gabarit du bouton retour, celui de la fiche randonnée : 40×40,
                flèche en 20, et pastille claire dans les deux thèmes —
                `Colors.light` et non `theme`, comme tous les retours de l'app.
                Un seul en-tête pour les seize écrans de réglages. */}
            <IconButton
              variant="circle"
              icon={<ArrowLeft size={20} color={Colors.light.buttonIconColor} />}
              style={{ backgroundColor: Colors.light.buttonBgIcon }}
              onPress={() => router.back()}
              accessibilityLabel="Revenir en arrière"
            />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {fill ? (
          body
        ) : (
          <ScrollView
            style={styles.scroll}
            /* `flexGrow` et non `flex` : le contenu garde sa hauteur naturelle
               quand il dépasse, et remplit l'écran quand il est plus court —
               ce qui permet à une page de coller un bloc en bas avec une marge
               automatique. Sans lui, la zone défilante n'a pas de hauteur de
               référence à donner à ses enfants. */
            contentContainerStyle={{
              paddingBottom: footer ? footerClearance : 40,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        )}

        {footer}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    lineHeight: 34,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
  },
  bodyFill: {
    flex: 1,
  },
});
