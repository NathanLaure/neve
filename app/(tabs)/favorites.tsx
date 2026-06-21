import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname === '/favorites';
  const [fadeAnim] = useState(() => new Animated.Value(0));

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

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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
    fontWeight: '850',
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
