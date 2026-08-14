import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Animated,
  RefreshControl,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Trash2,
  ChevronRight,
  Calendar,
  Share2,
  CheckCircle2,
  Clock,
  MapPin,
  Train,
  Footprints,
  Compass,
} from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure, PlannedAdventure } from '@/context/AdventureContext';
import { MOCK_RANDOS, RandoData } from '@/constants/RandosData';
import { toISODate } from '@/components/plan/DateRangeCalendar';
import Skeleton from '@/components/Skeleton';
import { useTabBarHeight } from '@/components/TabBar';

type FilterTab = 'upcoming' | 'past' | 'all';

export default function MyAdventuresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname === '/adventures';
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const {
    plannedAdventures,
    isLoadingAdventures,
    deleteAdventure,
    toggleAdventureBooked,
    refreshAdventures,
    hikes,
    loadHikes,
    loadHikeDetail,
    refreshFavorites,
  } = useAdventure();

  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
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
  const { upcomingAdventures, pastAdventures, displayedAdventures } = useMemo(() => {
    const upcoming: PlannedAdventure[] = [];
    const past: PlannedAdventure[] = [];

    for (const adv of plannedAdventures) {
      if (isAdventurePast(adv)) {
        past.push(adv);
      } else {
        upcoming.push(adv);
      }
    }

    // Upcoming: nearest first (ASC)
    upcoming.sort((a, b) => (a.outwardDate < b.outwardDate ? -1 : 1));
    // Past: most recent first (DESC)
    past.sort((a, b) => (a.outwardDate > b.outwardDate ? -1 : 1));

    let displayed = plannedAdventures;
    if (activeTab === 'upcoming') {
      displayed = upcoming;
    } else if (activeTab === 'past') {
      displayed = past;
    } else {
      displayed = [...plannedAdventures].sort((a, b) =>
        a.outwardDate > b.outwardDate ? -1 : 1
      );
    }

    return {
      upcomingAdventures: upcoming,
      pastAdventures: past,
      displayedAdventures: displayed,
    };
  }, [plannedAdventures, isAdventurePast, activeTab]);

  // Resolve hike data from store, snapshot or fallback
  const getHikeData = useCallback(
    (item: PlannedAdventure): Partial<RandoData> => {
      const found = hikes.find((h) => h.id === item.randoId);
      if (found) return found;

      if (item.hikeSnapshot) {
        return {
          id: item.randoId,
          title: item.hikeSnapshot.title,
          imageUrl: item.hikeSnapshot.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
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

  // Helper date formatter
  const formatDateRange = (outward: string, returnStr: string) => {
    if (!outward) return 'Date non définie';
    const d1 = new Date(outward);
    const d2 = returnStr ? new Date(returnStr) : d1;

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    if (outward === returnStr || !returnStr) {
      return d1.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
    }

    return `Du ${d1.toLocaleDateString('fr-FR', options)} au ${d2.toLocaleDateString('fr-FR', options)}`;
  };

  // Actions
  const handleCardPress = (id: string) => {
    router.push(`/recap?adventureId=${id}`);
  };

  const handleToggleBooked = (id: string, event?: any) => {
    event?.stopPropagation?.();
    toggleAdventureBooked(id);
  };

  const handleDeletePress = (id: string, title: string, event?: any) => {
    event?.stopPropagation?.();
    Alert.alert(
      'Supprimer le voyage',
      `Voulez-vous vraiment supprimer "${title}" de vos aventures planifiées ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteAdventure(id),
        },
      ]
    );
  };

  const handleSharePress = async (item: PlannedAdventure, rando: Partial<RandoData>, event?: any) => {
    event?.stopPropagation?.();
    try {
      const dates = formatDateRange(item.outwardDate, item.returnDate);
      const trainGo = item.outwardTrain?.time ? `🚆 Aller : ${item.outwardTrain.time} (${item.departureStationName} → ${rando.startStation})` : '';
      const trainBack = item.returnTrain?.time ? `🚆 Retour : ${item.returnTrain.time} (${rando.endStation ?? rando.startStation} → ${item.returnStationName ?? item.departureStationName})` : '';
      const randoInfo = `🥾 Marche : ${rando.distance ?? ''} • ${rando.difficulty ?? ''}`;

      const message = [
        `🏔️ Mon aventure Névé : ${rando.title || 'Randonnée en train'}`,
        `📅 ${dates}`,
        trainGo,
        randoInfo,
        trainBack,
        `\nPlanifié avec Névé 🚆🌿`,
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        title: `Aventure Névé : ${rando.title}`,
        message,
      });
    } catch (error) {
      console.warn('Error sharing adventure:', error);
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Mes Aventures</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Retrouvez vos randonnées planifiées, vos horaires et vos billets de train.
          </Text>
        </View>

        {/* Tab Filters (À venir / Passées / Toutes) */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setActiveTab('upcoming')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'upcoming' ? theme.tint : theme.card,
                borderColor: activeTab === 'upcoming' ? theme.tint : theme.border,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'upcoming' ? theme.buttonTextOnBrand : theme.text },
              ]}>
              À venir ({upcomingAdventures.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('past')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'past' ? theme.tint : theme.card,
                borderColor: activeTab === 'past' ? theme.tint : theme.border,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'past' ? theme.buttonTextOnBrand : theme.text },
              ]}>
              Passées ({pastAdventures.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('all')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'all' ? theme.tint : theme.card,
                borderColor: activeTab === 'all' ? theme.tint : theme.border,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'all' ? theme.buttonTextOnBrand : theme.text },
              ]}>
              Toutes ({plannedAdventures.length})
            </Text>
          </Pressable>
        </View>

        {/* Adventures List */}
        {isLoadingAdventures && displayedAdventures.length === 0 ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} width="100%" height={160} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          <FlatList
            data={displayedAdventures}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              // La TabBar flotte au-dessus de l'écran : sans cette réserve, la
              // dernière carte finit sous les onglets.
              { paddingBottom: 40 + tabBarHeight },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.tint}
                colors={[theme.tint]}
              />
            }
            renderItem={({ item }) => {
              const rando = getHikeData(item);
              const isPast = isAdventurePast(item);

              return (
                <Pressable
                  onPress={() => handleCardPress(item.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      shadowColor: colorScheme === 'dark' ? '#000' : '#1A251E',
                    },
                    pressed ? styles.cardPressed : null,
                  ]}>
                  {/* Card Top: Date & Action buttons */}
                  <View style={styles.cardHeader}>
                    <View style={styles.dateBadgeWrapper}>
                      <Calendar size={13} color={isPast ? theme.textMuted : theme.tint} />
                      <Text
                        style={[
                          styles.cardDate,
                          { color: isPast ? theme.textMuted : theme.tint },
                        ]}>
                        {formatDateRange(item.outwardDate, item.returnDate)}
                      </Text>
                    </View>

                    <View style={styles.headerActions}>
                      {/* Share Button */}
                      <Pressable
                        onPress={(e) => handleSharePress(item, rando, e)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          { backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.7 : 1 },
                        ]}>
                        <Share2 size={14} color={theme.text} />
                      </Pressable>

                      {/* Delete Button */}
                      <Pressable
                        onPress={(e) => handleDeletePress(item.id, rando.title || 'cette rando', e)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          { backgroundColor: theme.orangeBadge, opacity: pressed ? 0.7 : 1 },
                        ]}>
                        <Trash2 size={14} color="#C62828" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Card Title & Location */}
                  <View style={styles.titleBlock}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {rando.title}
                    </Text>
                    {rando.startStation ? (
                      <View style={styles.locationRow}>
                        <MapPin size={12} color={theme.textMuted} />
                        <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                          {item.departureStationName} → {rando.startStation}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Transit & Hike Details Inset */}
                  <View
                    style={[
                      styles.transitBlock,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    {item.outwardTrain?.time ? (
                      <View style={styles.transitRow}>
                        <Train size={14} color={theme.tint} />
                        <Text style={[styles.transitText, { color: theme.text }]} numberOfLines={1}>
                          Aller : {item.outwardTrain.time} (
                          {item.departureStationName.replace('Paris ', '')} →{' '}
                          {rando.startStation?.replace('Gare de ', '') || 'Destination'})
                        </Text>
                      </View>
                    ) : null}

                    {rando.distance ? (
                      <View style={[styles.transitRow, { marginTop: item.outwardTrain?.time ? 6 : 0 }]}>
                        <Footprints size={14} color={theme.textMuted} />
                        <Text style={[styles.transitText, { color: theme.text }]} numberOfLines={1}>
                          Marche : {rando.distance} ({rando.durationHours}h) • {rando.difficulty}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Footer Row: Status Toggle Badge & Link */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      onPress={(e) => handleToggleBooked(item.id, e)}
                      style={({ pressed }) => [
                        styles.statusBadge,
                        {
                          backgroundColor: item.isBooked ? theme.greenBadge : theme.orangeBadge,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.isBooked ? '#2E7D32' : '#EF6C00' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: item.isBooked ? '#2E7D32' : '#EF6C00' },
                        ]}>
                        {item.isBooked ? 'Train réservé' : 'Train à réserver'}
                      </Text>
                    </Pressable>

                    <View style={styles.actionLinkRow}>
                      <Text style={[styles.actionLink, { color: theme.tint }]}>Détails voyage</Text>
                      <ChevronRight size={14} color={theme.tint} />
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconWrapper, { backgroundColor: theme.greenBadge }]}>
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
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                    <View style={[styles.exploreBtn, { backgroundColor: theme.tint }]}>
                      <Text style={styles.exploreBtnText}>Explorer les randos</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
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
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  tabPillText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  skeletonCard: {
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    marginBottom: 10,
    gap: 3,
  },
  cardTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 17,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  transitBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transitText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  actionLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLink: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 12,
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
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 18,
  },
  emptySub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
