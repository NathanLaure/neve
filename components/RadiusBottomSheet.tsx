import React, { forwardRef, useRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Crosshair, MapPin } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';

export interface RadiusBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

export const formatRadiusLabel = (radius: number | null, isMapAreaActive = false) => {
  if (radius === null) return 'Position actuelle';
  if (isMapAreaActive) return `Zone affichée (${radius} km)`;
  return `Rayon de ${radius} km`;
};

const RadiusBottomSheetRender: React.ForwardRefRenderFunction<RadiusBottomSheetRef, any> = (
  _,
  ref
) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const modalRef = useRef<BaseBottomSheetModalRef>(null);

  const {
    searchRadiusKm,
    setSearchRadiusKm,
    mapSearchRadiusKm,
    isMapAreaActive,
    setIsMapAreaActive,
    resetToUserLocationRadius,
    userLocation,
    ensureHikesRadius,
  } = useAdventure();

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const options = useMemo(() => {
    const list: { key: string; value: number | null; isMapArea: boolean; label: string; icon: any }[] = [
      { key: 'user_location', value: null, isMapArea: false, label: 'Position actuelle', icon: Crosshair },
    ];

    // Dynamic map area option inserted between Position actuelle and Rayon de 5 km!
    if (mapSearchRadiusKm !== null || isMapAreaActive) {
      const activeRadius = mapSearchRadiusKm ?? searchRadiusKm ?? 15;
      list.push({
        key: 'map_area',
        value: activeRadius,
        isMapArea: true,
        label: `Zone de la carte (${activeRadius} km)`,
        icon: MapPin,
      });
    }

    list.push(
      { key: '5', value: 5, isMapArea: false, label: 'Rayon de 5 km', icon: MapPin },
      { key: '10', value: 10, isMapArea: false, label: 'Rayon de 10 km', icon: MapPin },
      { key: '20', value: 20, isMapArea: false, label: 'Rayon de 20 km', icon: MapPin },
      { key: '30', value: 30, isMapArea: false, label: 'Rayon de 30 km', icon: MapPin },
      { key: '50', value: 50, isMapArea: false, label: 'Rayon de 50 km', icon: MapPin },
      { key: '100', value: 100, isMapArea: false, label: 'Rayon de 100 km', icon: MapPin }
    );

    return list;
  }, [mapSearchRadiusKm, isMapAreaActive, searchRadiusKm]);

  const handleSelectOption = (option: { key: string; value: number | null; isMapArea: boolean }) => {
    if (option.key === 'user_location') {
      resetToUserLocationRadius();
    } else if (option.isMapArea) {
      setSearchRadiusKm(option.value);
      setIsMapAreaActive(true);
    } else {
      setSearchRadiusKm(option.value);
      setIsMapAreaActive(false);
      if (option.value !== null) {
        ensureHikesRadius(userLocation, option.value);
      }
    }
    modalRef.current?.dismiss();
  };

  return (
    <BaseBottomSheetModal
      ref={modalRef}
      enableDynamicSizing
      snapPoints={[]}
      title="Zone de recherche"
      showCloseButton={true}>
      {/* Pas de zone défilante ici. `BottomSheetView` et `BottomSheetScrollView`
          écrivent tous deux `animatedLayoutState.contentHeight` : imbriqués, le
          scrollable gagnait la course et publiait la hauteur de sa seule liste,
          en-tête exclu — la feuille ouvrait trop courte d'autant. La liste est
          bornée à huit options, elle tient sans défilement. */}
      <View style={styles.optionsList}>
        {options.map((option) => {
          const isSelected = option.isMapArea
            ? isMapAreaActive
            : option.value === null
              ? !isMapAreaActive && searchRadiusKm === null
              : !isMapAreaActive && searchRadiusKm === option.value;
          const Icon = option.icon;
          return (
            <ChoiceChip
              key={option.key}
              label={option.label}
              selected={isSelected}
              onPress={() => handleSelectOption(option)}
              leading={<Icon size={20} color={isSelected ? theme.primary : theme.textMuted} />}
              trailing={isSelected ? <Check size={20} color={theme.primary} /> : undefined}
            />
          );
        })}
      </View>
    </BaseBottomSheetModal>
  );
};

const RadiusBottomSheet = forwardRef(RadiusBottomSheetRender);
RadiusBottomSheet.displayName = 'RadiusBottomSheet';

export default RadiusBottomSheet;

const styles = StyleSheet.create({
  optionsList: {
    paddingTop: 8,
    gap: 12,
  },
});
