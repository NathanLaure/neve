import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import ToggleRow from '@/components/ToggleRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TRANSPORT_PASSES, TransportPassId } from '@/types/passenger';

export interface FareZonesBottomSheetProps {
  value: TransportPassId[];
  onChange: (passes: TransportPassId[]) => void;
}

/**
 * « Zones tarifaires » — les abonnements à prendre en compte pour filtrer les
 * résultats (Figma 289:4290).
 *
 * Même liste d'abonnements que le profil et l'inscription : ce que l'utilisateur
 * a déclaré posséder s'y retrouve coché d'avance. La feuille n'a pas de bouton
 * de validation, les interrupteurs valant décision — la liste derrière se
 * réordonne à chaque bascule.
 */
const FareZonesBottomSheet = forwardRef<BaseBottomSheetModalRef, FareZonesBottomSheetProps>(
  ({ value, onChange }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const toggle = (id: TransportPassId, enabled: boolean) => {
      onChange(enabled ? [...value, id] : value.filter((pass) => pass !== id));
    };

    return (
      <BaseBottomSheetModal
        ref={ref}
        title="Zones tarifaires"
        subtitle="Sélectionnez vos pass et abonnements à utiliser pour filtrer vos résultats de recherche."
        enableDynamicSizing
        snapPoints={[]}>
        <View style={styles.list}>
          {TRANSPORT_PASSES.map((pass) => (
            <ToggleRow
              key={pass.id}
              title={pass.label}
              value={value.includes(pass.id)}
              onValueChange={(enabled) => toggle(pass.id, enabled)}
              backgroundColor={theme.card}
            />
          ))}
        </View>
      </BaseBottomSheetModal>
    );
  }
);

FareZonesBottomSheet.displayName = 'FareZonesBottomSheet';

export default FareZonesBottomSheet;

const styles = StyleSheet.create({
  list: {
    paddingTop: 8,
  },
});
