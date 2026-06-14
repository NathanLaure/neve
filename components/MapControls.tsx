import React from 'react';
import { StyleSheet, View, Pressable, Platform, ActivityIndicator, ViewStyle } from 'react-native';
import { Layers, LocateFixed } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface MapControlsProps {
  compassBearing: number; // degrees — 0 = north up
  onPressCompass: () => void;
  onPressLayers: () => void;
  onPressLocate: () => void;
  isLocating: boolean;
  style?: ViewStyle;
}

/**
 * Custom compass needle SVG — red triangle on top, grey on bottom, matching Figma design
 */
function CompassNeedle({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Red north half */}
      <Path d="M12 2 L15 12 L9 12 Z" fill="#EB490B" />
      {/* Grey south half */}
      <Path d="M12 22 L9 12 L15 12 Z" fill="#BDBDBD" />
    </Svg>
  );
}

export default function MapControls({
  compassBearing,
  onPressCompass,
  onPressLayers,
  onPressLocate,
  isLocating,
  style,
}: MapControlsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Rotate the compass needle opposite to map bearing
  const compassStyle = {
    transform: [{ rotate: `${-compassBearing}deg` }],
  };

  return (
    <View style={[styles.container, style]}>
      {/* Compass — separate circle */}
      <Pressable
        onPress={onPressCompass}
        style={[
          styles.compassButton,
          {
            backgroundColor: theme.card,
            shadowColor: '#000',
          },
        ]}>
        <View style={compassStyle}>
          <CompassNeedle size={24} />
        </View>
      </Pressable>

      {/* Layers + GPS — joined pill */}
      <View
        style={[
          styles.pillGroup,
          {
            backgroundColor: theme.card,
            shadowColor: '#000',
          },
        ]}>
        {/* Layers (top) */}
        <Pressable onPress={onPressLayers} style={styles.pillButton}>
          <Layers size={24} color={theme.text} />
        </Pressable>

        {/* Separator */}
        <View style={[styles.pillSeparator, { backgroundColor: theme.border }]} />

        {/* Locate (bottom) */}
        <Pressable onPress={onPressLocate} style={styles.pillButton}>
          {isLocating ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <LocateFixed size={24} color={theme.text} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const SHADOW = Platform.select({
  ios: {
    shadowOffset: { width: 0, height: 10 } as { width: number; height: number },
    shadowOpacity: 0.06,
    shadowRadius: 15,
  },
  android: {
    elevation: 6,
  },
}) as Record<string, any>;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    alignItems: 'center',
    gap: 12,
  },
  compassButton: {
    width: 48,
    height: 48,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  pillGroup: {
    borderRadius: 100,
    overflow: 'hidden',
    ...SHADOW,
  },
  pillButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSeparator: {
    height: StyleSheet.hairlineWidth,
    width: 32,
    alignSelf: 'center',
  },
});
