import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  Cloud,
  Compass,
  Crown,
  Footprints,
  LifeBuoy,
  LogOut,
  Palette,
  Pencil,
  Scale,
  Settings,
  Share2,
  TrainFront,
  UserRound,
} from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useAdventure, isOneWayAdventure } from '@/context/AdventureContext';
import { useTabBarHeight } from '@/components/TabBar';
import { IconButton } from '@/components/IconButton';
import ProfileMenuRow from '@/components/profile/ProfileMenuRow';
import ProfileStatTile from '@/components/profile/ProfileStatTile';
import { toISODate } from '@/components/plan/DateRangeCalendar';
import { calculateCo2Impact, estimateLegsDistanceKm } from '@/services/transitService';
import { buildAdventureNotifications } from '@/utils/notifications';
import { formatPassesLabel } from '@/types/passenger';

/** « 12 km », « 8,4 km » -> nombre. Les distances de rando sont des libellés. */
function parseDistanceKm(label?: string): number {
  if (!label) return 0;
  const value = parseFloat(label.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const tabBarHeight = useTabBarHeight();
  const pathname = usePathname();
  const isFocused = pathname === '/profile';
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scrollY] = useState(() => new Animated.Value(0));

  const { user, profile, signOut } = useAuth();
  const { plannedAdventures, hikes } = useAdventure();

  const transportSummary =
    formatPassesLabel(profile?.transportPasses ?? []) ?? 'Aucun abonnement déclaré';

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

  /*
   * Le nom se relaie entre le corps et l'en-tête : il n'apparaît en haut qu'une
   * fois le bloc d'identité sorti de l'écran. Les deux bornes se recouvrent à
   * peine pour qu'on ne lise jamais le nom en double.
   */
  const headerNameOpacity = scrollY.interpolate({
    inputRange: [56, 96],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerNameTranslate = scrollY.interpolate({
    inputRange: [56, 96],
    outputRange: [8, 0],
    extrapolate: 'clamp',
  });

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/register');
  };

  const handleShare = () => router.push('/share-profile');

  /*
   * Bilan de l'éco-randonneur, calculé sur les seules aventures terminées : une
   * sortie planifiée pour le mois prochain n'a évité aucun gramme de CO₂.
   *
   * Les kilomètres en transport sont une estimation (voir
   * `estimateLegsDistanceKm`), qui vaut pour un cumul mais pas pour un trajet.
   * Sans itinéraire détaillé — aventures d'avant les horaires réels — le trajet
   * compte pour zéro plutôt que pour une valeur inventée.
   */
  const stats = useMemo(() => {
    const today = toISODate(new Date());
    const past = plannedAdventures.filter(
      (adventure) => (adventure.returnDate || adventure.outwardDate) < today
    );

    let transitKm = 0;
    let trailKm = 0;

    past.forEach((adventure) => {
      transitKm += estimateLegsDistanceKm(adventure.outwardTrain?.legs);
      if (!isOneWayAdventure(adventure)) {
        transitKm += estimateLegsDistanceKm(adventure.returnTrain?.legs);
      }

      const hike = hikes.find((item) => item.id === adventure.randoId);
      trailKm +=
        hike?.distanceKm ?? parseDistanceKm(hike?.distance ?? adventure.hikeSnapshot?.distance);
    });

    return {
      completedCount: past.length,
      transitKm: Math.round(transitKm),
      trailKm: Math.round(trailKm),
      savedCo2Kg: Math.round(calculateCo2Impact(transitKm).savedCo2Kg),
    };
  }, [plannedAdventures, hikes]);

  const notificationCount = useMemo(
    () => buildAdventureNotifications(plannedAdventures, hikes, toISODate(new Date())).length,
    [plannedAdventures, hikes]
  );

  const displayName =
    profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Randonneur';
  const displayLocation = profile?.homeLocation;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* En-tête fixe : les raccourcis, et le nom une fois le corps défilé. */}
        <View style={styles.header}>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.headerName,
              {
                color: theme.text,
                opacity: headerNameOpacity,
                transform: [{ translateY: headerNameTranslate }],
              },
            ]}>
            {displayName}
          </Animated.Text>

          {/* Gabarit par défaut du bouton rond, celui de la fiche randonnée :
              40×40, fond `card`, icône en 20. Rien à surcharger. */}
          <IconButton
            variant="circle"
            icon={<Bell size={20} color={theme.text} />}
            badgeCount={notificationCount}
            onPress={() => router.push('/notifications')}
            accessibilityLabel={
              notificationCount > 0
                ? `Notifications, ${notificationCount} en attente`
                : 'Notifications'
            }
          />
          <IconButton
            variant="circle"
            icon={<Share2 size={20} color={theme.text} />}
            onPress={handleShare}
            accessibilityLabel="Partager mon profil"
          />
        </View>

        <Animated.ScrollView
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          style={styles.scroll}
          // La TabBar flotte au-dessus de l'écran : sans cette réserve, le dernier
          // bloc finit sous les onglets.
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}>
          {/* Identité : dans le flux et non dans l'en-tête, pour laisser
              l'avatar prendre sa place et s'effacer au défilement. */}
          <View style={styles.identityRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Modifier les informations de profil"
              onPress={() => router.push('/settings/profile-info')}
              style={styles.avatarPress}>
              <View style={[styles.avatar, { backgroundColor: theme.blueBadge }]}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <UserRound size={54} color={theme.text} strokeWidth={1.5} />
                )}
              </View>
              <View
                style={[
                  styles.avatarBadge,
                  { backgroundColor: theme.text, borderColor: theme.background },
                ]}>
                <Pencil size={12} color={theme.background} />
              </View>
            </Pressable>
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {displayLocation ? (
                <Text style={[styles.location, { color: theme.textMuted }]} numberOfLines={1}>
                  {displayLocation}
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/settings/home-address')}
                  hitSlop={8}>
                  <Text style={[styles.locationEmpty, { color: theme.tint }]}>
                    Ajouter ma localisation
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Grille du bilan (Figma 722:14435) */}
          <View style={styles.grid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abonnement de transport : ${transportSummary}`}
              onPress={() => router.push('/settings/transport-passes')}
              android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
              style={[styles.passCard, { backgroundColor: theme.card }]}>
              <View style={styles.passText}>
                <Text style={[styles.passTitle, { color: theme.text }]}>
                  Abonnement de transport
                </Text>
                <Text style={[styles.passValue, { color: theme.text }]} numberOfLines={1}>
                  {transportSummary}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textMuted} />
            </Pressable>

            <View style={styles.gridRow}>
              <ProfileStatTile
                value={`${stats.savedCo2Kg} kg`}
                label="de CO₂ évité par rapport à la voiture"
                Icon={Cloud}
                iconColor={theme.primary}
              />
              <ProfileStatTile
                value={`${stats.completedCount}`}
                label="Aventures terminées"
                Icon={Compass}
                iconColor={theme.primary}
              />
            </View>

            <View style={styles.gridRow}>
              <ProfileStatTile
                value={`${stats.transitKm} km`}
                label="en transports en commun"
                Icon={TrainFront}
                iconColor={theme.primary}
              />
              <ProfileStatTile
                value={`${stats.trailKm} km`}
                label="de sentiers parcourus"
                Icon={Footprints}
                iconColor={theme.primary}
              />
            </View>
          </View>

          <View style={[styles.menuCard]}>
            <ProfileMenuRow
              label="Paramètres"
              Icon={Settings}
              flush
              onPress={() => router.push('/settings/general')}
            />
            <ProfileMenuRow
              label="Suggestions et assistance"
              Icon={LifeBuoy}
              flush
              onPress={() => router.push('/settings/support')}
            />
            <ProfileMenuRow
              label="Apparence"
              Icon={Palette}
              flush
              onPress={() => router.push('/settings/appearance')}
            />
            <ProfileMenuRow
              label="Névé+"
              Icon={Crown}
              flush
              onPress={() => router.push('/settings/neve-plus')}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={[styles.menuCard]}>
            <ProfileMenuRow
              label="Informations légales"
              Icon={Scale}
              flush
              onPress={() => router.push('/settings/legal')}
            />
            <ProfileMenuRow
              label="Déconnexion"
              Icon={LogOut}
              trailing="none"
              flush
              onPress={handleSignOut}
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  /* `flex: 1` sur le nom : il occupe la largeur laissée par les boutons, ce qui
     les maintient à droite même quand il est invisible. */
  headerName: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 20,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
  },
  avatarPress: {
    width: 80,
    height: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    lineHeight: 34,
  },
  location: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  locationEmpty: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 24,
  },
  grid: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  /* Tableau de styles statique et non `style={({ pressed }) => …}` : sous cette
     forme React Native ne peint ni le fond ni le rayon de la carte. L'appui se
     signale par l'ondulation. */
  passCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  passText: {
    flex: 1,
  },
  passTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  passValue: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  /* `overflow: hidden` : ce sont les angles de la carte qui découpent la première
     et la dernière ligne, elles n'ont pas de rayon propre. */
  menuCard: {
    marginHorizontal: -24,
    overflow: 'hidden',
  },
});
