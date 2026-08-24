import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarX2 } from 'lucide-react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface CancelAdventureSheetProps {
  /** Titre de la randonnée, rappelé pour qu'on sache laquelle on efface. */
  hikeTitle: string;
  /** Aventure déjà passée : c'est une ligne d'historique qu'on retire, pas un voyage qu'on annule. */
  isPast?: boolean;
  /** Referme la feuille et supprime : à la charge de l'appelant. */
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation avant suppression d'une aventure.
 *
 * L'aventure porte des dates, des trajets et parfois des billets déjà achetés :
 * un appui de trop dans la feuille d'options ne doit pas emporter tout ça. La
 * feuille dit aussi ce qui survit — la randonnée elle-même reste consultable.
 */
const CancelAdventureSheet = forwardRef<BaseBottomSheetModalRef, CancelAdventureSheetProps>(
  ({ hikeTitle, isPast = false, onConfirm, onCancel }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        title={isPast ? "Retirer de l'historique ?" : "Annuler l'aventure ?"}
        enableDynamicSizing
        snapPoints={[]}
        /* Pas de croix : les deux boutons sont les sorties, et la poignée garde
           le glissement vers le bas — qui vaut « Annuler ». */
        showCloseButton={false}
        /* Pied de page sur mesure : le bouton de confirmation doit porter le
           rouge des actions destructrices, que les variantes de `Button`
           n'exposent pas. */
        footer={
          <View style={styles.footerRow}>
            <Button
              variant="transparent"
              title="Garder"
              onPress={onCancel}
              style={styles.footerButton}
            />
            <Button
              variant="primary"
              title={isPast ? 'Retirer' : 'Annuler'}
              onPress={onConfirm}
              style={[styles.footerButton, { backgroundColor: theme.statusBgError }]}
            />
          </View>
        }>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: theme.statusBgErrorSubtle }]}>
            <CalendarX2 size={28} color={theme.statusTextError} />
          </View>

          <Text style={[styles.message, { color: theme.text }]}>{hikeTitle}</Text>

          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            {isPast
              ? "Cette sortie disparaîtra de tes aventures passées. La randonnée, elle, reste consultable."
              : "Les dates et les trajets retenus seront perdus. La randonnée reste consultable, et tes billets déjà achetés ne sont pas remboursés pour autant."}
          </Text>
        </View>
      </BaseBottomSheetModal>
    );
  }
);

CancelAdventureSheet.displayName = 'CancelAdventureSheet';

export default CancelAdventureSheet;

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  explanation: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /* Largeurs égales : aucune des deux issues n'est le chemin par défaut. */
  footerButton: {
    flex: 1,
  },
});
