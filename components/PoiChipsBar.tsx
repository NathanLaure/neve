import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import Chip from '@/components/Chip';
import MapChipsBar, { mapChipStyle } from '@/components/MapChipsBar';
import { POINTS_OF_INTEREST } from '@/constants/Filters';

interface PoiChipsBarProps {
  style?: StyleProp<ViewStyle>;
}

/** Quick multi-select over points of interest, mirroring the filters sheet section. */
export default function PoiChipsBar({ style }: PoiChipsBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { selectedPointsOfInterest, setSelectedPointsOfInterest } = useAdventure();

  const togglePoi = (poi: string) => {
    setSelectedPointsOfInterest(
      selectedPointsOfInterest.includes(poi)
        ? selectedPointsOfInterest.filter((p) => p !== poi)
        : [...selectedPointsOfInterest, poi]
    );
  };

  return (
    <MapChipsBar scrollable style={style}>
      {POINTS_OF_INTEREST.map((poi) => {
        const isSelected = selectedPointsOfInterest.includes(poi);
        return (
          <Chip
            key={poi}
            text={poi}
            selected={isSelected}
            onPress={() => togglePoi(poi)}
            // These chips are borderless like the rest of the map bars, so the
            // selected state has to be carried by the fill instead.
            style={[mapChipStyle, isSelected && { backgroundColor: theme.primary }]}
            textStyle={isSelected && { color: '#FFFFFF' }}
          />
        );
      })}
    </MapChipsBar>
  );
}
