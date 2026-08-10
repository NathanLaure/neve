import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowUpDown, MapPin, Undo2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import ItemButton from '@/components/ItemButton';

export interface JourneyOptionsSheetProps {
  /** Un lieu de retour distinct est déjà posé : on propose de l'annuler. */
  hasReturnPoint: boolean;
  /** Le sentier ne revient pas à son point de départ : l'inversion a un sens. */
  canReverse: boolean;
  onChangeDeparture: () => void;
  onChangeReturnPoint: () => void;
  onClearReturnPoint: () => void;
  onReverse: () => void;
}

/**
 * Menu « … » de la ligne de départ (Figma 590:17379 & 424:5042).
 * Conforme au composant ItemButton et à la feuille d'options de la page détail randonnée (app/rando/[id].tsx).
 */
const JourneyOptionsSheet = forwardRef<BaseBottomSheetModalRef, JourneyOptionsSheetProps>(
  (
    {
      hasReturnPoint,
      canReverse,
      onChangeDeparture,
      onChangeReturnPoint,
      onClearReturnPoint,
      onReverse,
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const options = [
      {
        key: 'return',
        Icon: Undo2,
        title: hasReturnPoint ? 'Changer le lieu de retour' : 'Rentrer à un autre endroit',
        onPress: () => {
          (ref as any)?.current?.dismiss();
          onChangeReturnPoint();
        },
      },
      {
        key: 'clear-return',
        Icon: Undo2,
        title: 'Rentrer au point de départ',
        onPress: () => {
          (ref as any)?.current?.dismiss();
          onClearReturnPoint();
        },
        hidden: !hasReturnPoint,
      },
      {
        key: 'departure',
        Icon: MapPin,
        title: 'Modifier le point de départ',
        onPress: () => {
          (ref as any)?.current?.dismiss();
          onChangeDeparture();
        },
      },
      {
        key: 'reverse',
        Icon: ArrowUpDown,
        title: 'Inverser le sens du parcours',
        onPress: () => {
          (ref as any)?.current?.dismiss();
          onReverse();
        },
        hidden: !canReverse,
      },
    ].filter((option) => !option.hidden);

    return (
      <BaseBottomSheetModal
        ref={ref}
        showHeader={true}
        title="Options du trajet"
        enableDynamicSizing
        snapPoints={[]}>
        <View style={styles.content}>
          {options.map(({ key, Icon, title, onPress }) => (
            <ItemButton
              key={key}
              icon={<Icon size={20} color={theme.text} />}
              label={title}
              onPress={onPress}
            />
          ))}
        </View>
      </BaseBottomSheetModal>
    );
  }
);

JourneyOptionsSheet.displayName = 'JourneyOptionsSheet';

export default JourneyOptionsSheet;

const styles = StyleSheet.create({
  content: {
    gap: 4,
    paddingTop: 0,
    paddingBottom: 8,
  },
});
