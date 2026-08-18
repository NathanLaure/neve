import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import PassengersEditor from '@/components/plan/PassengersEditor';
import { Passenger } from '@/types/passenger';

export interface PassengersBottomSheetProps {
  passengers: Passenger[];
  onChange: (passengers: Passenger[]) => void;
  onValidate: () => void;
}

/**
 * « Qui part à l'aventure ? » en feuille, ouverte depuis la puce d'en-tête.
 * Le même contenu est monté en accordéon dans l'écran — voir PassengersEditor.
 */
const PassengersBottomSheet = forwardRef<BaseBottomSheetModalRef, PassengersBottomSheetProps>(
  ({ passengers, onChange, onValidate }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal
        ref={ref}
        title="Qui part à l'aventure ?"
        enableDynamicSizing
        snapPoints={[]}>
        <View style={styles.content}>
          <PassengersEditor
            passengers={passengers}
            onChange={onChange}
            onValidate={onValidate}
            /* La feuille est peinte en `card` : les pastilles de label des champs
               doivent masquer la bordure avec cette même couleur. */
            surfaceColor={theme.card}
          />
        </View>
      </BaseBottomSheetModal>
    );
  }
);

PassengersBottomSheet.displayName = 'PassengersBottomSheet';

export default PassengersBottomSheet;

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
});
