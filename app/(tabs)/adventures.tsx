import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Compass } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, PlannedAdventure } from '@/context/AdventureContext';
import { MOCK_RANDOS, RandoData } from '@/constants/RandosData';
import { toISODate } from '@/components/plan/DateRangeCalendar';
import Skeleton from '@/components/Skeleton';
import { useTabBarHeight } from '@/components/TabBar';
import Chip from '@/components/Chip';
import RandoCard from '@/components/RandoCard';
import { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import AdventureActionsSheet from '@/components/plan/AdventureActionsSheet';
import { formatHikeDuration } from '@/components/plan/AdventureHikeCard';

type FilterTab = 'all' | 'upcoming' | 'past';

export default function MyAdventuresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname === '/adventures';

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;

  // Title font size & line height interpolation driven by scroll (identique à la page favoris)
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
    plannedAdventures,
    isLoadingAdventures,
    refreshAdventures,
    hikes,
    loadHikes,
    loadHikeDetail,
    refreshFavorites,
  } = useAdventure();

  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const [actionAdventure, setActionAdventure] = useState<PlannedAdventure | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fadeAnim.setValue(0.3);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isFocused, fadeAnim]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadHikes(), refreshFavorites(), refreshAdventures()]);
    } catch (err) {
      console.warn('Error refreshing adventures data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadHikes, refreshFavorites, refreshAdventures]);

  // Date comparators
  const todayStr = useMemo(() => toISODate(new Date()), []);

  const isAdventurePast = useCallback(
    (item: PlannedAdventure) => {
      const compareDate = item.returnDate || item.outwardDate;
      return compareDate < todayStr;
    },
    [todayStr]
  );

  // Grouped & sorted lists
  const { upcomingAdventures, pastAdventures } = useMemo(() => {
    const upcoming: PlannedAdventure[] = [];
    const past: PlannedAdventure[] = [];

    for (const adv of plannedAdventures) {
      if (isAdventurePast(adv)) {
        past.push(adv);
      } else {
        upcoming.push(adv);
      }
    }

    const parseDistanceNum = (item: PlannedAdventure) => {
      const found = hikes.find((h) => h.id === item.randoId);
      const distStr = item.hikeSnapshot?.distance || found?.distance || '';
      const match = distStr.match(/([\d.,]+)/);
      return match ? parseFloat(match[1].replace(',', '.')) : 0;
    };

    if (sortByDistance) {
      upcoming.sort((a, b) => parseDistanceNum(a) - parseDistanceNum(b));
      past.sort((a, b) => parseDistanceNum(a) - parseDistanceNum(b));
    } else {
      // Upcoming: nearest date first (ASC)
      upcoming.sort((a, b) => (a.outwardDate < b.outwardDate ? -1 : 1));
      // Past: most recent first (DESC)
      past.sort((a, b) => (a.outwardDate > b.outwardDate ? -1 : 1));
    }

    return {
      upcomingAdventures: upcoming,
      pastAdventures: past,
    };
  }, [plannedAdventures, isAdventurePast, sortByDistance, hikes]);

  // Resolve hike data from store, snapshot or fallback
  const getHikeData = useCallback(
    (item: PlannedAdventure): Partial<RandoData> => {
      const found = hikes.find((h) => h.id === item.randoId);
      if (found) return found;

      if (item.hikeSnapshot) {
        return {
          id: item.randoId,
          title: item.hikeSnapshot.title,
          imageUrl:
            item.hikeSnapshot.imageUrl ||
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
          startStation: item.hikeSnapshot.startStation,
          endStation: item.hikeSnapshot.endStation || item.hikeSnapshot.startStation,
          distance: item.hikeSnapshot.distance,
          durationHours: item.hikeSnapshot.durationHours,
          difficulty: item.hikeSnapshot.difficulty,
          elevation: item.hikeSnapshot.elevation || 'Plat',
          weatherTemp: item.hikeSnapshot.weatherTemp || '18°C',
          weatherIcon: item.hikeSnapshot.weatherIcon || '☀️',
        };
      }

      const mock = MOCK_RANDOS.find((r) => r.id === item.randoId);
      if (mock) return mock;

      // Request on-demand detail fetch if not loaded
      loadHikeDetail(item.randoId);

      return {
        id: item.randoId,
        title: 'Randonnée',
        startStation: item.departureStationName,
        endStation: item.returnStationName || item.departureStationName,
        distance: '—',
        durationHours: 2,
        difficulty: 'Modéré',
      };
    },
    [hikes, loadHikeDetail]
  );

  /* Appui long sur une carte : mêmes actions que le bouton « … » du
     récapitulatif, sur le modèle de la feuille contextuelle des favoris. */
  const handleLongPressAdventure = useCallback(
    (id?: string) => {
      const found = plannedAdventures.find((adv) => adv.id === id);
      if (!found) return;
      setActionAdventure(found);
      actionsSheetRef.current?.present();
    },
    [plannedAdventures]
  );

  // Helper date formatter matching Figma (e.g. "16 août 2026")
  const formatDateString = (outward: string, returnStr: string) => {
    if (!outward) return 'Date non définie';
    const d1 = new Date(outward);
    const d2 = returnStr ? new Date(returnStr) : d1;

    if (outward === returnStr || !returnStr) {
      return d1.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `Du ${d1.toLocaleDateString('fr-FR', options)} au ${d2.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })}`;
  };

  /*
   * La fiche d'une aventure enregistrée est le récapitulatif, pas le résumé de
   * planification : elle relit l'aventure en base plutôt que le brouillon, et
   * porte l'état d'achat des billets.
   *
   * Les corrections d'itinéraire passent par sa feuille d'options (bouton « … »)
   * ou par l'appui long sur cette carte, qui posent elles-mêmes le brouillon.
   */
  const handleCardPress = (id: string) => {
    router.push({ pathname: '/recap', params: { adventureId: id } });
  };

  const handleResetFilters = () => {
    setActiveTab('all');
    setSortByDistance(false);
  };

  const hasActiveFilters = activeTab !== 'all' || sortByDistance;

  const showUpcoming = activeTab === 'all' || activeTab === 'upcoming';
  const showPast = activeTab === 'all' || activeTab === 'past';

  const visibleUpcoming = showUpcoming ? upcomingAdventures : [];
  const visiblePast = showPast ? pastAdventures : [];
  const totalVisible = visibleUpcoming.length + visiblePast.length;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Collapsible Animated Header (identique à la page Favoris) */}
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
            Mes aventures
          </Animated.Text>
          <Animated.View
            style={{
              opacity: subOpacity,
              height: subHeight,
              marginTop: subMarginTop,
              overflow: 'hidden',
            }}>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              {plannedAdventures.length} aventure{plannedAdventures.length > 1 ? 's' : ''} planifiée{plannedAdventures.length > 1 ? 's' : ''}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Adventures Content List */}
        {isLoadingAdventures && plannedAdventures.length === 0 ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} width="100%" height={120} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          <Animated.ScrollView
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              totalVisible === 0 && styles.listContentEmpty,
              { paddingBottom: 40 + tabBarHeight },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }>
            {/* Horizontal Filter Chips Bar (exactement comme sur la page Favoris) */}
            <View style={styles.chipsBlock}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
                style={styles.chipsScrollView}>
                <Chip
                  label="Toutes"
                  selected={activeTab === 'all'}
                  badgeCount={plannedAdventures.length > 0 ? plannedAdventures.length : undefined}
                  badgePosition="inline"
                  onPress={() => setActiveTab('all')}
                />
                <Chip
                  label="A venir"
                  selected={activeTab === 'upcoming'}
                  badgeCount={upcomingAdventures.length > 0 ? upcomingAdventures.length : undefined}
                  badgePosition="inline"
                  onPress={() => setActiveTab('upcoming')}
                />
                <Chip
                  label="Passées"
                  selected={activeTab === 'past'}
                  badgeCount={pastAdventures.length > 0 ? pastAdventures.length : undefined}
                  badgePosition="inline"
                  onPress={() => setActiveTab('past')}
                />
                <Chip
                  label="Distance"
                  selected={sortByDistance}
                  onPress={() => setSortByDistance((prev) => !prev)}
                />
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
            {totalVisible === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconWrapper, { backgroundColor: theme.card }]}>
                  {activeTab === 'past' ? (
                    <Clock size={40} color={theme.tint} />
                  ) : (
                    <Compass size={40} color={theme.tint} />
                  )}
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {activeTab === 'past'
                    ? 'Aucun voyage passé'
                    : activeTab === 'upcoming'
                      ? 'Aucun voyage à venir'
                      : 'Aucune aventure planifiée'}
                </Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  {activeTab === 'past'
                    ? 'Vos aventures terminées apparaîtront ici pour revivre vos plus belles sorties.'
                    : 'Explorez nos randonnées éco-responsables et planifiez votre prochaine escapade en train en quelques clics !'}
                </Text>
                {activeTab !== 'past' && (
                  <Pressable
                    onPress={() => router.push('/')}
                    android_ripple={{ color: theme.rippleOnBrand, foreground: true }}
                    style={[
                      styles.exploreBtn,
                      {
                        backgroundColor: theme.tint,
                        borderRadius: 14,
                        overflow: 'hidden' as const,
                      },
                    ]}>
                    <Text style={styles.exploreBtnText}>Explorer les randos</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {/* Section A venir */}
                {visibleUpcoming.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                        A venir
                      </Text>
                      <View
                        style={[
                          styles.sectionDivider,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    </View>

                    {visibleUpcoming.map((item) => {
                      const rando = getHikeData(item);
                      const firstStation =
                        item.outwardTrain?.legs?.find((l) => l.mode !== 'walk')?.fromName ||
                        item.outwardTrain?.legs?.[0]?.fromName ||
                        item.departureStationName ||
                        rando.startStation;

                      return (
                        <RandoCard
                          key={item.id}
                          variant="adventure-upcoming"
                          id={item.id}
                          title={rando.title}
                          imageUrl={rando.imageUrl}
                          location={rando.location || rando.startStation}
                          departureStation={firstStation}
                          date={formatDateString(item.outwardDate, item.returnDate)}
                          onPress={() => handleCardPress(item.id)}
                          onLongPress={handleLongPressAdventure}
                        />
                      );
                    })}
                  </View>
                )}

                {/* Section Aventures précédentes */}
                {visiblePast.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                        Aventures précédentes
                      </Text>
                      <View
                        style={[
                          styles.sectionDivider,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    </View>

                    {visiblePast.map((item) => {
                      const rando = getHikeData(item);
                      const displayTime =
                        item.outwardTrain?.time ||
                        formatHikeDuration(rando.durationHours) ||
                        undefined;

                      return (
                        <RandoCard
                          key={item.id}
                          variant="adventure-past"
                          id={item.id}
                          title={rando.title}
                          imageUrl={rando.imageUrl}
                          location={rando.location || rando.startStation}
                          distance={rando.distance}
                          elevation={rando.elevation}
                          time={displayTime}
                          date={formatDateString(item.outwardDate, item.returnDate)}
                          onPress={() => handleCardPress(item.id)}
                          onLongPress={handleLongPressAdventure}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </Animated.ScrollView>
        )}

        {/* Actions contextuelles — ouvertes par appui long sur une card.
            `actionAdventure` n'est volontairement pas remis à `null` à la
            fermeture : la confirmation d'annulation s'ouvre après celle-ci et a
            encore besoin de sa cible. */}
        <AdventureActionsSheet
          ref={actionsSheetRef}
          adventure={actionAdventure}
          hikeTitle={actionAdventure ? getHikeData(actionAdventure).title : undefined}
          isPast={actionAdventure ? isAdventurePast(actionAdventure) : false}
        />
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
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  chipsBlock: {
    paddingBottom: 16,
    paddingTop: 4,
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
  loadingContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  skeletonCard: {
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    marginBottom: 100,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 24,
    fontWeight: '800',
  },
  emptySub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  exploreBtnText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
