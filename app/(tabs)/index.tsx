import React, { useState, useRef, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import { useAdventure } from '@/context/AdventureContext';
import ExplorerMap, { type ExplorerMapRef } from '@/components/ExplorerMap';
import GlobalSearchbar from '@/components/GlobalSearchbar';
import MapLayerSheet, { type MapStyleType } from '@/components/MapLayerSheet';
import MapControls from '@/components/MapControls';
import HikesBottomSheet, { type HikesBottomSheetRef } from '@/components/HikesBottomSheet';

// Simulated stations for manual toggling
const SIMULATED_LOCATIONS = [
  { name: 'Montparnasse', latitude: 48.8412, longitude: 2.3201 },
  { name: 'Gare de Lyon', latitude: 48.8443, longitude: 2.3744 },
  { name: "Gare de l'Est", latitude: 48.8762, longitude: 2.3584 },
];

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export default function ExplorerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<ExplorerMapRef>(null);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;
  const cardWidth = screenWidth > 0 ? screenWidth - 48 : 320;

  const {
    userLocation,
    userLocationName,
    isLocating,
    refreshUserLocation,
    setUserLocationManually,
    getTransitInfo,
    hikes,
    isLoadingHikes,
    filteredHikes,
    searchQuery,
    selectedDifficulties,
    maxTrainDuration,
    maxDistance,
    maxElevation,
  } = useAdventure();

  const [selectedHikeId, setSelectedHikeId] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [showSimulator] = useState<boolean>(false);
  const bottomSheetRef = useRef<HikesBottomSheetRef>(null);
  const [showLayerSheet, setShowLayerSheet] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('default');
  const [compassBearing, setCompassBearing] = useState(0);

  const filteredRandos = filteredHikes;

  const getSearchSummaryText = () => {
    if (searchQuery) return searchQuery;

    const summaryParts: string[] = [];
    if (selectedDifficulties.length > 0) {
      summaryParts.push(selectedDifficulties.join(', '));
    }
    if (maxTrainDuration !== null) {
      summaryParts.push(`< ${maxTrainDuration} min`);
    }
    if (maxDistance !== null) {
      summaryParts.push(`< ${maxDistance} km`);
    }
    if (maxElevation !== null) {
      summaryParts.push(`< ${maxElevation} m+`);
    }

    if (summaryParts.length > 0) {
      return summaryParts.join(' · ');
    }
    return '';
  };

  const handleSelectHike = (id: string) => {
    setSelectedHikeId(id);
    const rando = hikes.find((r) => r.id === id);
    if (rando) {
      router.push(`/rando/${id}`);
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={
            colorScheme === 'dark' || sheetIndex !== 2
              ? 'light-content'
              : 'dark-content'
          }
        />

        {/* Full-bleed background map */}
        <ExplorerMap
          ref={mapRef}
          userLocation={userLocation}
          userLocationName={userLocationName}
          hikes={filteredRandos}
          selectedHikeId={selectedHikeId}
          onSelectHike={handleSelectHike}
          onBearingChange={setCompassBearing}
          mapStyle={mapStyle}
          style={styles.mapContainerFullScreen}
        />

        {/* Subtle dark gradient overlay at the bottom of the map */}
        {filteredRandos.length > 0 && (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)']}
            style={styles.mapBottomOverlay}
            pointerEvents="none"
          />
        )}

        {/* Floating Pill Search Bar */}
        <GlobalSearchbar
          searchQuery={getSearchSummaryText()}
          onPress={() => {
            router.push('/search');
          }}
          style={{ top: Math.max(insets.top, 16), zIndex: 30, elevation: 30 }}
        />

        {/* Floating Location Simulator Bar */}
        {showSimulator && (
          <View
            style={[
              styles.floatingLocationBar,
              {
                top: Math.max(insets.top, 16) + 68,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Text style={[styles.locationBarLabel, { color: theme.textMuted }]}>
              📍 Position :{' '}
              <Text style={{ color: theme.text, fontWeight: '800' }}>
                {userLocationName.replace('Paris ', '')}
              </Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}>
              <Pressable
                onPress={refreshUserLocation}
                style={[styles.simButton, { backgroundColor: theme.greenBadge }]}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : (
                  <Text style={[styles.simButtonText, { color: theme.tint }]}>⚡ GPS</Text>
                )}
              </Pressable>
              {SIMULATED_LOCATIONS.map((loc) => {
                const isActive = userLocationName.includes(loc.name);
                return (
                  <Pressable
                    key={loc.name}
                    onPress={() =>
                      setUserLocationManually(
                        { latitude: loc.latitude, longitude: loc.longitude },
                        `Paris ${loc.name}`
                      )
                    }
                    style={[
                      styles.simButton,
                      {
                        backgroundColor: isActive ? theme.secondary : theme.blueBadge,
                        borderColor: isActive ? theme.secondary : 'transparent',
                        borderWidth: 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.simButtonText,
                        { color: isActive ? '#FFFFFF' : theme.secondary },
                      ]}>
                      {loc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Floating Map Controls */}
        <MapControls
          compassBearing={compassBearing}
          onPressCompass={() => mapRef.current?.resetNorth()}
          onPressLayers={() => setShowLayerSheet(!showLayerSheet)}
          onPressLocate={refreshUserLocation}
          isLocating={isLocating}
          style={{
            bottom: filteredRandos.length > 0 ? 240 : 96,
          }}
        />

        {/* Horizontal Hikes Carousel "A proximité" */}
        {filteredRandos.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              data={filteredRandos}
              horizontal
              keyExtractor={(item) => `carousel-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
              snapToInterval={cardWidth + 12}
              decelerationRate="fast"
              snapToAlignment="start"
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => {
                const transitInfo = getTransitInfo(item);
                return (
                  <RandoCard
                    id={item.id}
                    horizontal
                    title={item.title}
                    imageUrl={item.imageUrl}
                    departureStation={item.startStation}
                    distance={item.distance}
                    weatherTemp={item.weatherTemp}
                    weatherIcon={item.weatherIcon}
                    trainDuration={transitInfo.durationText}
                    trainType={item.trainType}
                    difficulty={item.difficulty}
                    elevation={item.elevation}
                    onPress={() => handleSelectHike(item.id)}
                    location={item.location}
                    duration={formatHikeDuration(item.durationHours)}
                    width={cardWidth}
                  />
                );
              }}
            />
          </View>
        )}

        {/* Bottom Sheet Slider */}
        <HikesBottomSheet
          ref={bottomSheetRef}
          hikes={filteredRandos}
          isLoadingHikes={isLoadingHikes}
          getTransitInfo={getTransitInfo}
          onSelectHike={handleSelectHike}
          onChange={setSheetIndex}
        />

        {/* Map Layer Sheet */}
        {showLayerSheet && (
          <MapLayerSheet
            selectedStyle={mapStyle}
            onSelectStyle={(style) => {
              setMapStyle(style);
            }}
            onClose={() => setShowLayerSheet(false)}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mapContainerFullScreen: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },

  floatingLocationBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    zIndex: 9,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  locationBarLabel: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  simButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simButtonText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    zIndex: 8,
  },
  carouselScroll: {
    paddingHorizontal: 24,
  },
  mapBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
  },
});
