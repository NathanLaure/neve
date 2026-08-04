import React, { useState, useRef, useCallback } from 'react';
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
  Image,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import { useAdventure } from '@/context/AdventureContext';
import ExplorerMap, { type ExplorerMapRef } from '@/components/ExplorerMap';
import GlobalSearchbar from '@/components/GlobalSearchbar';
import MapControls from '@/components/MapControls';
import HikesBottomSheet, { type HikesBottomSheetRef } from '@/components/HikesBottomSheet';
import FiltersBottomSheet, { type FiltersBottomSheetRef } from '@/components/FiltersBottomSheet';
import RadiusBottomSheet, { type RadiusBottomSheetRef } from '@/components/RadiusBottomSheet';
import FilterChipsBar from '@/components/FilterChipsBar';
import { MAP_CHIPS_BAR_GAP, MAP_CHIPS_BAR_HEIGHT } from '@/components/MapChipsBar';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';

export type MapStyleType = 'default' | 'satellite';

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
    filteredHikes,
    isLoadingHikes,
    searchQuery,
    selectedDifficulties,
    maxTrainDuration,
    maxDistance,
    maxElevation,
    dogsAllowed,
    kidsFriendly,
    selectedActivityTypes,
    selectedPointsOfInterest,
    clearAllFilters,
  } = useAdventure();

  const [selectedHikeId, setSelectedHikeId] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [showSimulator] = useState<boolean>(false);
  const bottomSheetRef = useRef<HikesBottomSheetRef>(null);
  const filtersSheetRef = useRef<FiltersBottomSheetRef>(null);
  const radiusSheetRef = useRef<RadiusBottomSheetRef>(null);
  const layerSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  const mapTypes = React.useMemo(() => {
    const defaultPreviewStyle =
      colorScheme === 'dark' ? 'nlaure/cmqeb16wa001u01qn7zxmgncl' : 'mapbox/outdoors-v12';

    return [
      {
        key: 'default' as MapStyleType,
        label: 'Par défaut',
        previewUri: `https://api.mapbox.com/styles/v1/${defaultPreviewStyle}/static/2.35,48.86,10,0/200x200@2x?access_token=`,
      },
      {
        key: 'satellite' as MapStyleType,
        label: 'Satellite',
        previewUri:
          'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/2.35,48.86,10,0/200x200@2x?access_token=',
      },
    ];
  }, [colorScheme]);

  useFocusEffect(
    useCallback(() => {
      // Reset selected hike so global map restores overview
      setSelectedHikeId(null);

      const hasActiveSearch =
        searchQuery !== '' ||
        selectedDifficulties.length > 0 ||
        maxTrainDuration !== null ||
        maxDistance !== null ||
        maxElevation !== null ||
        dogsAllowed ||
        kidsFriendly ||
        selectedActivityTypes.length > 0 ||
        selectedPointsOfInterest.length > 0;

      if (hasActiveSearch) {
        const task = InteractionManager.runAfterInteractions(() => {
          clearAllFilters();
        });
        return () => task.cancel();
      }
    }, [
      clearAllFilters,
      searchQuery,
      selectedDifficulties,
      maxTrainDuration,
      maxDistance,
      maxElevation,
      dogsAllowed,
      kidsFriendly,
      selectedActivityTypes,
      selectedPointsOfInterest,
    ])
  );

  const [mapStyle, setMapStyle] = useState<MapStyleType>('default');

  // Shared value, not state: the map emits a bearing on every camera frame and
  // re-rendering this screen that often made the compass needle visibly lag.
  const compassBearing = useSharedValue(0);

  const filteredRandos = filteredHikes;

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
          barStyle={colorScheme === 'dark' || sheetIndex !== 2 ? 'light-content' : 'dark-content'}
        />

        {/* Full-bleed background map */}
        <ExplorerMap
          ref={mapRef}
          userLocation={userLocation}
          userLocationName={userLocationName}
          hikes={filteredRandos}
          selectedHikeId={selectedHikeId}
          onSelectHike={handleSelectHike}
          onBearingChange={(bearing) => {
            compassBearing.value = bearing;
          }}
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
          searchQuery={searchQuery}
          isStatic={true}
          onPress={() => {
            router.push('/search');
          }}
          style={{ top: Math.max(insets.top, 16), zIndex: 30, elevation: 30 }}
        />

        {/* Floating Filters / Radius Chips, right below the searchbar */}
        <FilterChipsBar
          onPressFilters={() => filtersSheetRef.current?.present()}
          onPressRadius={() => radiusSheetRef.current?.present()}
          style={{
            top: Math.max(insets.top, 16) + 56 + MAP_CHIPS_BAR_GAP,
            zIndex: 30,
            elevation: 30,
          }}
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
          onPressLayers={() => layerSheetRef.current?.present()}
          onPressLocate={() => mapRef.current?.centerOnUser()}
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
          expandedTopOffset={MAP_CHIPS_BAR_HEIGHT + MAP_CHIPS_BAR_GAP}
        />

        {/* Map Layer Sheet Modal */}
        <BaseBottomSheetModal
          ref={layerSheetRef}
          snapPoints={['30%']}
          showHeader={true}
          title="Type de carte"
          showCloseButton={true}>
          <View style={styles.layerOptionsList}>
            {mapTypes.map((mapType) => {
              const isSelected = mapStyle === mapType.key;
              return (
                <Pressable
                  key={mapType.key}
                  onPress={() => {
                    setMapStyle(mapType.key);
                    layerSheetRef.current?.dismiss();
                  }}
                  style={styles.layerOptionItem}>
                  <View
                    style={[
                      styles.layerPreviewContainer,
                      isSelected && {
                        borderColor: theme.tint,
                        borderWidth: 2,
                      },
                      !isSelected && {
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}>
                    <Image
                      source={{ uri: mapType.previewUri + mapboxToken }}
                      style={styles.layerPreviewImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    style={[
                      styles.layerOptionLabel,
                      { color: isSelected ? theme.text : theme.textMuted },
                    ]}>
                    {mapType.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BaseBottomSheetModal>

        {/* Filters Bottom Sheet Modal */}
        <FiltersBottomSheet ref={filtersSheetRef} />

        {/* Search Radius Bottom Sheet Modal */}
        <RadiusBottomSheet ref={radiusSheetRef} />
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
    zIndex: 5,
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
  layerOptionsList: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
  },
  layerOptionItem: {
    alignItems: 'center',
    gap: 8,
  },
  layerPreviewContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  layerPreviewImage: {
    width: '100%',
    height: '100%',
  },
  layerOptionLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
});
