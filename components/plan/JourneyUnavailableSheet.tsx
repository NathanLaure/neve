import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface JourneyUnavailableSheetProps {
  /** Referme la feuille et quitte l'écran : il n'a aucun itinéraire à montrer. */
  onBack: () => void;
  onOpenSupport: () => void;
}

/**
 * Le calculateur d'itinéraires n'a pas répondu.
 *
 * Le service retombe alors sur des estimations calculées à vol d'oiseau —
 * horaires, durées et correspondances qui n'existent pas. Plutôt que de les
 * afficher comme le reste, l'écran s'arrête ici : on ne fait pas planifier un
 * départ sur des trains imaginaires.
 */
const JourneyUnavailableSheet = forwardRef<
  BaseBottomSheetModalRef,
  JourneyUnavailableSheetProps
>(({ onBack, onOpenSupport }, ref) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <BaseBottomSheetModal
      ref={ref}
      title="Aucun itinéraire trouvé"
      enableDynamicSizing
      snapPoints={[]}
      /* Impasse : derrière cette feuille, l'écran n'a aucun itinéraire à
         montrer. La refermer d'un glissement laisserait l'utilisateur devant du
         vide sans savoir pourquoi — les deux actions sont les seules sorties. */
      blocking
      showCloseButton={true}
      primaryButtonTitle="Retour"
      onPrimaryPress={onBack}
      secondaryButtonTitle="Aide & support"
      secondaryButtonVariant="transparent"
      onSecondaryPress={onOpenSupport}>
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: theme.statusBgWarningSubtle }]}>
          <CircleAlert size={28} color={theme.statusTextWarning} />
        </View>

        <Text style={[styles.message, { color: theme.text }]}>
          Nous n’avons pas réussi à calculer de trajet vers cette randonnée.
        </Text>

        <Text style={[styles.explanation, { color: theme.textMuted }]}>
          Le calculateur d’itinéraires n’a pas répondu. Revenez en arrière pour changer de date,
          d’horaire ou de point de départ, ou contactez le support via la page aide de votre
          profil si le problème persiste.
        </Text>
      </View>
    </BaseBottomSheetModal>
  );
});

JourneyUnavailableSheet.displayName = 'JourneyUnavailableSheet';

export default JourneyUnavailableSheet;

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
});
