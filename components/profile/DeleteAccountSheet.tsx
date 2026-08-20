import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface DeleteAccountSheetProps {
  /** Suppression confirmée : à la charge de l'appelant de refermer et de naviguer. */
  onConfirm: () => void;
  onCancel: () => void;
  /** Grise les deux issues pendant l'appel réseau. */
  isDeleting?: boolean;
}

/**
 * Confirmation avant suppression définitive du compte.
 *
 * Même forme que `SignOutSheet`, dont elle reprend le patron, mais l'écart entre
 * les deux gestes est dit par le texte : une déconnexion se rattrape en se
 * reconnectant, ici rien ne revient. L'énumération de ce qui disparaît n'est pas
 * décorative — le randonneur doit pouvoir mesurer la perte avant de confirmer,
 * pas après.
 *
 * Pas de mot à recopier, qui serait pourtant la protection habituelle : il
 * faudrait un champ de saisie, donc un clavier, dans une feuille à
 * dimensionnement dynamique — la seule autre feuille de l'app qui porte une
 * saisie s'ancre à `100%` justement pour éviter ça. Un panneau qui sursaute
 * ailleurs est un défaut ; ici il empêcherait de supprimer son compte, ce que la
 * réglementation ne tolère pas. L'action est déjà à trois écrans de la page
 * d'accueil.
 */
const DeleteAccountSheet = forwardRef<BaseBottomSheetModalRef, DeleteAccountSheetProps>(
  ({ onConfirm, onCancel, isDeleting = false }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        title="Supprimer ton compte ?"
        enableDynamicSizing
        snapPoints={[]}
        /* Pas de croix : les deux boutons sont les sorties, et la poignée garde
           le glissement vers le bas — qui vaut « Annuler ». */
        showCloseButton={false}
        footer={
          <View style={styles.footerRow}>
            <Button
              variant="secondary"
              title="Annuler"
              onPress={onCancel}
              disabled={isDeleting}
              style={styles.footerButton}
            />
            <Button
              variant="primary"
              title="Supprimer"
              onPress={onConfirm}
              loading={isDeleting}
              disabled={isDeleting}
              style={[styles.footerButton, { backgroundColor: theme.statusBgError }]}
            />
          </View>
        }>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: theme.statusBgErrorSubtle }]}>
            <Trash2 size={28} color={theme.statusTextError} />
          </View>

          <Text style={[styles.message, { color: theme.text }]}>
            Cette action est définitive
          </Text>

          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            Ton compte, tes aventures planifiées, tes favoris, ton adresse de domicile et ta photo
            de profil seront effacés. Rien ne pourra être restauré, et les liens de partage que tu
            as envoyés cesseront de fonctionner.
          </Text>

        </View>
      </BaseBottomSheetModal>
    );
  }
);

DeleteAccountSheet.displayName = 'DeleteAccountSheet';

export default DeleteAccountSheet;

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
