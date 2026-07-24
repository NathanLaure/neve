import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  Pressable,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Train,
  MapPin,
  Compass,
  Sparkles,
  CheckCircle2,
  Sun,
  Star,
  Mountain,
  Clock,
  WifiOff,
  Navigation,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';

interface SlideItem {
  id: string;
  imageSource: any;
  title: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const screenWidth = width > 0 ? width : Dimensions.get('window').width;

  const { completeOnboarding } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slides: SlideItem[] = [
    {
      id: '1',
      imageSource: require('@/assets/images/onboarding_train_mountain.png'),
      title: 'Des centaines de randonnées d’exception accessibles en train direct',
    },
    {
      id: '2',
      imageSource: require('@/assets/images/onboarding_forest_gpx.png'),
      title: 'Cartes et tracés GPX 100% hors-ligne pour ne jamais vous perdre',
    },
    {
      id: '3',
      imageSource: require('@/assets/images/onboarding_lake_transit.png'),
      title: 'Horaires de train en direct et trajets Pass Navigo inclus',
    },
    {
      id: '4',
      imageSource: require('@/assets/images/onboarding_adventure_call.png'),
      title: 'Planifiez votre toute première escapade sans voiture dès aujourd’hui',
    },
  ];

  const finishOnboarding = () => {
    completeOnboarding();
    router.push('/(auth)/register');
  };

