import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SignOutSheetProps {
  /** Referme la feuille et déconnecte : à la charge de l'appelant. */
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation avant déconnexion.
 *
 * La ligne « Déconnexion » voisine des rubriques anodines du profil : un appui
 * de trop y coupait la session sans prévenir. La feuille rend le geste
 * réversible, et dit ce qui reste — les aventures sont sur le compte, pas sur
 * l'appareil.
 */
const SignOutSheet = forwardRef<BaseBottomSheetModalRef, SignOutSheetProps>(
  ({ onConfirm, onCancel }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        title="Se déconnecter ?"
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
              variant="secondary"
              title="Annuler"
              onPress={onCancel}
              style={styles.footerButton}
            />
            <Button
              variant="primary"
              title="Se déconnecter"
              onPress={onConfirm}
              style={[styles.footerButton, { backgroundColor: theme.statusBgError }]}
            />
          </View>
        }>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: theme.statusBgErrorSubtle }]}>
            <LogOut size={28} color={theme.statusTextError} />
          </View>

          <Text style={[styles.message, { color: theme.text }]}>
            Tu vas quitter ton compte sur cet appareil
          </Text>

          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            Tes aventures, tes favoris et tes réglages restent enregistrés sur ton compte : tu les
            retrouveras à la prochaine connexion.
          </Text>
        </View>
      </BaseBottomSheetModal>
    );
  }
);

SignOutSheet.displayName = 'SignOutSheet';

export default SignOutSheet;

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
