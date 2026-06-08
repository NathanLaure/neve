import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import { useAdventure } from '@/context/AdventureContext';
import ExplorerMap from '@/components/ExplorerMap';

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
    // Find the hike and scroll/focus or navigate
    const rando = hikes.find((r) => r.id === id);
    if (rando) {
      router.push(`/rando/${id}`);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.welcomeText, { color: theme.textMuted }]}>
              Névé • Éco-Aventures en train
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Explorer les randos</Text>
          </View>

          <Pressable
            onPress={refreshUserLocation}
            style={({ pressed }) => [
              styles.infoButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}>
            {isLocating ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <Ionicons name="locate" size={20} color={theme.tint} />
            )}
          </Pressable>
        </View>

        {/* Location Simulator Control Bar */}
        <View
          style={[styles.locationBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.locationBarLabel, { color: theme.textMuted }]}>
            📍 Position :{' '}
            <Text style={{ color: theme.text, fontWeight: '800' }}>{userLocationName}</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationScroll}>
            <Pressable
              onPress={refreshUserLocation}
              style={[styles.simButton, { backgroundColor: theme.greenBadge }]}>
              <Text style={[styles.simButtonText, { color: theme.tint }]}>⚡ GPS</Text>
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

        {/* Map Section */}
        {!isSheetExpanded && (
          <View style={styles.mapSection}>
            <ExplorerMap
              userLocation={userLocation}
              userLocationName={userLocationName}
              hikes={filteredRandos}
              selectedHikeId={selectedHikeId}
              onSelectHike={handleSelectHike}
            />
          </View>
        )}

        {/* Filters and List in Bottom Sheet Panel */}
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              flex: isSheetExpanded ? 1 : 0,
              height: isSheetExpanded ? '100%' : '52%',
            },
          ]}>
          {/* Bottom Sheet Handle */}
          <Pressable
            onPress={() => setIsSheetExpanded(!isSheetExpanded)}
            style={styles.sheetHandleContainer}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {filteredRandos.length} randonnée{filteredRandos.length > 1 ? 's' : ''} disponible
                {filteredRandos.length > 1 ? 's' : ''}
              </Text>
              <Ionicons
                name={isSheetExpanded ? 'chevron-down-circle' : 'chevron-up-circle'}
                size={22}
                color={theme.tint}
              />
            </View>
          </Pressable>

          {/* Search bar & filters (only visible inside sheet for clean context) */}
          <View style={styles.sheetControls}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <Ionicons name="search" size={16} color={theme.textMuted} />
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
            keyExtractor={(item) => item.id}
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
                    Essayez de modifier votre recherche ou de repousser la limite de temps de train.
                  </Text>
                </View>
              )
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 5,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  infoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    width: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  locationBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationScroll: {
    paddingLeft: 10,
    gap: 6,
  },
  simButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simButtonText: {
    fontSize: 10,
    fontWeight: '800',
  },
  mapSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    paddingTop: 8,
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
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
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    gap: 8,
  },
  searchInput: {
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
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
