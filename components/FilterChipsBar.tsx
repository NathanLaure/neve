import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { ChevronDown, SlidersHorizontal } from 'lucide-react-native';

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
  const { searchRadiusKm } = useAdventure();

  return (
    <MapChipsBar style={style}>
      <Chip
        text="Filtres"
        icon={<SlidersHorizontal size={18} color={theme.text} />}
        onPress={onPressFilters}
        style={mapChipStyle}
      />
      <Chip
        text={formatRadiusLabel(searchRadiusKm)}
        selected={searchRadiusKm !== null}
        trailingIcon={<ChevronDown size={18} color={theme.textMuted} />}
        onPress={onPressRadius}
        style={mapChipStyle}
      />
    </MapChipsBar>
  );
}
