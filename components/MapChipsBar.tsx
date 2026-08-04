import React, { ReactNode } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

/**
 * Height of a chips row floating over the map — taller than the default 40px
 * `Chip` so the pills read as siblings of the 56px searchbar. Screens use it to
 * offset content sitting below the bar.
 */
export const MAP_CHIPS_BAR_HEIGHT = 48;

/** Spacing between chips, reused by screens as the gap under the searchbar. */
export const MAP_CHIPS_BAR_GAP = 8;

/** Style every chip inside a map bar shares. */
export const mapChipStyle: ViewStyle = {
  minHeight: MAP_CHIPS_BAR_HEIGHT,
  borderRadius: 16,
  borderWidth: 0,
};

interface MapChipsBarProps {
  children: ReactNode;
  /** Horizontally scrollable — for open-ended lists that overflow the screen. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function MapChipsBar({ children, scrollable = false, style }: MapChipsBarProps) {
  if (scrollable) {
    return (
      <View style={[styles.container, styles.scrollableContainer, style]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: MAP_CHIPS_BAR_GAP,
  },
  scrollableContainer: {
    // The ScrollView bleeds to the screen edges so chips scroll out of view
    // cleanly, while its content keeps the 24px gutter.
    left: 0,
    right: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MAP_CHIPS_BAR_GAP,
    paddingHorizontal: 24,
  },
});
