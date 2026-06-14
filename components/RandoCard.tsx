import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface RandoCardProps {
  title?: string;
  imageUrl?: string;
  departureStation?: string;
  distance?: string;
  weatherTemp?: string;
  weatherIcon?: string;
  trainDuration?: string;
  trainType?: string;
  difficulty?: 'Facile' | 'Modéré' | 'Difficile';
  elevation?: string; // e.g. '+180m'
  onPress?: () => void;
  horizontal?: boolean;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop';

export default function RandoCard({
  title = 'Les Balcons de la Vallée de Chevreuse',
  imageUrl = DEFAULT_IMAGE,
  departureStation = 'Gare de Rambouillet',
  distance = '12 km',
  weatherTemp = '19°C',
  weatherIcon = '☀️',
  trainDuration = '35 min',
  trainType = 'TER',
  difficulty = 'Modéré',
  elevation = '+150m',
  onPress,
  horizontal = false,
}: RandoCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Map difficulty to a color
  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'Facile':
        return '#2E7D32';
      case 'Difficile':
        return '#C62828';
      case 'Modéré':
      default:
        return '#EF6C00';
    }
  };

  if (horizontal) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.horizontalPressable, pressed ? styles.cardPressed : null]}>
        <View
          style={[
            styles.horizontalCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
            },
          ]}>
          <Image source={{ uri: imageUrl }} style={styles.horizontalImage} />

          <View style={styles.horizontalContent}>
            {/* Header: Title and Rating */}
            <View style={styles.horizontalHeaderRow}>
              <Text style={[styles.horizontalTitle, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.horizontalRating}>
                <Ionicons name="star" size={10} color="#FFB300" />
                <Text style={[styles.horizontalRatingText, { color: theme.text }]}>
                  {difficulty === 'Facile' ? '4.8' : difficulty === 'Modéré' ? '4.5' : '4.2'}
                </Text>
              </View>
            </View>

            {/* Middle Row: Tag + Distance + Duration */}
            <View style={styles.horizontalMetaRow}>
              <View
                style={[styles.difficultyBadgeCompact, { backgroundColor: getDifficultyColor() }]}>
                <Text style={styles.difficultyTextCompact}>{difficulty}</Text>
              </View>
              <Text style={[styles.horizontalMetaText, { color: theme.textMuted }]}>
                {distance} • {trainDuration}
              </Text>
            </View>

            {/* Station */}
            <Text
              style={[styles.horizontalStationText, { color: theme.textMuted }]}
              numberOfLines={1}>
              🚆 {departureStation}
            </Text>

            {/* Action text */}
            <Text style={[styles.horizontalActionText, { color: theme.tint }]}>
              Détails de la rando →
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressableWrapper, pressed ? styles.cardPressed : null]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
          },
        ]}>
        {/* Top Image Section with Overlaid Badges */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

          {/* Soft dark overlay at the bottom of the image for contrast */}
          <View style={styles.imageOverlay} />

          {/* Top Badges (Weather & Train info) overlay */}
          <View style={styles.badgeRow}>
            {/* Weather Badge - Soft orange/sun style */}
            <View style={[styles.overlayBadge, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}>
              <Text style={styles.weatherText}>
                {weatherIcon} {weatherTemp}
              </Text>
            </View>

            {/* Train Duration Badge - Blue SNCF style */}
            <View style={[styles.overlayBadge, { backgroundColor: theme.secondary }]}>
              <Ionicons name="train" size={12} color="#FFFFFF" />
              <Text style={styles.trainText}>
                {trainDuration} ({trainType})
              </Text>
            </View>
          </View>

          {/* Difficulty & Elevation overlays at bottom of image */}
          <View style={styles.bottomBadgeRow}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() }]}>
              <Text style={styles.difficultyText}>{difficulty}</Text>
            </View>
            {elevation && (
              <View style={[styles.elevationBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
                <Text style={styles.elevationText}>📈 {elevation}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Card Info Content */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Departure Station Row */}
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.blueBadge }]}>
              <Ionicons name="train-outline" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
              {departureStation}
            </Text>
          </View>

          {/* Distance / Walking Row */}
          <View style={[styles.infoRow, { marginTop: 10 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.greenBadge }]}>
              <Ionicons name="walk" size={16} color={theme.tint} />
            </View>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              Distance à pied :{' '}
              <Text style={[styles.distanceText, { color: theme.text }]}>{distance}</Text>
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 550,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 10,
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      },
    }),
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    height: 190,
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageOverlay: {
    bottom: 0,
    height: 60,
    left: 0,
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.15)', // light dynamic shading
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  overlayBadge: {
    alignItems: 'center',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  weatherText: {
    fontFamily: 'Satoshi',
    color: '#1A251E',
    fontSize: 12,
    fontWeight: '700',
  },
  trainText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBadgeRow: {
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    position: 'absolute',
  },
  difficultyBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  elevationBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  elevationText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 12,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  infoText: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  distanceText: {
    fontFamily: 'Satoshi',
    fontWeight: '700',
  },
  horizontalPressable: {
    width: 320,
    marginRight: 12,
  },
  horizontalCard: {
    flexDirection: 'row',
    height: 105,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  horizontalImage: {
    width: 105,
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  horizontalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  horizontalTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  horizontalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  horizontalRatingText: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyBadgeCompact: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  difficultyTextCompact: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Satoshi',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  horizontalMetaText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '600',
  },
  horizontalStationText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '500',
  },
  horizontalActionText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
});
