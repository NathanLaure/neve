import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Search, SlidersHorizontal, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';

interface GlobalSearchbarProps {
  searchQuery: string;
  onPress: () => void;
  style?: any;
  onBack?: () => void;
  onPressFilter?: () => void;
  isStatic?: boolean;
}

export default function GlobalSearchbar({ searchQuery, onPress, style, onBack, onPressFilter, isStatic }: GlobalSearchbarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const {
    selectedDifficulties,
    maxTrainDuration,
    maxDistance,
    maxElevation,
    dogsAllowed,
    kidsFriendly,
    selectedActivityTypes,
    selectedPointsOfInterest,
  } = useAdventure();

  const activeFiltersCount = isStatic
    ? 0
    : selectedDifficulties.length +
      (maxTrainDuration !== null ? 1 : 0) +
      (maxDistance !== null ? 1 : 0) +
      (maxElevation !== null ? 1 : 0) +
      (dogsAllowed ? 1 : 0) +
      (kidsFriendly ? 1 : 0) +
      selectedActivityTypes.length +
      selectedPointsOfInterest.length;



  return (
    <View style={[styles.floatingSearchContainer, style]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.floatingSearchButton,
          {
            backgroundColor: theme.background,
            borderColor: theme.borderStrong,
            borderWidth: colorScheme === 'dark' ? 2 : 0,
            shadowColor: '#000',
          },
        ]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={{ padding: 4, marginLeft: -4, marginRight: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
        ) : (
          <Search size={24} color={theme.text} />
        )}

        <View style={[styles.floatingSearchTextColumn, isStatic && { alignItems: 'center' }]}>
          <Text
            style={[
              styles.floatingSearchTitle,
              { color: theme.text },
              isStatic && { textAlign: 'center' },
            ]}
            numberOfLines={1}>
            {isStatic ? 'Où va-t-on ?' : searchQuery ? searchQuery : 'Où va-t-on ?'}
          </Text>
          {isStatic && (
            <Text style={[styles.floatingSearchSub, { color: theme.textMuted }]} numberOfLines={1}>
              Lieu · Difficulté · Durée
            </Text>
          )}
        </View>

        <Pressable onPress={onPressFilter ?? onPress} style={styles.floatingSearchFilterBtn}>
          <View>
            <SlidersHorizontal size={24} color={theme.text} />
            {activeFiltersCount > 0 && (
              <View style={[styles.badgeContainer, { backgroundColor: theme.primary }]}>
                <Text style={styles.badgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingSearchContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  floatingSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingSearchTextColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  floatingSearchTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'left',
    lineHeight: 24,
  },
  floatingSearchSub: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  floatingSearchFilterBtn: {
    padding: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'center',
  },
});
