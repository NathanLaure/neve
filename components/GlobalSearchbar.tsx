import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Search, SlidersHorizontal, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface GlobalSearchbarProps {
  searchQuery: string;
  onPress: () => void;
  style?: any;
  onBack?: () => void;
  isStatic?: boolean;
  /** Omit to hide the filters button entirely — screens that surface filters as chips do. */
  onPressFilter?: () => void;
  /** Badge shown on the filters button; ignored when `onPressFilter` is omitted. */
  activeFiltersCount?: number;
}

export default function GlobalSearchbar({
  searchQuery,
  onPress,
  style,
  onBack,
  isStatic,
  onPressFilter,
  activeFiltersCount = 0,
}: GlobalSearchbarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.floatingSearchContainer, style]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.floatingSearchButton,
          {
            backgroundColor: theme.card,
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

        <View style={styles.floatingSearchTextColumn}>
          <Text style={[styles.floatingSearchTitle, { color: theme.text }]} numberOfLines={1}>
            {isStatic ? 'Où va-t-on ?' : searchQuery ? searchQuery : 'Où va-t-on ?'}
          </Text>
        </View>

        {onPressFilter && (
          <Pressable onPress={onPressFilter} style={styles.floatingSearchFilterBtn}>
            <View>
              <SlidersHorizontal size={24} color={theme.text} />
              {activeFiltersCount > 0 && (
                <View style={[styles.badgeContainer, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
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
