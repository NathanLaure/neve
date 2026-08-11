import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
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
  ({ passengers, onChange, onValidate }, ref) => (
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
        />
      </View>
    </BaseBottomSheetModal>
  )
);

PassengersBottomSheet.displayName = 'PassengersBottomSheet';

export default PassengersBottomSheet;

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
});
