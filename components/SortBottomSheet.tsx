import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ChevronDown,
  ChevronsUp,
  ClockPlus,
  Flame,
  Map,
  Ruler,
  Signpost,
  Zap,
} from 'lucide-react-native';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SORT_OPTIONS, SortOptionId } from '@/constants/SortOptions';

export interface SortBottomSheetProps {
  value: SortOptionId;
  onChange: (id: SortOptionId) => void;
}

/** Pictogramme de chaque critère, tel que posé dans Figma 103:2618. */
const SORT_ICONS: Record<SortOptionId, React.ComponentType<{ size?: number; color?: string }>> = {
  nearest: Ruler,
  fastest_access: ChevronsUp,
  least_elevation: ChevronDown,
  most_popular: Flame,
  newest: ClockPlus,
  relevance: Signpost,
  longest: Map,
  shortest: Zap,
};

/**
 * « Trier par » — choix unique parmi les critères de classement des résultats
 * (Figma 49:4766).
 *
 * Le choix s'applique et referme la feuille du même geste : il n'y a rien à
 * confirmer sur une liste qui se réordonne derrière, et un bouton de validation
 * ferait douter que le tri ait été pris en compte.
 */
const SortBottomSheet = forwardRef<BaseBottomSheetModalRef, SortBottomSheetProps>(
  ({ value, onChange }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <BaseBottomSheetModal ref={ref} title="Trier par" enableDynamicSizing snapPoints={[]}>
        <View style={styles.list}>
          {SORT_OPTIONS.map((option) => {
            const Icon = SORT_ICONS[option.id];
            const selected = option.id === value;

            return (
              <ChoiceChip
                key={option.id}
                label={option.label}
                selected={selected}
                onPress={() => onChange(option.id)}
                leading={
                  <Icon size={16} color={selected ? theme.primary : theme.text} />
                }
              />
            );
          })}
        </View>
      </BaseBottomSheetModal>
    );
  }
);

SortBottomSheet.displayName = 'SortBottomSheet';

export default SortBottomSheet;

const styles = StyleSheet.create({
  list: {
    paddingTop: 8,
    gap: 12,
  },
});
