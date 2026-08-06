import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Search, ArrowRight, FolderInput, Trash2 } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import RandoCard from '@/components/RandoCard';
import { Input } from '@/components/Input';
import ItemButton from '@/components/ItemButton';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import { type RandoData } from '@/constants/RandosData';

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export default function FavoritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
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

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
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

  // La recherche filtre l'affichage seulement : `favoriteHikes` reste la référence
  // pour le compteur et pour distinguer "aucun favori" de "aucun résultat".
  const visibleHikes = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return favoriteHikes;
    return favoriteHikes.filter(
      (h) =>
        h.title?.toLowerCase().includes(query) ||
        h.location?.toLowerCase().includes(query) ||
        h.startStation?.toLowerCase().includes(query)
    );
  }, [favoriteHikes, searchText]);

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
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            // Passé comme élément (et non comme composant) : une fonction inline serait
            // remontée à chaque frappe et l'input perdrait le focus.
            ListHeaderComponent={
              <View style={styles.searchContainer}>
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
                  Aucun favori ne correspond à « {searchText.trim()} »
                </Text>
              </View>
            }
          />
        )}

        {/* Actions contextuelles — ouvertes par appui long sur une card */}
        <BaseBottomSheetModal
          ref={actionsSheetRef}
          showHeader={false}
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
  // Pas de padding horizontal : la barre vit dans le contentContainer de la liste,
  // qui applique déjà la gouttière de 20.
  searchContainer: {
    paddingBottom: 16,
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
  },
  noResultsText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    textAlign: 'center',
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