  // Dedicated custom graphic composition per slide
  const renderSlideGraphic = (slideId: string, imageSource: any) => {
    switch (slideId) {
      case '1':
        // Slide 1: Train Departure Station Widget Composition
        return (
          <View style={styles.visualWrapper}>
            <View style={[styles.visualCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
            </View>

            {/* Train Departure Schedule Overlay Card */}
            <View style={[styles.customOverlayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgePill, { backgroundColor: theme.primary }]}>
                  <Train size={14} color="#FFFFFF" />
                  <Text style={styles.badgePillText}>Train Direct</Text>
                </View>
                <Text style={[styles.durationText, { color: theme.primary }]}>42 min</Text>
              </View>

              <Text style={[styles.stationTitle, { color: theme.text }]}>
                Gare de Lyon ➔ Fontainebleau
              </Text>
              <Text style={[styles.stationSub, { color: theme.textMuted }]}>
                Ligne R · Pass Navigo inclus · Départs toutes les 30 min
              </Text>
            </View>
          </View>
        );

      case '2':
        // Slide 2: GPX Offline Stats & Profile Card Composition
        return (
          <View style={styles.visualWrapper}>
            <View style={[styles.visualCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
              {/* Floating Offline Indicator Chip */}
              <View style={[styles.topChip, { backgroundColor: 'rgba(0,0,0,0.75)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                <WifiOff size={14} color="#4EAE71" />
                <Text style={{ fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#FFFFFF' }}>
                  GPS Hors-Ligne Actif
                </Text>
              </View>
            </View>

            {/* GPX Stats Strip Overlay */}
            <View style={[styles.statsStripCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Dénivelé</Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>+520m D+</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Distance</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>14.2 km</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Durée</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>3h45</Text>
              </View>
            </View>
          </View>
        );

      case '3':
        // Slide 3: Pass Navigo & Countdown Timer Widget Composition
        return (
          <View style={styles.visualWrapper}>
            <View style={[styles.visualCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
            </View>

            {/* Pass Navigo Card Badge */}
            <View style={[styles.navigoBadge, { backgroundColor: '#457B9D' }]}>
              <Compass size={18} color="#FFFFFF" />
              <Text style={styles.navigoBadgeText}>Pass Navigo Inclus · Zone 1-5</Text>
            </View>

            {/* Live Countdown Overlay */}
            <View style={[styles.countdownCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Clock size={18} color={theme.primary} />
              <Text style={[styles.countdownText, { color: theme.text }]}>
                Prochain train dans <Text style={{ color: theme.primary, fontFamily: 'BricolageGrotesque-Bold' }}>12 min</Text> (Quai 3)
              </Text>
            </View>
          </View>
        );

      case '4':
      default:
        // Slide 4: Photo Collage Composition with Overlapping Reviews
        return (
          <View style={styles.visualWrapper}>
            {/* Smaller Central Tilted Photo Frame */}
            <View style={[styles.collagePhotoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
            </View>

            {/* Overlapping Review Card 1 (Top-Right) */}
            <View style={[styles.collageReviewCard, styles.collageCardTopRight, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarText}>SF</Text>
              </View>
              <View style={styles.reviewTextCol}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={10} color="#B07D06" fill="#B07D06" />
                  ))}
                </View>
                <Text style={[styles.reviewQuote, { color: theme.text }]} numberOfLines={1}>
                  « Des rando sans voiture magiques ! »
                </Text>
                <Text style={[styles.reviewAuthor, { color: theme.textMuted }]}>Sophie F. · Randonneuse</Text>
              </View>
            </View>

            {/* Overlapping Review Card 2 (Bottom-Left) */}
            <View style={[styles.collageReviewCard, styles.collageCardBottomLeft, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.reviewAvatar, { backgroundColor: '#457B9D' }]}>
                <Text style={styles.reviewAvatarText}>MR</Text>
              </View>
              <View style={styles.reviewTextCol}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={10} color="#B07D06" fill="#B07D06" />
                  ))}
                </View>
                <Text style={[styles.reviewQuote, { color: theme.text }]} numberOfLines={1}>
                  « Tracé GPX hors-ligne parfait »
                </Text>
                <Text style={[styles.reviewAuthor, { color: theme.textMuted }]}>Marc R. · Hiker Navigo</Text>
              </View>
            </View>

            {/* Overlapping Rating Chip (Bottom-Right) */}
            <View style={[styles.collageRatingChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Star size={14} color="#B07D06" fill="#B07D06" />
              <Text style={[styles.collageRatingText, { color: theme.text }]}>4.9/5 · 1.2k avis</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Main Swarm Slides Horizontal FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: screenWidth }]}>
            {/* Top Text Header Block */}
            <View style={styles.topTextBlock}>
              <Text style={[styles.slideTitle, { color: theme.text }]}>{item.title}</Text>
            </View>

            {/* Unique Visual Composition Per Slide */}
            {renderSlideGraphic(item.id, item.imageSource)}
          </View>
        )}
      />

      {/* Fixed Bottom Action Area */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        {/* Swarm Style Page Indicator Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? theme.primary : theme.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Primary CTA Button */}
        <Button
          title="Commencer"
          variant="primary"
          icon={<ArrowRight size={18} color="#FFFFFF" />}
          iconPosition="right"
          onPress={finishOnboarding}
          style={styles.primaryBtn}
          textStyle={styles.primaryBtnText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTextBlock: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  slideTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.6,
    textAlign: 'left',
  },
  visualWrapper: {
    width: '100%',
    flex: 1,
    maxHeight: 380,
    position: 'relative',
    marginVertical: 4,
  },
  visualCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  // Slide 1 Custom Card Overlay
  customOverlayCard: {
    position: 'absolute',
    bottom: -16,
    left: 12,
    right: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  durationText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
  },
  stationTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 15,
  },
  stationSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  // Slide 2 GPX Custom Overlay
  topChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsStripCard: {
    position: 'absolute',
    bottom: -16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  statValue: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 15,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  // Slide 3 Navigo Custom Overlay
  navigoBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navigoBadgeText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  countdownCard: {
    position: 'absolute',
    bottom: -16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  countdownText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    flex: 1,
  },
  // Slide 4 Photo Collage Composition Styles
  collagePhotoCard: {
    width: '68%',
    height: '76%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  collageReviewCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  collageCardTopRight: {
    top: 10,
    right: 0,
    width: '74%',
  },
  collageCardBottomLeft: {
    bottom: 24,
    left: 0,
    width: '74%',
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EB490B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  reviewTextCol: {
    flex: 1,
    gap: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewQuote: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  reviewAuthor: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
  },
  collageRatingChip: {
    position: 'absolute',
    bottom: -10,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  collageRatingText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 12,
  },
  communityCard: {
    position: 'absolute',
    bottom: -16,
    left: 12,
    right: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingScore: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
  },
  ratingCount: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  communitySubText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    fontStyle: 'italic',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
});
