import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Search, ArrowRight, FolderInput, Trash2 } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import RandoCard from '@/components/RandoCard';
import Chip from '@/components/Chip';
import { Input } from '@/components/Input';
import ItemButton from '@/components/ItemButton';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { useTabBarHeight } from '@/components/TabBar';
import { type RandoData } from '@/constants/RandosData';
import {
  FavoritesFilterSheets,
  FavoritesFilterSheetsRef,
  SortCriteria,
  SORT_OPTIONS,
} from '@/components/FavoritesFilterSheets';

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export default function FavoritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname === '/favorites';
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;

  // Title font size & line height interpolation driven by scroll
  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [32, 22],
    extrapolate: 'clamp',
  });

  const titleLineHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [38, 26],
    extrapolate: 'clamp',
  });

  // Subtitle opacity and height collapse
  const subOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const subHeight = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [22, 0],
    extrapolate: 'clamp',
  });

  const subMarginTop = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [4, 0],
    extrapolate: 'clamp',
  });

  // Header container padding
  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [16, 8],
    extrapolate: 'clamp',
  });

  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [8, 4],
    extrapolate: 'clamp',
  });

  const {
    hikes,
    favoriteHikeIds,
    favoriteSavedAt,
    isLoadingFavorites,
    refreshFavorites,
    toggleFavorite,
    getTransitInfo,
  } = useAdventure();

  // Search & Filter States
  const [searchText, setSearchText] = useState('');
  const [onlyOffline, setOnlyOffline] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('recent');
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const filterSheetsRef = useRef<FavoritesFilterSheetsRef>(null);
  const [actionHike, setActionHike] = useState<RandoData | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFavorites();
    } finally {
      setRefreshing(false);
    }
  };

  const favoriteHikes = useMemo(
    () => hikes.filter((h) => favoriteHikeIds.has(h.id)),
    [hikes, favoriteHikeIds]
  );

  // Number of favorite hikes stored offline (having GPX trace / details loaded)
  const offlineCount = useMemo(() => {
    return favoriteHikes.filter((h) => Boolean(h.hasFullDetail || (h.gpxTrace && h.gpxTrace.length > 0))).length;
  }, [favoriteHikes]);

  // Helper filter function for custom criteria overrides (used for sheet counts)
  const filterAndSortHikes = useCallback(
    (
      sourceList: RandoData[],
      override?: {
        sort?: SortCriteria;
        difficulties?: string[];
        maxDistance?: number | null;
        offline?: boolean;
        query?: string;
      }
    ) => {
      const activeOffline = override?.offline ?? onlyOffline;
      const activeSort = override?.sort ?? sortCriteria;
      const activeDiffs = override?.difficulties ?? selectedDifficulties;
      const activeMaxDist = override?.maxDistance !== undefined ? override.maxDistance : maxDistance;
      const activeQuery = (override?.query ?? searchText).trim().toLowerCase();

      let result = sourceList.filter((h) => {
        // Text search
        if (activeQuery) {
          const matches =
            h.title?.toLowerCase().includes(activeQuery) ||
            h.location?.toLowerCase().includes(activeQuery) ||
            h.startStation?.toLowerCase().includes(activeQuery);
          if (!matches) return false;
        }

        // Offline filter
        if (activeOffline) {
          const isOffline = Boolean(h.hasFullDetail || (h.gpxTrace && h.gpxTrace.length > 0));
          if (!isOffline) return false;
        }

        // Difficulty filter
        if (activeDiffs.length > 0) {
          const hDiff = (h.difficulty || '').toLowerCase();
          const hasDiff = activeDiffs.some((d) => hDiff.includes(d.toLowerCase()));
          if (!hasDiff) return false;
        }

        // Max distance filter
        if (activeMaxDist !== null) {
          const distNum = (h as any).distance_km ?? parseFloat(h.distance) ?? 0;
          if (distNum > activeMaxDist) return false;
        }

        return true;
      });

      // Sorting
      result = [...result].sort((a, b) => {
        if (activeSort === 'recent') {
          const timeA = favoriteSavedAt.get(a.id) ?? '';
          const timeB = favoriteSavedAt.get(b.id) ?? '';
          return timeB.localeCompare(timeA);
        }
        if (activeSort === 'distance_asc') {
          const distA = (a as any).distance_km ?? parseFloat(a.distance) ?? 0;
          const distB = (b as any).distance_km ?? parseFloat(b.distance) ?? 0;
          return distA - distB;
        }
        if (activeSort === 'distance_desc') {
          const distA = (a as any).distance_km ?? parseFloat(a.distance) ?? 0;
          const distB = (b as any).distance_km ?? parseFloat(b.distance) ?? 0;
          return distB - distA;
        }
        if (activeSort === 'elevation_asc') {
          const elevA = (a as any).elevation_gain_m ?? (a.elevation ? parseInt(a.elevation.replace(/\D/g, ''), 10) : 0);
          const elevB = (b as any).elevation_gain_m ?? (b.elevation ? parseInt(b.elevation.replace(/\D/g, ''), 10) : 0);
          return elevA - elevB;
        }
        if (activeSort === 'duration_asc') {
          return (a.durationHours ?? 0) - (b.durationHours ?? 0);
        }
        if (activeSort === 'train_asc') {
          const infoA = getTransitInfo(a);
          const infoB = getTransitInfo(b);
          return infoA.durationMinutes - infoB.durationMinutes;
        }
        return 0;
      });

      return result;
    },
    [onlyOffline, sortCriteria, selectedDifficulties, maxDistance, searchText, favoriteSavedAt, getTransitInfo]
  );

  // Filtered and sorted visible favorites list
  const visibleHikes = useMemo(() => {
    return filterAndSortHikes(favoriteHikes);
  }, [filterAndSortHikes, favoriteHikes]);

  // Preview counter for filter bottom sheets
  const getFilteredCountForOverride = useCallback(
    (override: { sort?: SortCriteria; difficulties?: string[]; maxDistance?: number | null }) => {
      return filterAndSortHikes(favoriteHikes, override).length;
    },
    [filterAndSortHikes, favoriteHikes]
  );

  // Check if any filter is active to show "Réinitialiser"
  const hasActiveFilters = useMemo(() => {
    return (
      onlyOffline ||
      sortCriteria !== 'recent' ||
      selectedDifficulties.length > 0 ||
      maxDistance !== null ||
      searchText.trim().length > 0
    );
  }, [onlyOffline, sortCriteria, selectedDifficulties, maxDistance, searchText]);

  const handleResetFilters = () => {
    setOnlyOffline(false);
    setSortCriteria('recent');
    setSelectedDifficulties([]);
    setMaxDistance(null);
    setSearchText('');
  };

  const activeSortLabel = useMemo(() => {
    const found = SORT_OPTIONS.find((s) => s.key === sortCriteria);
    return found ? found.label.split('(')[0].trim() : 'Trier par';
  }, [sortCriteria]);

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

  const handleSelectHike = (id?: string) => {
    if (id) router.push(`/rando/${id}`);
  };

  const handleLongPressHike = (id?: string) => {
    const hike = favoriteHikes.find((h) => h.id === id);
    if (!hike) return;
    setActionHike(hike);
    actionsSheetRef.current?.present();
  };

  const handleRemoveFavorite = () => {
    actionsSheetRef.current?.dismiss();
    if (!actionHike) return;
    toggleFavorite(actionHike.id);
    Toast.show({
      type: 'success',
      text1: 'Retiré des favoris',
      text2: actionHike.title,
    });
  };

  const renderItem = ({ item }: { item: RandoData }) => {
    const transitInfo = getTransitInfo(item);
    return (
      <RandoCard
        compact
        id={item.id}
        title={item.title}
        distance={item.distance}
        trainDuration={transitInfo.durationText}
        difficulty={item.difficulty}
        elevation={item.elevation}
        onPress={handleSelectHike}
        onLongPress={handleLongPressHike}
        location={item.location}
        gpxTrace={item.gpxTrace}
        startStationCoords={item.startStationCoords}
        duration={formatHikeDuration(item.durationHours)}
        savedAt={favoriteSavedAt.get(item.id)}
      />
    );
  };

  const showEmptyState = !isLoadingFavorites && favoriteHikes.length === 0;
  const showLoading = isLoadingFavorites && favoriteHikes.length === 0;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        {/* L'explorateur force `light-content` pour sa carte plein écran, et ce réglage
            est global : sans ce reset, on hérite d'icônes claires sur fond clair ici. */}
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        <Animated.View
          style={[
            styles.header,
            {
              paddingTop: headerPaddingTop,
              paddingBottom: headerPaddingBottom,
            },
          ]}>
          <Animated.Text
            style={[
              styles.headerTitle,
              {
                color: theme.text,
                fontSize: titleFontSize,
                lineHeight: titleLineHeight,
              },
            ]}>
            Mes Favoris
          </Animated.Text>
          <Animated.View
            style={{
              opacity: subOpacity,
              height: subHeight,
              marginTop: subMarginTop,
              overflow: 'hidden',
            }}>
            {favoriteHikes.length > 0 ? (
              <Text style={[styles.headerSub, { color: theme.textMuted }]}>
                {favoriteHikes.length} itinéraire{favoriteHikes.length > 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={[styles.headerSub, { color: theme.textMuted }]}>
                Retrouvez les randonnées que vous avez aimées pour les planifier plus tard.
              </Text>
            )}
          </Animated.View>
        </Animated.View>

        {showLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={theme.tint} />
          </View>
        ) : showEmptyState ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.greenBadge }]}>
              <Heart size={40} color={theme.tint} fill={theme.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {"Aucun favori pour l'instant"}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {
                "Ajoutez des randonnées en favoris depuis l'explorateur pour les retrouver rapidement ici."
              }
            </Text>

            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <View style={[styles.exploreBtn, { backgroundColor: theme.tint }]}>
                <Text style={styles.exploreBtnText}>Explorer les randos</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visibleHikes}
            keyExtractor={(item) => `favorite-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              // La TabBar flotte au-dessus de l'écran : sans cette réserve, la
              // dernière carte finit sous les onglets.
              { paddingBottom: 40 + tabBarHeight },
            ]}
            ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <View style={styles.searchHeaderBlock}>
                {/* 1. Search Bar (Figma 670:40829) */}
                <Input
                  placeholder="Rechercher par nom"
                  value={searchText}
                  onChangeText={setSearchText}
                  onClear={() => setSearchText('')}
                  icon={<Search size={20} color={theme.textMuted} />}
                  fieldBackground={theme.card}
                  returnKeyType="search"
                  autoCorrect={false}
                />

                {/* 2. Horizontal Filter Chips Bar (Figma 670:41084) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScrollContent}
                  style={styles.chipsScrollView}>
                  {/* Chip: Stocké hors-ligne */}
                  <Chip
                    label="Stocké hors-ligne"
                    selected={onlyOffline}
                    badgeCount={offlineCount > 0 ? offlineCount : undefined}
                    badgePosition="inline"
                    onPress={() => setOnlyOffline((prev) => !prev)}
                  />

                  {/* Chip: Trier par */}
                  <Chip
                    label={sortCriteria !== 'recent' ? activeSortLabel : 'Trier par'}
                    selected={sortCriteria !== 'recent'}
                    onPress={() => filterSheetsRef.current?.openSort()}
                  />

                  {/* Chip: Difficulté */}
                  <Chip
                    label="Difficulté"
                    selected={selectedDifficulties.length > 0}
                    badgeCount={
                      selectedDifficulties.length > 0 ? selectedDifficulties.length : undefined
                    }
                    badgePosition="inline"
                    onPress={() => filterSheetsRef.current?.openDifficulty()}
                  />

                  {/* Chip: Distance */}
                  <Chip
                    label={maxDistance !== null ? `< ${maxDistance} km` : 'Distance'}
                    selected={maxDistance !== null}
                    onPress={() => filterSheetsRef.current?.openDistance()}
                  />

                  {/* Button: Réinitialiser (Figma 670:41089) */}
                  {hasActiveFilters && (
                    <Pressable
                      onPress={handleResetFilters}
                      style={({ pressed }) => [
                        styles.resetButton,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}>
                      <Text style={[styles.resetButtonText, { color: theme.tint }]}>
                        Réinitialiser
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: theme.textMuted }]}>
                  {searchText.trim()
                    ? `Aucun favori ne correspond à « ${searchText.trim()} »`
                    : 'Aucun favori ne correspond aux filtres sélectionnés.'}
                </Text>
                {hasActiveFilters && (
                  <Pressable onPress={handleResetFilters} style={styles.emptyResetBtn}>
                    <Text style={[styles.emptyResetText, { color: theme.tint }]}>
                      Réinitialiser les filtres
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}

        {/* Filter Bottom Sheets (Trier par, Difficulté, Distance) */}
        <FavoritesFilterSheets
          ref={filterSheetsRef}
          currentSort={sortCriteria}
          onApplySort={setSortCriteria}
          selectedDifficulties={selectedDifficulties}
          onApplyDifficulties={setSelectedDifficulties}
          maxDistance={maxDistance}
          onApplyDistance={setMaxDistance}
          getFilteredCount={getFilteredCountForOverride}
        />

        {/* Actions contextuelles — ouvertes par appui long sur une card */}
        <BaseBottomSheetModal
          ref={actionsSheetRef}
          enableDynamicSizing
          onClose={() => setActionHike(null)}>
          <View style={styles.actionsList}>
            <ItemButton
              icon={<ArrowRight size={20} color={theme.text} />}
              label="Ouvrir"
              onPress={() => {
                actionsSheetRef.current?.dismiss();
                handleSelectHike(actionHike?.id);
              }}
            />
            <ItemButton
              icon={<FolderInput size={20} color={theme.text} />}
              label="Déplacer"
              onPress={() => {
                actionsSheetRef.current?.dismiss();
                Toast.show({
                  type: 'info',
                  text1: 'Bientôt disponible',
                  text2: 'Les collections de favoris arrivent prochainement.',
                });
              }}
            />
            <ItemButton
              icon={<Trash2 size={20} color="#EF4444" />}
              label="Supprimer"
              color="#EF4444"
              onPress={handleRemoveFavorite}
            />
          </View>
        </BaseBottomSheetModal>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 32,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  searchHeaderBlock: {
    paddingBottom: 16,
    gap: 8,
  },
  chipsScrollView: {
    marginHorizontal: -20,
  },
  chipsScrollContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  actionsList: {
    paddingTop: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  noResultsText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyResetText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 80,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    fontFamily: 'Satoshi',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
