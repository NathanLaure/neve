import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mes Favoris</Text>
        <Text style={[styles.headerSub, { color: theme.textMuted }]}>
          Retrouvez les randonnées que vous avez aimées pour les planifier plus tard.
        </Text>
      </View>

      <View style={styles.emptyContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: theme.greenBadge }]}>
          <Ionicons name="heart" size={40} color={theme.tint} />
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
    </SafeAreaView>
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: '850',
  },
  emptySub: {
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
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
