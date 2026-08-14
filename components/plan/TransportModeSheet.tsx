import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';
import { TransportLineBadge } from '@/components/plan/TransportLineBadge';
import { TRANSIT_MODE_LABELS, TransitTransportMode } from '@/services/transitService';

export interface TransportModeSheetProps {
  /** Modes réellement présents dans les résultats en cours. */
  availableModes: TransitTransportMode[];
  /** Sélection réellement appliquée à la liste — sert à réinitialiser le brouillon à l'ouverture. */
  selectedModes: Set<TransitTransportMode>;
  /** Appelé uniquement au clic sur « Appliquer », avec la sélection du brouillon. */
  onApply: (modes: Set<TransitTransportMode>) => void;
  onClose?: () => void;
}

/**
 * Filtre par mode de transport (Figma chip « Metro, Bus + 3 »). Les coches se
 * cochent/décochent dans un brouillon local ; la liste de résultats ne bouge
 * qu'au clic sur « Appliquer », qui referme aussi la feuille.
 */
const TransportModeSheet = forwardRef<BaseBottomSheetModalRef, TransportModeSheetProps>(
  ({ availableModes, selectedModes, onApply, onClose }, ref) => {
    const [draftModes, setDraftModes] = useState<Set<TransitTransportMode>>(selectedModes);

    // Réaligne le brouillon sur la sélection appliquée à chaque réouverture —
    // ou quand une nouvelle recherche l'a réinitialisée pendant que la feuille
    // était fermée.
    useEffect(() => {
      setDraftModes(new Set(selectedModes));
    }, [selectedModes]);

    const toggleDraft = (mode: TransitTransportMode) => {
      setDraftModes((prev) => {
        const next = new Set(prev);
        if (next.has(mode)) next.delete(mode);
        else next.add(mode);
        return next;
      });
    };

    const handleApply = () => {
      onApply(draftModes);
      (ref as any)?.current?.dismiss();
    };

    return (
      <BaseBottomSheetModal
        ref={ref}
        title="Modes de transport"
        enableDynamicSizing
        snapPoints={[]}
        onClose={onClose}
        primaryButtonTitle="Appliquer"
        onPrimaryPress={handleApply}>
        <View style={styles.content}>
          {availableModes.map((mode) => (
            <ChoiceChip
              key={mode}
              label={TRANSIT_MODE_LABELS[mode]}
              selected={draftModes.has(mode)}
              onPress={() => toggleDraft(mode)}
              leading={<TransportLineBadge mode={mode} size={20} />}
              checkbox
            />
          ))}
        </View>
      </BaseBottomSheetModal>
    );
  }
);

TransportModeSheet.displayName = 'TransportModeSheet';

export default TransportModeSheet;

const styles = StyleSheet.create({
  content: {
    gap: 8,
  },
});
