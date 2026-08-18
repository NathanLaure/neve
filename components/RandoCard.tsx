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
import * as Haptics from 'expo-haptics';
import { Star, Route, Heart, Train, Clock, TrendingUp, Download, CheckCircle2 } from 'lucide-react-native';
import Tag from '@/components/Tag';

import Colors from '@/constants/Colors';
import { isNavigoAccessible } from '@/services/transitService';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { useAdventure } from '@/context/AdventureContext';

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
  // Receives the card's own id: pass a stable, id-aware handler (e.g. straight
  // from context) so this prop's identity doesn't change every render — that's
  // what lets React.memo actually skip re-rendering unaffected cards in a list.
  onPress?: (id?: string) => void;
  /** compact only: long-press opens the caller's contextual actions sheet. */
  onLongPress?: (id?: string) => void;
  horizontal?: boolean;
  /** Compact list row (thumbnail map + meta line) — used by the Favorites screen. */
  compact?: boolean;
  /** compact only: ISO timestamp shown as "Ajouté le <date>". */
  savedAt?: string;
  location?: string;
  duration?: string;
  width?: number;
  gpxTrace?: { latitude: number; longitude: number }[];
  startStationCoords?: { latitude: number; longitude: number };
  /** Variant of the card: default vertical, horizontal, compact, adventure-upcoming, adventure-past */
  variant?: 'vertical' | 'horizontal' | 'compact' | 'adventure-upcoming' | 'adventure-past';
  /** Formatted date string for adventure cards */
  date?: string;
  /** Formatted time/hour for adventure cards */
  time?: string;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

