import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { MOCK_RANDOS } from '@/constants/RandosData';

export default function MyAdventuresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname === '/adventures';
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const { plannedAdventures, deleteAdventure } = useAdventure();

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

  // Helper date formatter
  const formatDateRange = (outward: string, returnStr: string) => {
    const d1 = new Date(outward);
    const d2 = new Date(returnStr);

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    if (outward === returnStr) {
      return d1.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    return `Du ${d1.toLocaleDateString('fr-FR', options)} au ${d2.toLocaleDateString('fr-FR', options)}`;
  };

  const handleCardPress = (id: string) => {
    router.push(`/recap?adventureId=${id}`);
  };

  const handleDeletePress = (id: string) => {
    deleteAdventure(id);
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Mon Carnet de Voyage</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Retrouvez ici vos randonnées planifiées et vos billets de train.
          </Text>
        </View>

        {/* Adventures List */}
        <FlatList
          data={plannedAdventures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const rando = MOCK_RANDOS.find((r) => r.id === item.randoId);
            if (!rando) return null;

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
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardDate, { color: theme.tint }]}>
                      📅 {formatDateRange(item.outwardDate, item.returnDate)}
                    </Text>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {rando.title}
                    </Text>
                  </View>

                  {/* Trash/Delete button */}
                  <Pressable
                    onPress={() => handleDeletePress(item.id)}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      { backgroundColor: theme.orangeBadge, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Ionicons name="trash" size={16} color="#C62828" />
                  </Pressable>
                </View>

                {/* Transit Details */}
                <View
                  style={[
                    styles.transitBlock,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <View style={styles.transitRow}>
                    <Text style={styles.transitIcon}>🚆</Text>
                    <Text style={[styles.transitText, { color: theme.text }]} numberOfLines={1}>
                      Aller : {item.outwardTrain.time} (
                      {item.departureStationName.replace('Paris ', '')} →{' '}
                      {rando.startStation.replace('Gare de ', '')})
                    </Text>
                  </View>
                  <View style={[styles.transitRow, { marginTop: 6 }]}>
                    <Text style={styles.transitIcon}>🥾</Text>
                    <Text style={[styles.transitText, { color: theme.text }]} numberOfLines={1}>
                      Marche : {rando.distance} ({rando.durationHours}h) • {rando.difficulty}
                    </Text>
                  </View>
                </View>

                {/* Footer row with status badge */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.isBooked ? theme.greenBadge : theme.orangeBadge,
                      },
                    ]}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.isBooked ? '#2E7D32' : '#EF6C00' },
                      ]}
                    />
                    <Text
                      style={[styles.statusText, { color: item.isBooked ? '#2E7D32' : '#EF6C00' }]}>
                      {item.isBooked ? 'Train réservé' : 'Train à réserver'}
                    </Text>
                  </View>

                  <View style={styles.actionLinkRow}>
                    <Text style={[styles.actionLink, { color: theme.tint }]}>Détails voyage</Text>
                    <Ionicons name="chevron-forward" size={12} color={theme.tint} />
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: theme.greenBadge }]}>
                <Ionicons name="calendar-outline" size={40} color={theme.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun voyage planifié</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Explorez nos randonnées éco-responsables et planifiez votre première aventure en
                train en quelques clics !
              </Text>
              <Pressable
                onPress={() => router.push('/')}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <View style={[styles.exploreBtn, { backgroundColor: theme.tint }]}>
                  <Text style={styles.exploreBtnText}>Explorer les randos</Text>
                </View>
              </Pressable>
            </View>
          }
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
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
        shadowOpacity: 0.04,
        shadowRadius: 6,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardDate: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  transitIcon: {
    fontSize: 12,
  },
  transitText: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLink: {
    fontFamily: 'Satoshi',
    fontSize: 12,
    fontWeight: '800',
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
    fontFamily: 'BricolageGrotesque',
    fontSize: 18,
    fontWeight: '850',
  },
  emptySub: {
    fontFamily: 'Satoshi',
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
    fontFamily: 'Satoshi',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
