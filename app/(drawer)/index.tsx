import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Link, useNavigation } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard, { RandoCardProps } from '@/components/RandoCard';

// Rich hiking dataset
const MOCK_RANDOS: (RandoCardProps & { id: string })[] = [
  {
    id: '1',
    title: 'Les Balcons de la Vallée de Chevreuse',
    imageUrl:
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop',
    departureStation: 'Gare de Rambouillet',
    distance: '12 km',
    weatherTemp: '19°C',
    weatherIcon: '☀️',
    trainDuration: '35 min',
    trainType: 'TER',
    difficulty: 'Modéré',
    elevation: '+150m',
  },
  {
    id: '2',
    title: 'La Traversée de la Forêt de Fontainebleau',
    imageUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
    departureStation: 'Gare de Fontainebleau-Avon',
    distance: '16.5 km',
    weatherTemp: '21°C',
    weatherIcon: '⛅',
    trainDuration: '40 min',
    trainType: 'Transilien R',
    difficulty: 'Difficile',
    elevation: '+280m',
  },
  {
    id: '3',
    title: 'Le Sentier Historique des Peintres de Barbizon',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop',
    departureStation: 'Gare de Melun',
    distance: '8.5 km',
    weatherTemp: '20°C',
    weatherIcon: '☀️',
    trainDuration: '25 min',
    trainType: 'TER',
    difficulty: 'Facile',
    elevation: '+60m',
  },
  {
    id: '4',
    title: 'La Boucle Bucolique des Étangs de Hollande',
    imageUrl:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
    departureStation: 'Gare de Rambouillet',
    distance: '14 km',
    weatherTemp: '18°C',
    weatherIcon: '☁️',
    trainDuration: '35 min',
    trainType: 'TER',
    difficulty: 'Modéré',
    elevation: '+80m',
  },
];

export default function TabOneScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Toutes');
  const navigation = useNavigation();

  // Filter hikes based on search query and selected difficulty
  const filteredRandos = MOCK_RANDOS.filter((rando) => {
    const matchesSearch =
      rando.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rando.departureStation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty =
      selectedDifficulty === 'Toutes' || rando.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.openDrawer()}
            style={({ pressed }) => [
              styles.menuButton,
              { backgroundColor: theme.card, borderColor: theme.border },
              pressed && { opacity: 0.6 },
            ]}>
            <SymbolView
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              size={20}
              tintColor={theme.text}
            />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.welcomeText, { color: theme.textMuted }]}>
              Névé, partenaire de vos randos
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Où partez-vous rando ?</Text>
          </View>
          <Link href="/modal" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.infoButton,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && { opacity: 0.6 },
              ]}>
              <SymbolView
                name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
                size={20}
                tintColor={theme.tint}
              />
            </Pressable>
          </Link>
        </View>

        {/* Modern Search Bar with Clear Button */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: colorScheme === 'dark' ? '#000' : '#1E293B',
            },
          ]}>
          <SymbolView
            name={{
              ios: 'magnifyingglass',
              android: 'search',
              web: 'search',
            }}
            size={18}
            tintColor={theme.textMuted}
          />
          <TextInput
            placeholder="Rechercher une rando, une gare..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
            clearButtonMode="always"
          />
          {searchQuery !== '' && Platform.OS !== 'ios' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={16}
                tintColor={theme.textMuted}
              />
            </Pressable>
          )}
        </View>

        {/* Quick Stats Badges Scroller */}
        <View style={styles.statsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}>
            <View style={[styles.statBadge, { backgroundColor: theme.blueBadge }]}>
              <Text style={[styles.statText, { color: theme.secondary }]}>🚆 100% Accessible</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: theme.greenBadge }]}>
              <Text style={[styles.statText, { color: theme.tint }]}>🍃 Zéro Carbone</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: 'rgba(239, 108, 0, 0.1)' }]}>
              <Text style={[styles.statText, { color: '#EF6C00' }]}>⛰️ Grand Air</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: 'rgba(198, 40, 40, 0.08)' }]}>
              <Text style={[styles.statText, { color: '#C62828' }]}>🎒 Équipé</Text>
            </View>
          </ScrollView>
        </View>

        {/* Quick Difficulty Filters */}
        <View style={styles.filtersContainer}>
          <Text style={[styles.filterTitle, { color: theme.textMuted }]}>Difficulté :</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}>
            {['Toutes', 'Facile', 'Modéré', 'Difficile'].map((diff) => {
              const isSelected = selectedDifficulty === diff;

              // Color indicators and styles
              let badgeEmoji = '🗺️';
              let activeBg = theme.tint;
              if (diff === 'Facile') {
                badgeEmoji = '🟢';
                activeBg = '#2E7D32';
              } else if (diff === 'Modéré') {
                badgeEmoji = '🟡';
                activeBg = '#EF6C00';
              } else if (diff === 'Difficile') {
                badgeEmoji = '🔴';
                activeBg = '#C62828';
              }

              return (
                <Pressable
                  key={diff}
                  onPress={() => setSelectedDifficulty(diff)}
                  style={({ pressed }) => [
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? activeBg : theme.card,
                      borderColor: isSelected ? activeBg : theme.border,
                      shadowColor: colorScheme === 'dark' ? '#000' : '#1E293B',
                    },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text
                    style={[
                      styles.filterText,
                      { color: isSelected ? '#FFFFFF' : theme.text, fontWeight: '700' },
                    ]}>
                    {badgeEmoji} {diff}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* List Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Suggestions de saison</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.greenBadge }]}>
            <Text style={[styles.countText, { color: theme.tint }]}>
              {filteredRandos.length} dispo
            </Text>
          </View>
        </View>

        {/* Rando List */}
        <FlatList
          data={filteredRandos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RandoCard
              title={item.title}
              imageUrl={item.imageUrl}
              departureStation={item.departureStation}
              distance={item.distance}
              weatherTemp={item.weatherTemp}
              weatherIcon={item.weatherIcon}
              trainDuration={item.trainDuration}
              trainType={item.trainType}
              difficulty={item.difficulty}
              elevation={item.elevation}
              onPress={() => console.log(`Selected Rando: ${item.title}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SymbolView
                name={{
                  ios: 'leaf.arrow.triangle.circlepath',
                  android: 'eco',
                  web: 'eco',
                }}
                size={48}
                tintColor={theme.textMuted}
              />
              <Text style={[styles.emptyText, { color: theme.text }]}>Aucun itinéraire trouvé</Text>
              <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
                {
                  "Ajustez votre recherche ou les filtres de difficulté pour découvrir d'autres parcours."
                }
              </Text>
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('Toutes');
                }}
                style={({ pressed }) => [
                  styles.resetButton,
                  { backgroundColor: theme.tint },
                  pressed && { opacity: 0.85 },
                ]}>
                <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
              </Pressable>
            </View>
          }
        />
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
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  infoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  searchContainer: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    padding: 0, // Reset default padding on android
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  filtersScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterText: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
