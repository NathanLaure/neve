import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Map } from 'lucide-react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import Chip from '@/components/Chip';
import { type RandoData } from '@/constants/RandosData';

// Category tags from Figma design
const CATEGORIES = [
  'A proximité',
  'Forêt',
  'Fleurs',
  'Lac',
  'Rivière',
  'Cascade',
  'Faune sauvage',
  'Plage',
  'Grotte',
  'Sources chaudes',
  'Site historique',
  'Voies vertes',
  'Balade en ville',
];

export interface HikesBottomSheetRef {
  snapToIndex: (index: number) => void;
  sheetIndex: number;
}

interface HikesBottomSheetProps {
  hikes: RandoData[];
  isLoadingHikes: boolean;
  getTransitInfo: (rando: RandoData) => {
    durationMinutes: number;
    durationText: string;
    distanceKm: number;
  };
  onSelectHike: (id: string) => void;
  onChange?: (index: number) => void;
}

const AnimatedFlatList = Animated.createAnimatedComponent(BottomSheetFlatList);

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

const HikesBottomSheetRender: React.ForwardRefRenderFunction<
  HikesBottomSheetRef,
  HikesBottomSheetProps
> = ({ hikes, isLoadingHikes, getTransitInfo, onSelectHike, onChange }, ref) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('A proximité');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const animatedIndex = useSharedValue(0);

  const animatedSpacerStyle = useAnimatedStyle(() => {
    const searchbarTop = Math.max(insets.top, 16);
    const searchbarHeight = 56;
    const desiredGap = 12;
    // offsetCorrection compensates for the BottomSheet handle container height and margins
    const offsetCorrection = 34;
    const targetHeight = searchbarTop + searchbarHeight + desiredGap - offsetCorrection;

    const height = interpolate(animatedIndex.value, [1, 2], [0, targetHeight], 'clamp');
    return {
      height,
      backgroundColor: theme.background,
      zIndex: 30,
    };
  });

  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [0, 0.4], [1, 0], 'clamp');
    return {
      opacity,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    };
  });

  const expandedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [0.2, 0.8], [0, 1], 'clamp');
    const translateY = interpolate(animatedIndex.value, [0, 1], [15, 0], 'clamp');
    const height = interpolate(animatedIndex.value, [0, 0.5], [0, 48], 'clamp');
    const overflow = animatedIndex.value < 0.5 ? 'hidden' : 'visible';
    return {
      opacity,
      transform: [{ translateY }],
      height,
      overflow,
    };
  });

  const resultsTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [0.2, 0.8], [0, 1], 'clamp');
    return {
      opacity,
    };
  });

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(animatedIndex.value, [1.8, 2], [20, 0], 'clamp');
    return {
      backgroundColor: theme.background,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    };
  });

  const animatedHandleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [1.0, 1.4], [1, 0], 'clamp');
    return {
      opacity,
    };
  });

  const scrollOffset = useSharedValue(0);

  const handleScroll = useCallback((event: any) => {
    scrollOffset.value = event.nativeEvent.contentOffset.y;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedChipsShadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(scrollOffset.value, [0, 10], [0, 0.08], 'clamp');
    const elevation = interpolate(scrollOffset.value, [0, 10], [0, 3], 'clamp');
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity,
      shadowRadius: 4,
      elevation,
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    // Fade and scale in more gradually as the sheet opens (between 1.6 and 2.0)
    const progress = interpolate(animatedIndex.value, [1.6, 2.0], [0, 1], 'clamp');
    const opacity = progress;
    const scale = interpolate(progress, [0, 1], [0.8, 1]);
    const translateY = interpolate(progress, [0, 1], [15, 0]);
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedButtonWidthStyle = useAnimatedStyle(() => {
    const targetWidth = interpolate(scrollOffset.value, [0, 40], [140, 48], 'clamp');
    return {
      width: withTiming(targetWidth, { duration: 300 }),
    };
  });

  const animatedTextWidthStyle = useAnimatedStyle(() => {
    const targetWidth = interpolate(scrollOffset.value, [0, 15], [84, 0], 'clamp');
    const targetOpacity = interpolate(scrollOffset.value, [0, 15], [1, 0], 'clamp');
    const targetMarginLeft = interpolate(scrollOffset.value, [0, 15], [8, 0], 'clamp');
    return {
      width: withTiming(targetWidth, { duration: 100 }),
      opacity: withTiming(targetOpacity, { duration: 100 }),
      marginLeft: withTiming(targetMarginLeft, { duration: 100 }),
    };
  });

  const animatedListStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [0.0, 0.4], [0, 1], 'clamp');
    const translateY = interpolate(animatedIndex.value, [0.0, 0.4], [60, 0], 'clamp');
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const renderBackground = useCallback(
    (props: any) => <Animated.View style={[props.style, animatedBackgroundStyle]} />,
    [animatedBackgroundStyle]
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <Animated.View
          style={[styles.handle, { backgroundColor: theme.tabIconDefault }, animatedHandleStyle]}
        />
      </View>
    ),
    [theme.tabIconDefault, animatedHandleStyle]
  );

  const snapPoints = useMemo(() => {
    const collapsedHeight = 70;
    const middleHeight = windowHeight * 0.5;
    const expandedHeight = windowHeight;
    return [collapsedHeight, middleHeight, expandedHeight];
  }, [windowHeight]);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetIndex(index);
      if (onChange) {
        onChange(index);
      }
    },
    [onChange]
  );

  // Expose snapToIndex and sheetIndex to parent via ref
  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      bottomSheetRef.current?.snapToIndex(index);
    },
    sheetIndex,
  }));

  // Filter hikes (category filtering will be added when data supports it)
  const filteredHikes = useMemo(() => {
    // For now, return all hikes. When RandoData has a `categories` field,
    // filter by selectedCategory here.
    return hikes;
  }, [hikes]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      animatedIndex={animatedIndex}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={handleSheetChange}
      backgroundComponent={renderBackground}
      handleComponent={renderHandle}
      style={styles.sheetShadow}
      containerStyle={{ zIndex: 20 }}>
      {/* Animated spacer matching the searchbar when expanded */}
      <Animated.View style={animatedSpacerStyle} pointerEvents="none" />

      {/* Collapsed Header (Visible ONLY at index 0, fades out on drag) */}
      <Animated.View
        style={collapsedHeaderStyle}
        pointerEvents={sheetIndex === 0 ? 'auto' : 'none'}>
        <Text style={[styles.sheetTitle, { color: theme.text }]}>
          {filteredHikes.length} randonnée{filteredHikes.length > 1 ? 's' : ''}
        </Text>
      </Animated.View>

      {/* Sticky category chips */}
      <Animated.View
        style={[
          expandedHeaderStyle,
          {
            backgroundColor: theme.background,
            zIndex: 20,
          },
          animatedChipsShadowStyle,
        ]}
        pointerEvents={sheetIndex === 0 ? 'none' : 'auto'}>
        <View style={styles.expandedHeader}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTagsScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Chip
                  key={cat}
                  text={cat}
                  selected={isSelected}
                  onPress={() => setSelectedCategory(cat)}
                />
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={filteredHikes}
        keyExtractor={(item: RandoData) => `list-${item.id}`}
        contentContainerStyle={styles.listContent}
        style={animatedListStyle}
        ItemSeparatorComponent={() => <View style={{ height: 32 }} />}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <Animated.View style={resultsTitleStyle}>
            {/* Results Title */}
            <Text style={[styles.resultsTitle, { color: theme.text }]}>
              {filteredHikes.length} randonnée{filteredHikes.length > 1 ? 's' : ''} trouvées
            </Text>
          </Animated.View>
        }
        renderItem={({ item }: { item: RandoData }) => {
          const transitInfo = getTransitInfo(item);
          return (
            <View style={{ paddingHorizontal: 24 }}>
              <RandoCard
                id={item.id}
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
                onPress={() => onSelectHike(item.id)}
                location={item.location}
                gpxTrace={item.gpxTrace}
                startStationCoords={item.startStationCoords}
                duration={formatHikeDuration(item.durationHours)}
              />
            </View>
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
              <AlertCircle size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucune randonnée trouvée
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                Essayez de modifier votre recherche ou de repousser la limite de temps de train.
              </Text>
            </View>
          )
        }
      />

      {/* Floating Button "Voir la carte" */}
      <Animated.View
        style={[
          styles.floatingButtonContainer,
          { backgroundColor: theme.tint },
          animatedButtonStyle,
          animatedButtonWidthStyle,
          { bottom: insets.bottom + 64 },
        ]}
        pointerEvents={sheetIndex === 2 ? 'auto' : 'none'}>
        <Pressable
          onPress={() => {
            bottomSheetRef.current?.snapToIndex(0);
          }}
          style={styles.floatingButtonPressable}>
          <Map size={20} color="#FFFFFF" />
          <Animated.View style={[{ overflow: 'hidden' }, animatedTextWidthStyle]}>
            <Text numberOfLines={1} style={styles.floatingButtonText}>
              Voir la carte
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </BottomSheet>
  );
};

const HikesBottomSheet = forwardRef(HikesBottomSheetRender);

HikesBottomSheet.displayName = 'HikesBottomSheet';
export default HikesBottomSheet;

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 12,
    zIndex: 20,
  },
  handle: {
    width: 33,
    height: 4,
    borderRadius: 16777200,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  sheetTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  expandedHeader: {
    paddingTop: 0,
  },
  resultsTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  categoryTagsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 0,
    paddingHorizontal: 24,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 16,
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
  emptySubtext: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  floatingButtonContainer: {
    position: 'absolute',
    alignSelf: 'center',
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 40,
  },
  floatingButtonPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
});
