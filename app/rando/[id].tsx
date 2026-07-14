import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  Platform,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { Host, Switch } from '@expo/ui';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Share as ShareIcon,
  Heart,
  MoreVertical,
  RefreshCw,
  Star,
  CheckCircle2,
  Download,
  Maximize2,
  ChevronDown,
  Navigation,
  Calendar,
  Sun,
  CloudSun,
  CloudRain,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import Tag from '@/components/Tag';

/* eslint-disable @typescript-eslint/no-require-imports */
const iosTint = Platform.OS === 'ios' ? require('@expo/ui/swift-ui/modifiers').tint : null;
const AndroidSwitch = Platform.OS === 'android' ? require('@expo/ui/jetpack-compose').Switch : null;
/* eslint-enable @typescript-eslint/no-require-imports */

export default function RandoDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { getTransitInfo, userLocationName, hikes } = useAdventure();

  // Local interactive states
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Header background color animation
  const headerBgColor = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [
      colorScheme === 'dark' ? 'rgba(27, 27, 27, 0)' : 'rgba(239, 239, 239, 0)',
      theme.card,
    ],
    extrapolate: 'clamp',
  });

  // Header border bottom animation
  const headerBorderColor = scrollY.interpolate({
    inputRange: [120, 150],
    outputRange: ['rgba(0,0,0,0)', theme.border],
    extrapolate: 'clamp',
  });

  // Header title opacity animation
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [100, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Extra buttons (share, heart, options) fade out on scroll
  const extraButtonsOpacity = scrollY.interpolate({
    inputRange: [100, 180],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Single options button fades in on scroll
  const optionsOnlyOpacity = scrollY.interpolate({
    inputRange: [100, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Button background color animation
  const buttonBgColor = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [
      theme.card,
      colorScheme === 'dark' ? 'rgba(27, 27, 27, 0)' : 'rgba(255, 255, 255, 0)',
    ],
    extrapolate: 'clamp',
  });

  // Button shadow opacity animation
  const buttonShadowOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0.1, 0],
    extrapolate: 'clamp',
  });

  // Find the hike
  const rando = hikes.find((r) => r.id === id);

  if (!rando) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Randonnée introuvable</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.tint }]}>
          <Text style={styles.backBtnText}>{"Retourner à l'accueil"}</Text>
        </Pressable>
      </View>
    );
  }

  const transit = getTransitInfo(rando);

  const getDifficultyStatus = (difficulty: string): 'Success' | 'Warning' | 'Error' => {
    switch (difficulty) {
      case 'Facile':
        return 'Success';
      case 'Difficile':
        return 'Error';
      case 'Modéré':
      default:
        return 'Warning';
    }
  };

  // Handler for sharing
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez cette superbe randonnée sur Névé : ${rando.title} !`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // Mock weather forecast
  const weatherForecast = [
    {
      day: 'Aujourd’hui',
      date: 'Mar 6',
      icon: Sun,
      iconColor: '#F59E0B',
      desc: 'Ensoleillé',
      temp: '15-20℃',
    },
    {
      day: 'Demain',
      date: 'Mer 7',
      icon: CloudSun,
      iconColor: '#9CA3AF',
      desc: 'Éclaircies',
      temp: '14-18℃',
    },
    {
      day: 'Après-demain',
      date: 'Jeu 8',
      icon: CloudRain,
      iconColor: '#3B82F6',
      desc: 'Pluie faible',
      temp: '11-15℃',
    },
  ];

  // Mock comments/reviews
  const reviews = [
    {
      id: 'rev-1',
      name: 'Michel Ion',
      time: 'Il y a 1 semaine',
      stars: 5,
      comment: 'Belle balade, ça fait les jambes, beaucoup de montée !!!',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    },
    {
      id: 'rev-2',
      name: 'Sophie Dubois',
      time: 'Il y a 3 jours',
      stars: 4,
      comment: 'Une expérience incroyable! Les paysages étaient à couper le souffle et j’ai adoré chaque minute passée en pleine nature. Je recommande vivement.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    },
    {
      id: 'rev-3',
      name: 'Thomas Martin',
      time: 'Il y a 2 semaines',
      stars: 5,
      comment: 'C’était une aventure mémorable! Bien que le chemin soit difficile par moments, la vue au sommet en valait vraiment la peine. N’oubliez pas votre appareil photo !',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&q=80',
    },
  ];

  // Hike categories/keywords
  const categories = [
    'Randonnée',
    'Trail',
    'Refuge',
    'Vue panoramique',
    'Forêt',
    'Fleurs',
    'Lac',
    'Rivière',
    'Cascade',
    'Grotte',
    'Boucle',
    'Fréquenté',
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Hide default header since we use a custom absolute positioned overlay */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Animated Collapsing Top Header Bar */}
      <Animated.View
        style={[
          styles.headerBar,
          {
            height: insets.top + 56,
            paddingTop: insets.top,
            backgroundColor: headerBgColor,
            borderBottomColor: headerBorderColor,
            borderBottomWidth: scrollY.interpolate({
              inputRange: [0, 150],
              outputRange: [0, StyleSheet.hairlineWidth],
              extrapolate: 'clamp',
            }),
          },
        ]}>
        <View style={styles.headerBarContent}>
          {/* Left Arrow */}
          <IconButton
            variant="circle"
            icon={<ArrowLeft size={20} color={theme.text} />}
            onPress={() => router.back()}
          />

          {/* Centered Title (fades in on scroll) */}
          <Animated.View style={[styles.headerTitleContainer, { opacity: headerTitleOpacity }]}>
            <Text style={[styles.headerTitleText, { color: theme.text }]} numberOfLines={1}>
              {rando.title}
            </Text>
          </Animated.View>

          {/* Right: Both groups rendered, cross-fading */}
          <View style={styles.headerRight}>
            {/* Single options button (fades IN on scroll) */}
            <Animated.View style={{ opacity: optionsOnlyOpacity, position: 'absolute', right: 0 }}
              pointerEvents="box-none">
              <IconButton
                variant="circle"
                icon={<MoreVertical size={20} color={theme.text} />}
                onPress={() => {
                  Alert.alert('Options', undefined, [
                    {
                      text: 'Partager',
                      onPress: handleShare,
                    },
                    {
                      text: isFavorite ? 'Retirer des favoris' : 'Enregistrer',
                      onPress: () => setIsFavorite(!isFavorite),
                    },
                    {
                      text: 'Signaler un probl\u00e8me',
                      style: 'destructive',
                    },
                    {
                      text: 'Annuler',
                      style: 'cancel',
                    },
                  ]);
                }}
              />
            </Animated.View>

            {/* All buttons (fades OUT on scroll) */}
            <Animated.View style={[styles.headerRight, { opacity: extraButtonsOpacity }]}
              pointerEvents="box-none">
              <IconButton
                variant="circle"
                icon={<ShareIcon size={20} color={theme.text} />}
                onPress={handleShare}
              />
              <IconButton
                variant="circle"
                icon={
                  <Heart
                    size={20}
                    color={isFavorite ? '#EF4444' : theme.text}
                    fill={isFavorite ? '#EF4444' : 'none'}
                  />
                }
                onPress={() => setIsFavorite(!isFavorite)}
              />
              <IconButton
                variant="circle"
                icon={<MoreVertical size={20} color={theme.text} />}
                onPress={() => {
                  Alert.alert('Options', undefined, [
                    {
                      text: 'Signaler un probl\u00e8me',
                      style: 'destructive',
                    },
                    {
                      text: 'Annuler',
                      style: 'cancel',
                    },
                  ]);
                }}
              />
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* Fixed Header Image behind ScrollView */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: rando.imageUrl }} style={styles.image} />
        <View style={styles.imageGradientOverlay} />

        {/* Dots Indicator overlay */}
        <View style={styles.sliderIndicator}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.border, width: 4, height: 4 }]} />
        </View>
      </View>

      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Transparent Spacer to reveal the fixed image underneath */}
        <View style={{ height: 284 }} />

        {/* Bottom Sheet Card Style Body */}
        <View style={[styles.sheetContainer, { backgroundColor: theme.background }]}>

          {/* Top Slide Line indicator from Figma */}
          <View style={styles.slideIndicator} />

          {/* Title and Ratings Header */}
          <View style={styles.contentCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Tag
                  statut={getDifficultyStatus(rando.difficulty)}
                  text={rando.difficulty}
                  size="md"
                  textStyle={{ fontFamily: 'Satoshi-Bold' }}
                />
                <View style={styles.routeType}>
                  <RefreshCw size={16} color={theme.text} />
                  <Text style={[styles.routeTypeText, { color: theme.text }]}>
                    Boucle
                  </Text>
                </View>
              </View>

              <View style={styles.ratingRow}>
                <Star size={12} color={theme.text} fill={theme.text} />
                <Text style={[styles.ratingText, { color: theme.text }]}>
                  4,6 <Text style={[styles.ratingCountText, { color: theme.textMuted }]}>({rando.id.charCodeAt(0) % 150 + 80})</Text>
                </Text>
              </View>
            </View>

            {/* Hike Main Title */}
            <Text style={[styles.title, { color: theme.text }]}>{rando.title}</Text>

            {/* Geo Location */}
            <Text style={[styles.locationSubtitle, { color: theme.textMuted }]}>
              {rando.endStation ? `${rando.endStation}, France` : 'Haute-Savoie, France'}
            </Text>

            {/* Description Description */}
            <Text style={[styles.description, { color: theme.text }]}>
              {rando.description}
            </Text>

            {/* Navigo Sticker */}
            {rando.trainType?.toLowerCase().includes('navigo') || rando.priceEst < 10 ? (
              <Tag
                statut="Success"
                size="md"
                icon={<CheckCircle2 size={16} color={theme.statusTextSuccess} />}
                text="Accessible avec le Pass Navigo"
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
          </View>

          {/* Key Specs Columns - Directly on background as in Figma */}
          <View style={styles.specsRow}>
            <View style={styles.specCol}>
              <Text style={[styles.specLabel, { color: theme.textMuted }]}>Durée</Text>
              <Text style={[styles.specVal, { color: theme.text }]}>
                {rando.durationHours}h {Math.floor((rando.durationHours % 1) * 60) > 0 ? `${Math.floor((rando.durationHours % 1) * 60)}min` : ''}
              </Text>
            </View>
            <View style={styles.specCol}>
              <Text style={[styles.specLabel, { color: theme.textMuted }]}>Longueur</Text>
              <Text style={[styles.specVal, { color: theme.text }]}>{rando.distance}</Text>
            </View>
            <View style={styles.specCol}>
              <Text style={[styles.specLabel, { color: theme.textMuted }]}>Dénivelé positif</Text>
              <Text style={[styles.specVal, { color: theme.text }]}>{rando.elevation}</Text>
            </View>
          </View>

          {/* Offline Toggle row - Directly on background as in Figma */}
          <View style={styles.offlineRow}>
            <View style={styles.offlineLeft}>
              <Download size={24} color={theme.text} />
              <Text style={[styles.offlineText, { color: theme.text }]}>Conserver hors ligne</Text>
            </View>
            <Host matchContents>
              {Platform.OS === 'android' && AndroidSwitch ? (
                <AndroidSwitch
                  value={isOffline}
                  onCheckedChange={(val: boolean) => {
                    setIsOffline(val);
                    if (val) {
                      Alert.alert('Mode Hors Ligne', 'Cette randonnée et son tracé GPX ont été enregistrés localement.');
                    }
                  }}
                  enabled={true}
                  colors={{
                    checkedThumbColor: '#ffffff',
                    checkedTrackColor: theme.primary,
                    checkedBorderColor: 'transparent',
                    uncheckedThumbColor: theme.tabIconDefault,
                    uncheckedTrackColor: theme.background,
                    uncheckedBorderColor: theme.border,
                  }}
                />
              ) : (
                <Switch
                  value={isOffline}
                  onValueChange={(val: boolean) => {
                    setIsOffline(val);
                    if (val) {
                      Alert.alert('Mode Hors Ligne', 'Cette randonnée et son tracé GPX ont été enregistrés localement.');
                    }
                  }}
                  modifiers={iosTint ? [iosTint(theme.primary)] : undefined}
                />
              )}
            </Host>
          </View>

          {/* GPX Map Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Carte</Text>
          </View>

          <View style={[styles.gpxMap, { backgroundColor: theme.greenBadge }]}>
            {/* Topography Grid mock */}
            <View style={styles.topoGrid}>
              <View style={[styles.topoLine, { borderStyle: 'dashed', borderColor: theme.border, width: '100%', top: '30%' }]} />
              <View style={[styles.topoLine, { borderStyle: 'dashed', borderColor: theme.border, width: '100%', top: '60%' }]} />
              <View style={[styles.topoLineVertical, { borderStyle: 'dashed', borderColor: theme.border, height: '100%', left: '30%' }]} />
              <View style={[styles.topoLineVertical, { borderStyle: 'dashed', borderColor: theme.border, height: '100%', left: '70%' }]} />
            </View>

            {/* Custom GPX path drawn visually */}
            <View style={styles.gpxTraceContainer}>
              <SvgMockTrace />
            </View>

            {/* Map Labels/Pins */}
            <View style={[styles.mapMarker, { left: '15%', top: '45%' }]}>
              <View style={[styles.markerPin, { backgroundColor: theme.secondary }]}>
                <Text style={styles.markerPinText}>🚆</Text>
              </View>
              <Text style={[styles.markerLabel, { color: theme.text }]}>Départ</Text>
            </View>

            <View style={[styles.mapMarker, { right: '15%', bottom: '25%' }]}>
              <View style={[styles.markerPin, { backgroundColor: theme.primary }]}>
                <Text style={styles.markerPinText}>🌲</Text>
              </View>
              <Text style={[styles.markerLabel, { color: theme.text }]}>Arrivée</Text>
            </View>

            {/* Floating Maximize Button in Top-Right */}
            <Pressable
              onPress={() => Alert.alert('Aperçu GPX', 'Ouvrir la carte interactive plein écran.')}
              style={[styles.mapMaximizeBtn, { backgroundColor: theme.card }]}>
              <Maximize2 size={16} color={theme.text} />
            </Pressable>
          </View>

          {/* Transport Info Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Comment s'y rendre</Text>
          </View>

          <View style={styles.transitContainer}>
            <Text style={[styles.transitText, { color: theme.text }]}>
              Cette randonnée commence et se termine à proximité de la gare de{' '}
              <Text style={{ fontFamily: 'Satoshi-Bold' }}>{rando.endStation || 'Station Nature'}</Text>.
            </Text>

            <Text style={[styles.transitSubtext, { color: theme.textMuted, marginTop: 12 }]}>
              Pour un trajet éco-responsable, nous vous recommandons d'utiliser les transports en commun. Pensez à vérifier les horaires de train et de navette locale avant votre départ.
            </Text>

            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 16 }]} />

            {/* Link to Planning */}
            <Pressable
              onPress={() => router.push(`/plan?randoId=${rando.id}`)}
              style={styles.planningPromoLink}>
              <Text style={[styles.planningPromoText, { color: theme.tint }]}>
                Planifiez votre itinéraire et vos billets de train →
              </Text>
            </Pressable>
          </View>

          {/* Weather Section from Figma */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Météo à 3 jours</Text>
          </View>

          <View style={[styles.weatherCard, { backgroundColor: theme.blueBadge }]}>
            <View style={styles.weatherCardHeader}>
              <Text style={[styles.weatherCity, { color: theme.text }]}>
                {rando.endStation || 'Haute-Savoie, France'}
              </Text>
              <ChevronDown size={24} color={theme.text} />
            </View>

            <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />

            <View style={styles.weatherForecastList}>
              {weatherForecast.map((fc, index) => {
                const WeatherIcon = fc.icon;
                return (
                  <View key={index} style={styles.weatherForecastCol}>
                    <Text style={[styles.weatherDay, { color: theme.text }]}>{fc.day}</Text>
                    <Text style={[styles.weatherDate, { color: theme.textMuted }]}>{fc.date}</Text>
                    <View style={styles.weatherIconWrapper}>
                      <WeatherIcon size={48} color={theme.text} />
                    </View>
                    <Text style={[styles.weatherDesc, { color: theme.text }]}>{fc.desc}</Text>
                    <Text style={[styles.weatherTemp, { color: theme.text }]}>{fc.temp}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Categories Section from Figma */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Catégories</Text>
          </View>
          <View style={styles.categoriesWrapRow}>
            {categories.map((cat, index) => (
              <View key={index} style={[styles.categoryChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.categoryChipText, { color: theme.text }]}>{cat}</Text>
              </View>
            ))}
          </View>

          {/* Reviews Section from Figma */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Avis des randonneurs</Text>
          </View>

          <View style={styles.reviewsSummaryRow}>
            <View style={styles.reviewsSummaryLeft}>
              <Text style={[styles.reviewsLargeScore, { color: theme.text }]}>4,6</Text>
              <Star size={16} color={theme.text} />
            </View>
            <Text style={[styles.reviewsCountUnderline, { color: '#989898' }]}>234 avis</Text>
          </View>

          {/* Write a review Button */}
          <Button
            variant="secondary"
            title="Laisser un avis sur cette randonnée"
            onPress={() => Alert.alert('Laisser un avis', 'Formulaire de notation en cours de développement.')}
            style={[styles.actionBtn, { backgroundColor: theme.card, borderWidth: 0 }]}
            textStyle={{ color: theme.text, fontFamily: 'BricolageGrotesque-Medium', fontSize: 16 }}
          />

          {/* Reviews List */}
          <View style={styles.reviewsListContainer}>
            {reviews.map((rev) => (
              <View key={rev.id} style={[styles.reviewItem, { borderBottomColor: theme.border }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUserRow}>
                    <Image source={{ uri: rev.avatar }} style={styles.reviewAvatar} />
                    <View>
                      <Text style={[styles.reviewUserName, { color: theme.text }]}>{rev.name}</Text>
                      <Text style={[styles.reviewTime, { color: theme.textMuted }]}>{rev.time}</Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        color={theme.text}
                        style={{ marginLeft: 2 }}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.reviewContentText, { color: theme.text }]}>
                  {rev.comment}
                </Text>
              </View>
            ))}
          </View>

          {/* View all reviews Button */}
          <Button
            variant="secondary"
            title="Afficher tous les avis"
            onPress={() => Alert.alert('Tous les avis', 'Affichage de la liste complète des avis.')}
            style={[styles.actionBtn, { backgroundColor: theme.card, borderWidth: 0, marginTop: 24 }]}
            textStyle={{ color: theme.text, fontFamily: 'BricolageGrotesque-Medium', fontSize: 16 }}
          />

        </View>
      </Animated.ScrollView>

      {/* Floating Bottom Booking Section with Double Buttons from Figma */}
      <View
        style={[
          styles.floatingBottom,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <View style={styles.bottomBarButtonsRow}>

          {/* Navigate Button */}
          <Button
            variant="secondary"
            title="Naviguer"
            icon={<Navigation size={20} color={theme.text} />}
            onPress={() => Alert.alert('Navigation', 'Lancement de l’itinéraire GPX vers le point de départ.')}
            style={[styles.bottomBtnSecondary, { backgroundColor: theme.card, borderWidth: 0 }]}
            textStyle={{ color: theme.text, fontFamily: 'BricolageGrotesque-Medium', fontSize: 16 }}
          />

          {/* Plan/Book Button */}
          <Button
            variant="primary"
            title="Planifier"
            icon={<Calendar size={20} color="#efefef" />}
            onPress={() => router.push(`/plan?randoId=${rando.id}`)}
            style={[styles.bottomBtnPrimary, { backgroundColor: theme.primary, borderWidth: 0 }]}
            textStyle={{ color: '#efefef', fontFamily: 'BricolageGrotesque-Medium', fontSize: 16 }}
          />

        </View>
      </View>
    </View>
  );
}

// Visual representation of a GPX trace
function SvgMockTrace() {
  return (
    <View style={styles.svgMockContainer}>
      <View
        style={[
          styles.svgSegment,
          {
            width: 60,
            height: 4,
            transform: [{ rotate: '20deg' }],
            left: 40,
            top: 90,
            backgroundColor: '#FA6415',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 80,
            height: 4,
            transform: [{ rotate: '-45deg' }],
            left: 95,
            top: 75,
            backgroundColor: '#FA6415',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 50,
            height: 4,
            transform: [{ rotate: '60deg' }],
            left: 150,
            top: 70,
            backgroundColor: '#FA6415',
          },
        ]}
      />
      <View
        style={[
          styles.svgSegment,
          {
            width: 70,
            height: 4,
            transform: [{ rotate: '-10deg' }],
            left: 180,
            top: 105,
            backgroundColor: '#FA6415',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
  },
  imageContainer: {
    height: 304,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderIndicator: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 100,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  slideIndicator: {
    height: 16,
    width: '100%',
  },
  contentCard: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  routeType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeTypeText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  ratingCountText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  title: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    lineHeight: 36,
    marginBottom: 8,
  },
  locationSubtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },

  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 40,
    width: '100%',
  },
  specCol: {
    alignItems: 'flex-start',
  },
  specLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    marginBottom: 4,
  },
  specVal: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 40,
    width: '100%',
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
  },
  gpxMap: {
    height: 168,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 40,
  },
  topoGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  topoLine: {
    position: 'absolute',
    borderTopWidth: 1,
  },
  topoLineVertical: {
    position: 'absolute',
    borderLeftWidth: 1,
  },
  gpxTraceContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  svgMockContainer: {
    flex: 1,
    position: 'relative',
  },
  svgSegment: {
    position: 'absolute',
    borderRadius: 2,
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  markerPinText: {
    fontSize: 11,
  },
  markerLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mapMaximizeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  transitContainer: {
    paddingVertical: 12,
    marginBottom: 40,
    width: '100%',
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  stationNodeWrapper: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stationLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stationLabelWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stationType: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  stationName: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  transitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  trainBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trainBadgeText: {
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    fontSize: 10,
  },
  weatherCard: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherCity: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  weatherDivider: {
    height: 1,
    marginVertical: 12,
  },
  weatherForecastList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherForecastCol: {
    flex: 1,
    alignItems: 'center',
  },
  weatherDay: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    height: 20,
  },
  weatherDate: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    height: 16,
    marginBottom: 8,
  },
  weatherIconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  weatherDesc: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    height: 16,
    marginBottom: 4,
  },
  weatherTemp: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    height: 16,
  },
  categoriesWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  categoryChipText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  reviewsLargeScore: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 48,
    lineHeight: 48,
  },
  reviewsCountUnderline: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  actionBtn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  actionBtnText: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 16,
  },
  reviewsListContainer: {
    marginTop: 12,
  },
  reviewItem: {
    borderBottomWidth: 1,
    paddingBottom: 36,
    marginTop: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 53,
    height: 53,
    borderRadius: 100,
  },
  reviewUserName: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  reviewTime: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewContentText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  floatingBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomBarButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  bottomBtnSecondaryText: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 16,
  },
  bottomBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  bottomBtnPrimaryText: {
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#efefef',
    fontSize: 16,
  },
  instructionsContainer: {
    marginTop: 4,
  },
  instructionsTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    marginBottom: 10,
  },
  instructionBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 20,
    marginRight: 8,
  },
  bulletText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  planningPromoLink: {
    paddingVertical: 4,
  },
  planningPromoText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 15,
  },
  transitText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  transitSubtext: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 16,
  },
  headerBarButtonPressable: {
    padding: 4,
  },
});
