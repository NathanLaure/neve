import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check, Crosshair, MapPin } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';

export interface RadiusBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

/** `null` = pas de limite de rayon, on affiche tout autour de la position actuelle. */
export const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Position actuelle' },
  { value: 5, label: 'Rayon de 5 km' },
  { value: 10, label: 'Rayon de 10 km' },
  { value: 20, label: 'Rayon de 20 km' },
  { value: 30, label: 'Rayon de 30 km' },
  { value: 50, label: 'Rayon de 50 km' },
  { value: 100, label: 'Rayon de 100 km' },
];

export const formatRadiusLabel = (radius: number | null) =>
  radius === null ? 'Position actuelle' : `${radius} km`;

const RadiusBottomSheetRender: React.ForwardRefRenderFunction<RadiusBottomSheetRef, any> = (
  _,
  ref
) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const modalRef = useRef<BaseBottomSheetModalRef>(null);

  const { searchRadiusKm, setSearchRadiusKm } = useAdventure();

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  return (
    <BaseBottomSheetModal
      ref={modalRef}
      snapPoints={['62%']}
      showHeader={true}
      title="Zone de recherche"
      showCloseButton={true}
      contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 0, flex: 1 }}>
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {RADIUS_OPTIONS.map((option) => {
          const isSelected = searchRadiusKm === option.value;
          const Icon = option.value === null ? Crosshair : MapPin;
          return (
            <Pressable
              key={option.label}
              onPress={() => {
                setSearchRadiusKm(option.value);
                modalRef.current?.dismiss();
              }}
              style={[
                styles.option,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 1.5 : 1,
                },
              ]}>
              <Icon size={20} color={isSelected ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.optionLabel,
                  { color: theme.text, fontWeight: isSelected ? '700' : '500' },
                ]}>
                {option.label}
              </Text>
              {isSelected && <Check size={20} color={theme.primary} />}
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BaseBottomSheetModal>
  );
};

const RadiusBottomSheet = forwardRef(RadiusBottomSheetRender);
RadiusBottomSheet.displayName = 'RadiusBottomSheet';

export default RadiusBottomSheet;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 16,
  },
});