function RandoCard({
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
  onLongPress,
  horizontal = false,
  compact = false,
  savedAt,
  location,
  duration,
  width: widthProp,
  gpxTrace,
  startStationCoords,
  variant,
  date,
  time,
}: RandoCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /* Le pass couvre tout le réseau francilien : la randonnée est concernée dès
     lors que sa gare de départ en fait partie. */
  const navigoAccessible = isNavigoAccessible(startStationCoords);
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;

  const { isFavorite: isFavoriteHike, toggleFavorite, isSavedOffline } = useAdventure();
  const isFavorite = !!id && isFavoriteHike(id);
  const isOffline = !!id && (isSavedOffline ? isSavedOffline(id) : false);
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
    const defaultLat = (gpxTrace && gpxTrace[0]?.latitude) || startStationCoords?.latitude || 44.0;
    const defaultLon = (gpxTrace && gpxTrace[0]?.longitude) || startStationCoords?.longitude || 6.0;

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

    const coordinates = sampled
      .map((p) => `[${Number(p.longitude.toFixed(4))},${Number(p.latitude.toFixed(4))}]`)
      .join(',');

    const geojson = `{"type":"Feature","properties":{"stroke":"#eb490b","stroke-width":3.5,"stroke-opacity":0.95},"geometry":{"type":"LineString","coordinates":[${coordinates}]}}`;

    // `auto` lets Mapbox fit the viewport to the overlay itself, so the whole trail is
    // always framed — the previous hand-tuned zoom thresholds cropped longer routes.
    return `https://api.mapbox.com/styles/v1/${styleId}/static/geojson(${encodeURIComponent(geojson)})/auto/120x120@2x?padding=10&access_token=${MAPBOX_TOKEN}`;
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    if (id) toggleFavorite(id);
  };

  if (variant === 'adventure-upcoming') {
    const displayLocation = getHikeLocation();
    const cleanedDeparture = departureStation
      ? departureStation
          .replace(/^Gare\s+(des|du|de\s+la|de\s+l'|d'|de)\s+/i, '')
          .replace(/^Paris\s+/i, '')
          .trim()
      : null;

    const parseEphemeride = (dateStr?: string) => {
      if (!dateStr) return null;
      const match = dateStr.match(/(\d+)\s+([a-zA-Zéûùà]+)/i);
      if (match) {
        return {
          day: match[1],
          month: match[2].slice(0, 4).toUpperCase(),
        };
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          day: d.getDate().toString(),
          month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
        };
      }
      return null;
    };

    const ephemeride = parseEphemeride(date);

    const upcomingItemStyle = [
      styles.adventureUpcomingPressable,
      {
        borderRadius: 20,
        overflow: 'hidden' as const,
        backgroundColor: theme.card,
        borderColor: theme.borderLight,
        shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
      },
    ];

    return (
      <Pressable
        onPress={() => onPress?.(id)}
        onLongPress={
          onLongPress
            ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onLongPress(id);
              }
            : undefined
        }
        delayLongPress={350}
        android_ripple={{
          color: theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={upcomingItemStyle}>
        <View style={styles.adventureUpcomingCard}>
          <View style={styles.adventureUpcomingImageWrapper}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.adventureUpcomingImage}
              resizeMode="cover"
            />
            {ephemeride ? (
              <View
                style={[
                  styles.ephemerideBadge,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.borderLight,
                  },
                ]}>
                <Text style={[styles.ephemerideMonth, { color: theme.tint }]}>
                  {ephemeride.month}
                </Text>
                <Text style={[styles.ephemerideDay, { color: theme.text }]}>
                  {ephemeride.day}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.adventureUpcomingContent}>
            <View style={styles.adventureUpcomingTextGroup}>
              <Text
                style={[styles.adventureUpcomingTitle, { color: theme.text }]}
                numberOfLines={2}
                ellipsizeMode="tail">
                {title}
              </Text>
              <Text
                style={[styles.adventureUpcomingLocation, { color: theme.textMuted }]}
                numberOfLines={1}>
                {displayLocation}
              </Text>
            </View>
            {cleanedDeparture ? (
              <View style={styles.adventureUpcomingDepartureRow}>
                <Text style={[styles.adventureUpcomingDepartureText, { color: theme.textMuted }]}>
                  Départ de{' '}
                  <Text style={[styles.adventureUpcomingDepartureBold, { color: theme.text }]}>
                    {cleanedDeparture}
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'adventure-past') {
    const gainMatch = elevation?.match(/\+(\d+)/);
    const gainText = gainMatch ? `${gainMatch[1]} m` : elevation || null;
    const displayTime = time || duration || trainDuration || null;
    const displayDistance = distance || null;
    const displayLocation = getHikeLocation();
    const displayDate = date || 'Date passée';

    const pastItemStyle = [
      styles.adventurePastPressable,
      {
        borderRadius: 20,
        overflow: 'hidden' as const,
        backgroundColor: theme.card,
        borderColor: theme.borderLight,
        shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
      },
    ];

    return (
      <Pressable
        onPress={() => onPress?.(id)}
        onLongPress={
          onLongPress
            ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onLongPress(id);
              }
            : undefined
        }
        delayLongPress={350}
        android_ripple={{
          color: theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={pastItemStyle}>
        <View style={styles.adventurePastCard}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.adventurePastImage, { borderColor: theme.borderLight }]}
            resizeMode="cover"
          />
          <View style={styles.adventurePastContent}>
            <Text
              style={[styles.adventurePastTitle, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {title}
            </Text>

            <View style={styles.adventurePastMetricsRow}>
              {displayTime ? (
                <View style={styles.adventurePastMetricItem}>
                  <Clock size={12} color={theme.textMuted} />
                  <Text style={[styles.adventurePastMetricBold, { color: theme.textMuted }]}>
                    {displayTime}
                  </Text>
                </View>
              ) : null}

              {displayTime && displayDistance ? (
                <Text style={[styles.adventurePastSeparator, { color: theme.textMuted }]}>·</Text>
              ) : null}

              {displayDistance ? (
                <View style={styles.adventurePastMetricItem}>
                  <Route size={12} color={theme.textMuted} />
                  <Text style={[styles.adventurePastMetricBold, { color: theme.textMuted }]}>
                    {displayDistance}
                  </Text>
                </View>
              ) : null}

              {(displayTime || displayDistance) && gainText ? (
                <Text style={[styles.adventurePastSeparator, { color: theme.textMuted }]}>·</Text>
              ) : null}

              {gainText ? (
                <View style={styles.adventurePastMetricItem}>
                  <TrendingUp size={12} color={theme.textMuted} />
                  <Text style={[styles.adventurePastMetricBold, { color: theme.textMuted }]}>
                    {gainText}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.adventurePastSubRow}>
              <Text style={[styles.adventurePastSubText, { color: theme.textMuted }]}>
                {displayDate}
              </Text>
              <Text style={[styles.adventurePastSubText, { color: theme.textMuted }]}>·</Text>
              <Text
                style={[styles.adventurePastSubText, { color: theme.textMuted, flexShrink: 1 }]}
                numberOfLines={1}>
                {displayLocation}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (compact || variant === 'compact') {
    const difficultyStatut = difficulty === 'Facile' ? 'Success' : difficulty === 'Difficile' ? 'Error' : 'Warning';
    const gainMatch = elevation?.match(/\+(\d+)/);
    const gainText = gainMatch ? `${gainMatch[1]} m` : null;
    const savedAtText = savedAt
      ? new Date(savedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    const compactItemStyle = [
      styles.compactPressable,
      {
        borderRadius: 16,
        overflow: 'hidden' as const,
      },
    ];

    return (
      <Pressable
        onPress={() => onPress?.(id)}
        onLongPress={
          onLongPress
            ? () => {
                // Haptics are unavailable on some devices/emulators — never let a
                // missing vibration motor swallow the action itself.
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onLongPress(id);
              }
            : undefined
        }
        delayLongPress={350}
        android_ripple={{
          color: theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={compactItemStyle}>
        {/* flexDirection lives on this inner View, not on the Pressable: the same
            pattern the horizontal variant uses — driving it from the Pressable's
            style callback ends up laying the row out as a column. */}
        <View style={styles.compactRow}>
          <View style={styles.compactThumbnailWrapper}>
            <Image source={{ uri: getMapThumbnailUrl() }} style={styles.compactThumbnail} />
            <Tag
              text={difficulty === 'Modéré' ? 'Moyen' : difficulty}
              statut={difficultyStatut}
              style={styles.compactTagOverlay}
            />
          </View>

          <View style={styles.compactContent}>
            <View style={styles.compactHeaderRow}>
              <Text style={[styles.compactTitle, { color: theme.text }]} numberOfLines={2}>
                {title}
              </Text>
              {isOffline && (
                <View style={styles.compactOfflineBadge}>
                  <Download size={16} color={theme.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.compactMetaRow}>
              {duration ? (
                <>
                  <Clock size={15} color={theme.textMuted} />
                  <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>{duration}</Text>
                  <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>·</Text>
                </>
              ) : null}
              <Route size={15} color={theme.textMuted} />
              <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>{distance}</Text>
              {gainText ? (
                <>
                  <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>·</Text>
                  <TrendingUp size={15} color={theme.textMuted} />
                  <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>{gainText}</Text>
                </>
              ) : null}
            </View>
            <Text style={[styles.compactSubtext, { color: theme.textMuted }]}>{savedAtText ? `${savedAtText} · ` : ''}{getHikeLocation()}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (horizontal) {
    const cardWidth =
      widthProp !== undefined ? widthProp : screenWidth > 0 ? screenWidth - 48 : 320;

    const horizontalItemStyle = [
      styles.horizontalPressable,
      {
        width: cardWidth,
        borderRadius: 20,
        overflow: 'hidden' as const,
      },
    ];

    return (
      <Pressable
        onPress={() => onPress?.(id)}
        android_ripple={{
          color: theme.ripple,
          borderless: false,
          foreground: true,
        }}
        style={horizontalItemStyle}>
        <View
          style={[
            styles.horizontalCard,
            {
              width: cardWidth,
              borderColor: theme.card,
              borderWidth: 4,
              backgroundColor: theme.card,
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
  const verticalItemStyle = [
    styles.pressableWrapper,
    {
      borderRadius: 16,
      overflow: 'hidden' as const,
    },
  ];

  return (
    <Pressable
      onPress={() => onPress?.(id)}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={verticalItemStyle}>
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

          {/* Pass Navigo — posé en bas à gauche de l'image, à la hauteur de la
              vignette de carte qui lui fait face (Figma 148:1851). */}
          {navigoAccessible && (
            <Tag
              text="Pass Navigo"
              statut="Success"
              icon={<CheckCircle2 size={14} color={theme.statusTextSuccess} />}
              style={styles.navigoOverlay}
            />
          )}

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
  navigoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
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
  // padding + equal negative margin: the pressed highlight bleeds past the row on
  // all sides without shifting the layout (net offset is zero).
  compactPressable: {
    borderRadius: 16,
    padding: 10,
    margin: -10,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  compactThumbnailWrapper: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  compactThumbnail: {
    width: '100%',
    height: '100%',
  },
  compactTagOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
  compactOfflineBadge: {
    paddingTop: 3,
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  compactMetaText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    fontWeight: '500',
  },
  compactSubtext: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    fontWeight: '500',
  },
  miniMapImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingBottom: 16,
    paddingTop: 20,
    paddingHorizontal: 12,
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
    width: 100,
    height: 120,
  },
  horizontalImage: {
    width: 100,
    // Pas de hauteur fixe : la carte fait 120 bordures comprises (border-box), donc
    // son intérieur n'en fait que 112. Une image de 120 débordait de 8 px, rognés
    // par l'`overflow: 'hidden'` — l'arrondi bas-droit était tranché avant la fin
    // de sa courbe et paraissait presque carré, quand le bas-gauche était sauvé
    // par le rayon intérieur de la carte (20 − 4 = 16).
    alignSelf: 'stretch',
    borderRadius: 16,
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
  adventureUpcomingPressable: {
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  adventureUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 126,
    padding: 4,
    paddingRight: 12,
    gap: 14,
  },
  adventureUpcomingImageWrapper: {
    position: 'relative',
    aspectRatio: 1,
    minWidth: 118,
    minHeight: 118,
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
  },
  adventureUpcomingImage: {
    width: '100%',
    height: '100%',
  },
  ephemerideBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 38,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ephemerideMonth: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ephemerideDay: {
    fontFamily: 'BricolageGrotesque',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 18,
  },
  adventureUpcomingContent: {
    flex: 1,
    paddingVertical: 12,
    gap: 6,
    justifyContent: 'space-between',
  },
  adventureUpcomingTextGroup: {
    gap: 4,
  },
  adventureUpcomingTitle: {
    fontFamily: 'BricolageGrotesque',
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  adventureUpcomingLocation: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  adventureUpcomingDepartureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adventureUpcomingDepartureText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  adventureUpcomingDepartureBold: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  adventurePastPressable: {
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  adventurePastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingVertical: 4,
    paddingLeft: 4,
    gap: 10,
  },
  adventurePastImage: {
    width: 86,
    height: 86,
    borderRadius: 18,
    borderWidth: 1,
  },
  adventurePastContent: {
    flex: 1,
    paddingVertical: 6,
    gap: 5,
    justifyContent: 'center',
  },
  adventurePastTitle: {
    fontFamily: 'BricolageGrotesque',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 18,
  },
  adventurePastMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adventurePastMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  adventurePastMetricBold: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  adventurePastSeparator: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  adventurePastSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adventurePastSubText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 13,
  },
});

export default React.memo(RandoCard);
