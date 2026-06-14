import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Search } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import { useAdventure } from '@/context/AdventureContext';
import ExplorerMap, { type ExplorerMapRef } from '@/components/ExplorerMap';
import GlobalSearchbar from '@/components/GlobalSearchbar';
import MapLayerSheet, { type MapStyleType } from '@/components/MapLayerSheet';
import MapControls from '@/components/MapControls';

// Simulated stations for manual toggling
const SIMULATED_LOCATIONS = [
  { name: 'Montparnasse', latitude: 48.8412, longitude: 2.3201 },
  { name: 'Gare de Lyon', latitude: 48.8443, longitude: 2.3744 },
  { name: "Gare de l'Est", latitude: 48.8762, longitude: 2.3584 },
];

export default function ExplorerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<ExplorerMapRef>(null);
  const isFocused = pathname === '/';
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isFocused) {
      fadeAnim.setValue(0.3);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isFocused, fadeAnim]);

  const {
    userLocation,
    userLocationName,
    isLocating,
    refreshUserLocation,
    setUserLocationManually,
    getTransitInfo,
    hikes,
    isLoadingHikes,
  } = useAdventure();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Toutes');
  const [selectedTransitLimit, setSelectedTransitLimit] = useState<string>('Toutes'); // 'Toutes', '30', '45', '60'
  const [selectedHikeId, setSelectedHikeId] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [showLayerSheet, setShowLayerSheet] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('default');
  const [compassBearing, setCompassBearing] = useState(0);

  // Filter hikes based on search query, selected difficulty, and calculated transit limit
  const filteredRandos = useMemo(() => {
    return hikes.filter((rando) => {
      // 1. Search Query
      const matchesSearch =
        rando.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rando.startStation?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Difficulty Filter
      const matchesDifficulty =
        selectedDifficulty === 'Toutes' || rando.difficulty === selectedDifficulty;

      // 3. Transit Distance/Duration Filter
      const transitInfo = getTransitInfo(rando);
      let matchesTransit = true;
      if (selectedTransitLimit !== 'Toutes') {
        const limitMin = parseInt(selectedTransitLimit, 10);
        matchesTransit = transitInfo.durationMinutes <= limitMin;
      }

      return matchesSearch && matchesDifficulty && matchesTransit;
    });
  }, [searchQuery, selectedDifficulty, selectedTransitLimit, getTransitInfo, hikes]);

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
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

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

        {/* Floating Pill Search Bar */}
        {!isSheetExpanded && (
          <GlobalSearchbar
            searchQuery={searchQuery}
            selectedDifficulty={selectedDifficulty}
            selectedTransitLimit={selectedTransitLimit}
            onPress={() => setIsSheetExpanded(true)}
            style={{ top: Math.max(insets.top, 16) }}
          />
        )}

        {/* Floating Location Simulator Bar */}
        {!isSheetExpanded && showSimulator && (
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
        {!isSheetExpanded && (
          <MapControls
            compassBearing={compassBearing}
            onPressCompass={() => mapRef.current?.resetNorth()}
            onPressLayers={() => setShowLayerSheet(!showLayerSheet)}
            onPressLocate={refreshUserLocation}
            isLocating={isLocating}
            style={{
              bottom: filteredRandos.length > 0 ? 220 : 96,
            }}
          />
        )}

        {/* Horizontal Hikes Carousel "A proximité" */}
        {!isSheetExpanded && filteredRandos.length > 0 && (
          <View style={styles.carouselContainer}>
            <Text style={styles.carouselHeading}>A proximité</Text>
            <FlatList
              data={filteredRandos}
              horizontal
              keyExtractor={(item) => `carousel-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
              renderItem={({ item }) => {
                const transitInfo = getTransitInfo(item);
                return (
                  <RandoCard
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
                  />
                );
              }}
            />
          </View>
        )}

        {/* Bottom Sheet Slider */}
        <View
          style={[
            isSheetExpanded ? styles.bottomSheetExpanded : styles.bottomSheetCollapsed,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}>
          {!isSheetExpanded ? (
            /* Collapsed Handle View */
            <Pressable onPress={() => setIsSheetExpanded(true)} style={styles.sheetHandleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
              <View style={styles.sheetHeaderRow}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  {filteredRandos.length} randonnée{filteredRandos.length > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-up" size={18} color={theme.textMuted} />
              </View>
            </Pressable>
          ) : (
            /* Expanded Full Search List View */
            <View style={{ flex: 1, paddingTop: Math.max(insets.top, 12) }}>
              {/* Header with collapse button */}
              <View style={styles.expandedHeaderRow}>
                <Text style={[styles.expandedTitle, { color: theme.text }]}>
                  {filteredRandos.length} randonnée{filteredRandos.length > 1 ? 's' : ''} disponible
                  {filteredRandos.length > 1 ? 's' : ''}
                </Text>
                <Pressable
                  onPress={() => setIsSheetExpanded(false)}
                  style={[
                    styles.closeButton,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <Ionicons name="chevron-down" size={20} color={theme.text} />
                </Pressable>
              </View>

              {/* Search bar & filters (visible inside sheet for clean context) */}
              <View style={styles.sheetControls}>
                {/* Search Bar */}
                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <Search size={16} color={theme.textMuted} />
                  <TextInput
                    placeholder="Rechercher une rando, une gare..."
                    placeholderTextColor={theme.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={[styles.searchInput, { color: theme.text }]}
                    clearButtonMode="always"
                  />
                </View>

                {/* Quick Filters Scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersScroll}>
                  {/* Difficulty filter group */}
                  <View style={styles.filterGroup}>
                    <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>
                      Difficulté :
                    </Text>
                    {['Toutes', 'Facile', 'Modéré', 'Difficile'].map((diff) => {
                      const isSelected = selectedDifficulty === diff;
                      return (
                        <Pressable
                          key={diff}
                          onPress={() => setSelectedDifficulty(diff)}
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: isSelected ? theme.tint : theme.background,
                              borderColor: isSelected ? theme.tint : theme.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.filterPillText,
                              { color: isSelected ? '#FFFFFF' : theme.text },
                            ]}>
                            {diff}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Transit time filter group */}
                  <View style={[styles.filterGroup, { marginLeft: 16 }]}>
                    <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>
                      🚆 Train :
                    </Text>
                    {[
                      { label: 'Tous', value: 'Toutes' },
                      { label: '≤ 30 min', value: '30' },
                      { label: '≤ 45 min', value: '45' },
                      { label: '≤ 60 min', value: '60' },
                    ].map((item) => {
                      const isSelected = selectedTransitLimit === item.value;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => setSelectedTransitLimit(item.value)}
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: isSelected ? theme.secondary : theme.background,
                              borderColor: isSelected ? theme.secondary : theme.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.filterPillText,
                              { color: isSelected ? '#FFFFFF' : theme.text },
                            ]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Rando List */}
              <FlatList
                data={filteredRandos}
                keyExtractor={(item) => `list-${item.id}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const transitInfo = getTransitInfo(item);
                  return (
                    <RandoCard
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
                    />
                  );
                }}
                ListEmptyComponent={
                  isLoadingHikes ? (
                    <View style={styles.emptyContainer}>
                      <ActivityIndicator size="large" color={theme.tint} />
                      <Text style={[styles.emptyText, { color: theme.text, marginTop: 10 }]}>
                        Chargement des randonnées...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="alert-circle-outline" size={40} color={theme.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.text }]}>
                        Aucune randonnée trouvée
                      </Text>
                      <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
                        Essayez de modifier votre recherche ou de repousser la limite de temps de
                        train.
                      </Text>
                    </View>
                  )
                }
              />
            </View>
          )}
        </View>

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
  carouselHeading: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  carouselScroll: {
    paddingHorizontal: 16,
  },
  bottomSheetCollapsed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    paddingTop: 6,
    zIndex: 9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomSheetExpanded: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
  },
  sheetTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  expandedTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetControls: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: {
    fontFamily: 'Satoshi',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    padding: 0,
  },
  filtersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterGroupLabel: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  filterPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterPillText: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
