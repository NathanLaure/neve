import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface GlobalSearchbarProps {
  searchQuery: string;
  onPress: () => void;
  style?: any;
}

export default function GlobalSearchbar({ searchQuery, onPress, style }: GlobalSearchbarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const getSubtitleText = () => {
    return 'Lieu · Difficulté · Durée';
  };

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
        <Search size={24} color={theme.text} />

        <View style={styles.floatingSearchTextColumn}>
          <Text style={[styles.floatingSearchTitle, { color: theme.text }]} numberOfLines={1}>
            {searchQuery ? `Recherche : ${searchQuery}` : 'Où va-t-on ?'}
          </Text>
          <Text style={[styles.floatingSearchSub, { color: theme.textMuted }]} numberOfLines={1}>
            {getSubtitleText()}
          </Text>
        </View>

        <Pressable onPress={onPress} style={styles.floatingSearchFilterBtn}>
          <SlidersHorizontal size={24} color={theme.text} />
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
    alignItems: 'center',
  },
  floatingSearchTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
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
});
