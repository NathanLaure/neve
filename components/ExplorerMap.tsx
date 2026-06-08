import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RandoData } from '@/constants/RandosData';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ExplorerMapProps {
  userLocation: { latitude: number; longitude: number };
  userLocationName: string;
  hikes: RandoData[];
  selectedHikeId: string | null;
  onSelectHike: (id: string) => void;
}

// Map bounding box coordinates for calculation
const MIN_LON = 1.6;
const MAX_LON = 2.9;
const MIN_LAT = 48.3;
const MAX_LAT = 49.0;

export default function ExplorerMap({
  userLocation,
  userLocationName,
  hikes,
  selectedHikeId,
  onSelectHike,
}: ExplorerMapProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Helper to convert lat/lon to percentage coordinates
  const getCoords = (lat: number, lon: number) => {
    // Bound coordinates
    const boundedLon = Math.max(MIN_LON, Math.min(MAX_LON, lon));
    const boundedLat = Math.max(MIN_LAT, Math.min(MAX_LAT, lat));

    const x = ((boundedLon - MIN_LON) / (MAX_LON - MIN_LON)) * 100;
    const y = 100 - ((boundedLat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 100;

    return { x: `${x}%`, y: `${y}%` };
  };

  const userCoords = getCoords(userLocation.latitude, userLocation.longitude);

  return (
    <View
      style={[
        styles.mapContainer,
        { backgroundColor: theme.greenBadge, borderColor: theme.border },
      ]}>
      {/* Background Grid Lines & Aesthetic Map Features */}
      <View style={styles.gridOverlay}>
        {/* Abstract topographic lines */}
        <View
          style={[
            styles.topoCircle,
            { borderColor: theme.border, width: 150, height: 150, top: '20%', left: '10%' },
          ]}
        />
        <View
          style={[
            styles.topoCircle,
            { borderColor: theme.border, width: 220, height: 220, top: '40%', right: '5%' },
          ]}
        />
        <View
          style={[
            styles.topoCircle,
            { borderColor: theme.border, width: 90, height: 90, bottom: '10%', left: '40%' },
          ]}
        />

        {/* Abstract Train Route Lines connecting Paris to destinations */}
        {/* Paris to Rambouillet (South West) */}
        <View
          style={[
            styles.trainTrackLine,
            {
              borderColor: theme.tabIconDefault,
              width: '45%',
              height: '35%',
              left: '12%',
              top: '25%',
              transform: [{ rotate: '-35deg' }],
              borderStyle: 'dashed',
            },
          ]}
        />

        {/* Paris to Melun & Fontainebleau (South East) */}
        <View
          style={[
            styles.trainTrackLine,
            {
              borderColor: theme.tabIconDefault,
              width: '35%',
              height: '55%',
              left: '52%',
              top: '25%',
              transform: [{ rotate: '45deg' }],
              borderStyle: 'dashed',
            },
          ]}
        />
      </View>

      {/* Grid Coordinates Indicators */}
      <Text style={[styles.gridLabel, { top: 8, left: 12, color: theme.textMuted }]}>
        LAT: 49.0° N
      </Text>
      <Text style={[styles.gridLabel, { bottom: 8, right: 12, color: theme.textMuted }]}>
        LON: 2.9° E
      </Text>

      {/* Render Hike Pins */}
      {hikes.map((rando) => {
        const isSelected = selectedHikeId === rando.id;
        const coords = getCoords(
          rando.startStationCoords.latitude,
          rando.startStationCoords.longitude
        );

        return (
          <View
            key={rando.id}
            style={[
              styles.pinWrapper,
              {
                left: coords.x,
                top: coords.y,
              },
            ]}>
            <Pressable
              onPress={() => onSelectHike(rando.id)}
              style={({ pressed }) => [
                styles.pinButton,
                {
                  backgroundColor: isSelected ? theme.tint : theme.card,
                  borderColor: isSelected ? '#FFFFFF' : theme.tint,
                  transform: [{ scale: isSelected ? 1.15 : pressed ? 0.95 : 1 }],
                },
              ]}>
              <Ionicons name="map" size={14} color={isSelected ? '#FFFFFF' : theme.tint} />
              <Text style={[styles.pinText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                {rando.title.split(' ')[0]}..
              </Text>
            </Pressable>
          </View>
        );
      })}

      {/* Render User GPS Location Pin */}
      <View
        style={[
          styles.pinWrapper,
          {
            left: userCoords.x,
            top: userCoords.y,
          },
        ]}>
        <View style={styles.userPulseWrapper}>
          <View style={[styles.userPulse, { backgroundColor: theme.secondary }]} />
          <View
            style={[styles.userDot, { backgroundColor: theme.secondary, borderColor: '#FFFFFF' }]}
          />
          <View
            style={[
              styles.userLabelContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Text style={[styles.userLabel, { color: theme.text }]} numberOfLines={1}>
              📍 {userLocationName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 250,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  gridLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.6,
  },
  topoCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
    borderStyle: 'dotted',
    opacity: 0.15,
  },
  trainTrackLine: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.25,
  },
  pinWrapper: {
    position: 'absolute',
    transform: [{ translateX: -30 }, { translateY: -15 }],
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pinText: {
    fontSize: 10,
    fontWeight: '800',
  },
  userPulseWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    position: 'absolute',
    zIndex: 2,
  },
  userPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: 'absolute',
    opacity: 0.3,
    zIndex: 1,
  },
  userLabelContainer: {
    position: 'absolute',
    top: 36,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
});
