import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { CircleDotDashed, SlidersHorizontal } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import Chip from '@/components/Chip';
import MapChipsBar, { mapChipStyle } from '@/components/MapChipsBar';
import { formatRadiusLabel } from '@/components/RadiusBottomSheet';

interface FilterChipsBarProps {
  onPressFilters?: () => void;
  onPressRadius?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function FilterChipsBar({
  onPressFilters,
  onPressRadius,
  style,
}: FilterChipsBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { searchRadiusKm, isMapAreaActive, activeFiltersCount } = useAdventure();

  return (
    <MapChipsBar style={style}>
      <Chip
        text={formatRadiusLabel(searchRadiusKm, isMapAreaActive)}
        selected={searchRadiusKm !== null || isMapAreaActive}
        icon={<CircleDotDashed size={18} color={theme.text} />}
        onPress={onPressRadius}
        style={mapChipStyle}
        textStyle={{ color: theme.text }}
      />
      <Chip
        text="Filtres"
        selected={activeFiltersCount > 0}
        badgeCount={activeFiltersCount}
        icon={<SlidersHorizontal size={18} color={theme.text} />}
        onPress={onPressFilters}
        style={mapChipStyle}
        textStyle={{ color: theme.text }}
      />
    </MapChipsBar>
  );
}
