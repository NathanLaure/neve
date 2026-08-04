import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Star, Route, Heart, Train } from 'lucide-react-native';
import Tag from '@/components/Tag';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';

export interface RandoCardProps {
  id?: string;
  title?: string;
  imageUrl?: string;
  galleryUrls?: string[];
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
  location?: string;
  duration?: string;
  width?: number;
  gpxTrace?: { latitude: number; longitude: number }[];
  startStationCoords?: { latitude: number; longitude: number };
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export default function RandoCard({
  id,
  title = 'Les Balcons de la Vallée de Chevreuse',
  imageUrl = DEFAULT_IMAGE,
  galleryUrls,
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
  location,
  duration,
  width: widthProp,
  gpxTrace,
  startStationCoords,
}: RandoCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cardImageWidth, setCardImageWidth] = useState(0);

  const gallery = useMemo(() => {
    if (galleryUrls && galleryUrls.length > 0) return galleryUrls;
    return [imageUrl];
  }, [galleryUrls, imageUrl]);

  const handleImageContainerLayout = (e: any) => {
    setCardImageWidth(e.nativeEvent.layout.width);
  };

  const handleGalleryScroll = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const width = e.nativeEvent.layoutMeasurement.width || 1;
    const index = Math.round(contentOffsetX / width);
    setActiveImageIndex(index);
  };

  // Helper to determine the hike location (town/village, region, country)
  const getHikeLocation = () => {
    if (location && location.trim().length > 0) {
      return location;
    }

    // Fallback based on ID
    if (id === '1') return 'Rambouillet, Yvelines, France';
    if (id === '2') return 'Fontainebleau, Seine-et-Marne, France';
    if (id === '3') return 'Barbizon, Seine-et-Marne, France';
    if (id === '4') return 'Rambouillet, Yvelines, France';

    // Fallback based on Title or Departure Station substrings
    const searchStr = `${title} ${departureStation}`.toLowerCase();
    if (
      searchStr.includes('rambouillet') ||
      searchStr.includes('chevreuse') ||
      searchStr.includes('hollande')
    ) {
      return 'Rambouillet, Yvelines, France';
    }
    if (searchStr.includes('fontainebleau')) {
      return 'Fontainebleau, Seine-et-Marne, France';
    }
    if (searchStr.includes('barbizon') || searchStr.includes('melun')) {
      return 'Barbizon, Seine-et-Marne, France';
    }

    // Fallback: clean the station name
    if (departureStation) {
      return departureStation.replace(/^Gare de\s+/i, '');
    }

    return 'Paris, Île-de-France, France';
  };

  const getHikeRating = () => {
    if (id === '1') return '4,8';
    if (id === '2') return '4,6';
    if (id === '3') return '4,9';
    if (id === '4') return '4,7';
    return difficulty === 'Facile' ? '4,8' : difficulty === 'Modéré' ? '4,6' : '4,3';
  };

  const getMapThumbnailUrl = () => {
    const defaultLat = startStationCoords?.latitude || (gpxTrace && gpxTrace[0]?.latitude) || 44.0;
    const defaultLon = startStationCoords?.longitude || (gpxTrace && gpxTrace[0]?.longitude) || 6.0;

    if (!MAPBOX_TOKEN) {
      return 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=200&auto=format&fit=crop';
    }

    const styleId = colorScheme === 'dark' ? 'mapbox/dark-v11' : 'mapbox/outdoors-v12';

    if (!gpxTrace || gpxTrace.length < 2) {
      return `https://api.mapbox.com/styles/v1/${styleId}/static/pin-s-pitch+eb490b(${defaultLon.toFixed(4)},${defaultLat.toFixed(4)})/${defaultLon.toFixed(4)},${defaultLat.toFixed(4)},11,0/120x120@2x?access_token=${MAPBOX_TOKEN}`;
    }

    // Downsample gpxTrace to max 30 points to ensure URL stays under Mapbox limit (< 2000 chars)
    const maxPoints = 30;
    const step = Math.max(1, Math.floor(gpxTrace.length / maxPoints));
    const sampled = gpxTrace.filter((_, idx) => idx % step === 0 || idx === gpxTrace.length - 1);

    const lats = sampled.map((p) => p.latitude);
    const lons = sampled.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const centerLat = Number(((minLat + maxLat) / 2).toFixed(4));
    const centerLon = Number(((minLon + maxLon) / 2).toFixed(4));

    const coordinates = sampled
      .map((p) => `[${Number(p.longitude.toFixed(4))},${Number(p.latitude.toFixed(4))}]`)
      .join(',');

    const geojson = `{"type":"Feature","properties":{"stroke":"#eb490b","stroke-width":3.5,"stroke-opacity":0.95},"geometry":{"type":"LineString","coordinates":[${coordinates}]}}`;

    const latDiff = maxLat - minLat;
    const lonDiff = maxLon - minLon;
    const maxDiff = Math.max(latDiff, lonDiff);
    let zoom = 11.5;
    if (maxDiff > 0.15) zoom = 9.5;
    else if (maxDiff > 0.08) zoom = 10.5;
    else if (maxDiff > 0.04) zoom = 11.2;
    else if (maxDiff > 0.02) zoom = 11.8;
    else zoom = 12.2;

    return `https://api.mapbox.com/styles/v1/${styleId}/static/geojson(${encodeURIComponent(geojson)})/${centerLon},${centerLat},${zoom},0/120x120@2x?access_token=${MAPBOX_TOKEN}`;
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  if (horizontal) {
    const cardWidth =
      widthProp !== undefined ? widthProp : screenWidth > 0 ? screenWidth - 48 : 320;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.horizontalPressable,
          { width: cardWidth },
          pressed ? styles.cardPressed : null,
        ]}>
        <View
          style={[
            styles.horizontalCard,
            {
              width: cardWidth,
              backgroundColor: theme.background,
              shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
            },
          ]}>
          <Image source={{ uri: imageUrl }} style={styles.horizontalImage} />

          <View style={styles.horizontalContent}>
            {/* Top Section: Header (Title & Rating) + Location */}
            <View style={styles.horizontalTopContainer}>
              <View style={styles.horizontalHeaderRow}>
                <Text
                  style={[styles.horizontalTitle, { color: theme.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {title}
                </Text>
                <View style={styles.horizontalRating}>
                  <Star size={14} color={theme.text} fill={theme.text} />
                  <Text style={[styles.horizontalRatingText, { color: theme.text }]}>
                    {difficulty === 'Facile' ? '4.8' : difficulty === 'Modéré' ? '4.5' : '4.2'}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.horizontalStationText, { color: theme.textMuted }]}
                numberOfLines={1}>
                {getHikeLocation()}
              </Text>
            </View>

            {/* Bottom Row: Tag + Distance + Duration */}
            <View style={styles.horizontalMetaRow}>
              <Tag
                text={difficulty === 'Modéré' ? 'Moyen' : difficulty}
                statut={
                  difficulty === 'Facile'
                    ? 'Success'
                    : difficulty === 'Difficile'
                      ? 'Error'
                      : 'Warning'
                }
              />
              <View style={styles.horizontalDistanceContainer}>
                <Route size={14} color={theme.textMuted} />
                <Text style={[styles.horizontalMetaText, { color: theme.textMuted }]}>
                  {distance}
                </Text>
              </View>
              <Text style={[styles.horizontalSeparator, { color: theme.textMuted }]}>·</Text>
              <Text style={[styles.horizontalMetaText, { color: theme.textMuted }]}>
                {duration || trainDuration}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // Vertical card design from Figma Node ID 49:3492
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressableWrapper, pressed ? styles.cardPressed : null]}>
      <View style={styles.verticalCard}>
        {/* Image Section */}
        <View style={styles.imageContainer} onLayout={handleImageContainerLayout}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={gallery.length > 1}
            onScroll={handleGalleryScroll}
            scrollEventThrottle={16}>
            {gallery.map((imgUrl, idx) => (
              <Image
                key={`gallery-img-${idx}`}
                source={{ uri: imgUrl }}
                style={[styles.image, { width: cardImageWidth || undefined }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {gallery.length > 1 && (
            <View style={styles.sliderIndicator} pointerEvents="none">
              {gallery.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    styles.dotInactive,
                    { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
                    idx === activeImageIndex ? styles.dotActive : null,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Heart/Favorite Button */}
          <IconButton
            variant="plain"
            icon={
              <Heart
                size={20}
                color={isFavorite ? '#EF4444' : '#FFFFFF'}
                fill={isFavorite ? '#EF4444' : 'transparent'}
              />
            }
            onPress={handleFavoritePress}
            style={styles.favoriteButton}
          />

          {/* Mini Map Preview Overlay */}
          <View
            style={[
              styles.miniMapContainer,
              {
                borderColor: theme.borderLight,
                backgroundColor: theme.card,
              },
            ]}>
            <Image
              source={{ uri: getMapThumbnailUrl() }}
              style={styles.miniMapImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Row 1: Title Column */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                {getHikeLocation()}
              </Text>
            </View>
          </View>

          {/* Row 2: Metrics Column (Difficulty, Rating, Distance, Duration) + Train Time */}
          <View style={styles.metricsRow}>
            <View style={styles.metricsLeft}>
              {/* Difficulty Tag */}
              <Tag
                text={difficulty}
                statut={
                  difficulty === 'Facile'
                    ? 'Success'
                    : difficulty === 'Difficile'
                      ? 'Error'
                      : 'Warning'
                }
              />

              <Text style={[styles.separator, { color: theme.textMuted }]}>·</Text>

              {/* Rating */}
              <View style={styles.metricGroup}>
                <Star size={14} color={theme.textMuted} fill={theme.textMuted} />
                <Text style={[styles.metricText, { color: theme.textMuted }]}>
                  {getHikeRating()}
                </Text>
              </View>

              <Text style={[styles.separator, { color: theme.textMuted }]}>·</Text>

              {/* Distance */}
              <View style={styles.metricGroup}>
                <Route size={12} color={theme.textMuted} />
                <Text style={[styles.metricText, { color: theme.textMuted }]}>{distance}</Text>
              </View>

              <Text style={[styles.separator, { color: theme.textMuted }]}>·</Text>

              {/* Duration */}
              <Text style={[styles.metricText, { color: theme.textMuted }]}>
                Env.{' '}
                {duration ||
                  (difficulty === 'Facile' ? '3 h' : difficulty === 'Modéré' ? '4 h' : '5 h')}
              </Text>
            </View>

            {/* Train Duration */}
            <View style={styles.trainGroup}>
              <Train size={14} color={theme.textMuted} />
              <Text style={[styles.metricText, { color: theme.textMuted }]}>{trainDuration}</Text>
            </View>
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
  verticalCard: {
    width: '100%',
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    height: 230,
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
    borderRadius: 8,
  },
  sliderIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    width: 7,
    height: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 2,
  },
  dotInactive: {
    borderRadius: 100,
    width: 7,
    height: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 2,
  },
  dotInactiveSmall: {
    borderRadius: 100,
    width: 4,
    height: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 2,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
  },
  miniMapContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  miniMapImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingBottom: 8,
    paddingTop: 20,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  locationText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 16,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  metricsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 15,
  },
  separator: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 15,
    marginHorizontal: 4,
  },
  trainGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  horizontalPressable: {
    width: 320,
  },
  horizontalCard: {
    flexDirection: 'row',
    width: '100%',
    height: 120,
    borderWidth: 0,
    borderRadius: 20,
    overflow: 'hidden',
    gap: 12,
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
  horizontalImageContainer: {
    position: 'relative',
    width: 88,
    height: 120,
  },
  horizontalImage: {
    width: 88,
    height: 120,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  horizontalMiniMapContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  horizontalContent: {
    flex: 1,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  horizontalTopContainer: {
    width: '100%',
    gap: 4,
  },
  horizontalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  horizontalTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  horizontalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  horizontalRatingText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    fontWeight: '900',
  },
  horizontalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadgeCompact: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  difficultyTextCompact: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    fontWeight: '700',
  },
  horizontalDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  horizontalMetaText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalSeparator: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 26,
    fontWeight: '700',
  },
  horizontalStationText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  horizontalActionText: {
    fontFamily: 'Satoshi-medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
