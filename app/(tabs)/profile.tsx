import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Cloud, Compass, Train, Sun, Moon, Settings } from 'lucide-react-native';
import { usePathname } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme, setThemeOverride, getThemeOverride } from '@/components/useColorScheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const pathname = usePathname();
  const isFocused = pathname === '/profile';
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

  // Track the override locally to update segmented buttons immediately
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | null>(() => getThemeOverride());

  const handleThemeChange = (mode: 'light' | 'dark' | null) => {
    setThemeOverride(mode);
    setActiveTheme(mode);
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Mon Profil</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              {"Suivez votre impact écologique et gérez vos préférences d'affichage."}
            </Text>
          </View>

          {/* User Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.userProfileRow}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.greenBadge }]}>
                <Leaf size={32} color={theme.tint} />
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>Nathan Laure</Text>
                <View style={[styles.badge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.badgeText}>{"Éco-Explorateur d'Or"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Eco Stats Title */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Impact Éco-Responsable</Text>

          {/* Eco Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Card 1: CO2 */}
            <View
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Cloud size={24} color="#2D6A4F" />
              <Text style={[styles.statValue, { color: theme.text }]}>84 kg</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>CO₂ économisé</Text>
            </View>

            {/* Card 2: Hikes */}
            <View
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Compass size={24} color={theme.tint} />
              <Text style={[styles.statValue, { color: theme.text }]}>6</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Aventures</Text>
            </View>

            {/* Card 3: Distance */}
            <View
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Train size={24} color={theme.secondary} />
              <Text style={[styles.statValue, { color: theme.text }]}>320 km</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>En train</Text>
            </View>
          </View>

          {/* Preferences Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {"Préférences de l'Application"}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.text, marginBottom: 12 }]}>
              {"Thème d'affichage"}
            </Text>

            {/* Segmented Theme Picker */}
            <View
              style={[
                styles.segmentedControl,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              {/* Light Option */}
              <Pressable
                onPress={() => handleThemeChange('light')}
                style={styles.segmentBtnWrapper}>
                <View
                  style={[
                    styles.segmentBtn,
                    activeTheme === 'light'
                      ? { backgroundColor: theme.card }
                      : { backgroundColor: 'transparent' },
                  ]}>
                  <Sun size={16} color={activeTheme === 'light' ? theme.tint : theme.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: activeTheme === 'light' ? theme.text : theme.textMuted },
                    ]}>
                    Clair
                  </Text>
                </View>
              </Pressable>

              {/* Dark Option */}
              <Pressable onPress={() => handleThemeChange('dark')} style={styles.segmentBtnWrapper}>
                <View
                  style={[
                    styles.segmentBtn,
                    activeTheme === 'dark'
                      ? { backgroundColor: theme.card }
                      : { backgroundColor: 'transparent' },
                  ]}>
                  <Moon size={16} color={activeTheme === 'dark' ? theme.tint : theme.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: activeTheme === 'dark' ? theme.text : theme.textMuted },
                    ]}>
                    Sombre
                  </Text>
                </View>
              </Pressable>

              {/* System Option */}
              <Pressable onPress={() => handleThemeChange(null)} style={styles.segmentBtnWrapper}>
                <View
                  style={[
                    styles.segmentBtn,
                    activeTheme === null
                      ? { backgroundColor: theme.card }
                      : { backgroundColor: 'transparent' },
                  ]}>
                  <Settings size={16} color={activeTheme === null ? theme.tint : theme.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: activeTheme === null ? theme.text : theme.textMuted },
                    ]}>
                    Système
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Eco-hiker Charter */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {"Charte de l'Éco-Voyageur"}
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 },
            ]}>
            <View style={styles.charterItem}>
              <Text style={styles.charterIcon}>🚆</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.charterTitle, { color: theme.text }]}>Mobilité Douce</Text>
                <Text style={[styles.charterText, { color: theme.textMuted }]}>
                  Privilégier le train et les transports en commun pour se rendre au point de départ
                  de chaque randonnée.
                </Text>
              </View>
            </View>

            <View style={[styles.charterItem, { marginTop: 14 }]}>
              <Text style={styles.charterIcon}>🚯</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.charterTitle, { color: theme.text }]}>Zéro Déchet</Text>
                <Text style={[styles.charterText, { color: theme.textMuted }]}>
                  Ne laisser aucune trace. Emporter ses déchets et trier une fois rentré à la
                  maison.
                </Text>
              </View>
            </View>

            <View style={[styles.charterItem, { marginTop: 14 }]}>
              <Text style={styles.charterIcon}>🌿</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.charterTitle, { color: theme.text }]}>Respect du Vivant</Text>
                <Text style={[styles.charterText, { color: theme.textMuted }]}>
                  Rester sur les sentiers balisés pour ne pas piétiner la flore et ne pas perturber
                  la faune sauvage.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    fontSize: 10,
  },
  sectionTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 15,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    textAlign: 'center',
  },
  cardLabel: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtnWrapper: {
    flex: 1,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  segmentText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  charterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  charterIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  charterTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 13,
    marginBottom: 2,
  },
  charterText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 16,
  },
});
