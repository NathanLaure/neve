import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Signpost, TramFront, Zap } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';

export interface AutoReturnInfoSheetProps {
  onDismiss: () => void;
}

const REASONS = [
  {
    Icon: Signpost,
    title: 'Calé sur la durée de la rando choisie',
    body: "Ta date s'ajuste automatiquement sur la durée de marche prévue.",
  },
  {
    Icon: TramFront,
    title: 'Trains garantis',
    // Les maquettes disaient « TER » : hors sujet en Île-de-France, où la desserte
    // est Transilien / RER. À revoir le jour du passage au national.
    body: "On vérifie immédiatement les vrais horaires Transilien et RER pour t'éviter les grilles vides.",
  },
  {
    Icon: Zap,
    title: 'Tu restes le boss',
    body: "Ce n'est qu'une suggestion.\nClique sur la case retour pour la modifier quand tu veux.",
  },
];

/** « On t'évite les calculs ! » — pourquoi la date de retour est pré-remplie. */
const AutoReturnInfoSheet = forwardRef<BaseBottomSheetModalRef, AutoReturnInfoSheetProps>(
  ({ onDismiss }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        showHeader
        title="On t'évite les calculs !"
        enableDynamicSizing
        snapPoints={[]}>
        <View style={styles.content}>
          <Text style={[styles.intro, { color: theme.text }]}>
            Pour te faire gagner du temps, Névé pré remplit ta date de retour.{' '}
            <Text style={styles.introBold}>Voici pourquoi :</Text>
          </Text>

          {REASONS.map(({ Icon, title, body }) => (
            <View key={title} style={[styles.reasonCard, { backgroundColor: theme.card }]}>
              <Icon size={28} color={theme.tint} />
              <View style={styles.reasonText}>
                <Text style={[styles.reasonTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.reasonBody, { color: theme.textMuted }]}>{body}</Text>
              </View>
            </View>
          ))}

          <Button
            title="Ça marche, j'ai compris !"
            variant="primary"
            onPress={onDismiss}
            style={styles.cta}
          />
        </View>
      </BaseBottomSheetModal>
    );
  }
);

AutoReturnInfoSheet.displayName = 'AutoReturnInfoSheet';

export default AutoReturnInfoSheet;

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingTop: 4,
  },
  intro: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  introBold: {
    fontFamily: 'Satoshi-Bold',
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 20,
    padding: 16,
  },
  reasonText: {
    flex: 1,
    gap: 2,
  },
  reasonTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  reasonBody: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    lineHeight: 20,
  },
  cta: {
    marginTop: 12,
  },
});
