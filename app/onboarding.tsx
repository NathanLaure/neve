import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  Pressable,
  useWindowDimensions,
  Image,
  Animated,

} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft } from 'lucide-react-native';

import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';

interface SlideItem {
  id: string;
  imageSource: any;
  title: string;
  subtitle: string;
  bgColor: string;
  targetRotationDeg: number; // numeric degrees for smooth interpolation
  rotationStr: string;
  imageZoomScale?: number;
}

interface SlideCardProps {
  item: SlideItem;
  index: number;
  isActive: boolean;
  screenWidth: number;
  theme: any;
  colorScheme: string;
  onPrev: () => void;
  onNext: () => void;
  isLastSlide: boolean;
}

function SlideCard({
  item,
  index,
  isActive,
  screenWidth,
  theme,
  colorScheme,
  onPrev,
  onNext,
  isLastSlide,
}: SlideCardProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      animValue.setValue(0);
      Animated.spring(animValue, {
        toValue: 1,
        tension: 45,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [isActive, animValue]);

  // Interpolate rotation: starts at 0deg and rotates into target angle (e.g., -4.06deg) on entry
  const rotateInterpolation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${item.targetRotationDeg}deg`],
  });

  // Interpolate scale: subtle pop scale from 0.92 to 1
  const scaleInterpolation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  // Interpolate opacity
  const opacityInterpolation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={[styles.slideWrapper, { width: screenWidth }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: item.bgColor,
          },
        ]}>
        {/* Header Text Container */}
        <View style={styles.textContainer}>
          <Text style={[styles.cardTitle, { color: '#222222' }]}>
            {item.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: '#525252' }]}>
            {item.subtitle}
          </Text>
        </View>

        {/* Animated Image Illustration Frame with Entry Rotation Animation */}
        <View style={styles.imageOuterFlex}>
          <Animated.View
            style={[
              styles.imageRotatedFrame,
              {
                opacity: opacityInterpolation,
                transform: [
                  { scale: scaleInterpolation },
                  { rotate: rotateInterpolation },
                ],
                borderColor: theme.text,
                backgroundColor: theme.text,
              },
            ]}>
            <View style={styles.imageInnerClip}>
              <Image
                source={item.imageSource}
                style={[
                  styles.cardImage,
                  item.imageZoomScale ? { transform: [{ scale: item.imageZoomScale }] } : null,
                ]}
                resizeMode="cover"
              />
            </View>
          </Animated.View>
        </View>

        {/* Flèches de navigation de la carte.

            Mêmes couleurs figées que « Commencer gratuitement », qui est un
            `secondary` forcé en `colorScheme="light"` : pastille sombre, contenu
            blanc. Elles se posent sur l'aplat coloré de la diapositive, dont la
            teinte ne suit pas le thème — `theme.background` les faisait
            disparaître en sombre, et ne décrivait de toute façon pas la surface
            sur laquelle elles reposent.

            Les deux flèches vont ensemble : une paire dépareillée serait pire que
            le défaut d'origine. */}
        <View style={styles.cardNavRow}>
          {index > 0 ? (
            <IconButton
              icon={<ArrowLeft size={22} color={Colors.light.buttonSecondaryText} />}
              variant="circle"
              onPress={onPrev}
              style={{ backgroundColor: Colors.light.buttonSecondary }}
            />
          ) : null}

          {!isLastSlide ? (
            <IconButton
              icon={<ArrowRight size={22} color={Colors.light.buttonSecondaryText} />}
              variant="circle"
              onPress={onNext}
              style={{ backgroundColor: Colors.light.buttonSecondary }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const screenWidth = width > 0 ? width : Dimensions.get('window').width;

  const { completeOnboarding } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;



  const slides: SlideItem[] = [
    {
      id: '1',
      title: 'La rando, à portée de train',
      subtitle: "Une sélection exclusive d'itinéraires accessibles uniquement en transports en commun.",
      bgColor: '#D0E1EC',
      targetRotationDeg: -4.06,
      rotationStr: '-4.06deg',
      imageSource: require('@/assets/images/onboarding_slide1_lake.jpg'),
    },
    {
      id: '2',
      title: "L'esprit libre, même sans réseau",
      subtitle: 'Embarquez vos cartes topographiques et vos tracés GPX hors-ligne pour garder le cap sur tous les sentiers.',
      bgColor: '#DAEAD7',
      targetRotationDeg: 3.66,
      rotationStr: '3.66deg',
      imageSource: require('@/assets/images/onboarding_slide2_map.jpg'),
    },
    {
      id: '3',
      title: 'Vos trajets synchronisés en temps réel',
      subtitle: 'Horaires des lignes, correspondances et alertes réseau centralisés dans une seule interface.',
      bgColor: '#F7E9D7',
      targetRotationDeg: -2.5,
      rotationStr: '-2.5deg',
      imageSource: require('@/assets/images/onboarding_slide3_phone.jpg'),
      imageZoomScale: 1.7,
    },
    {
      id: '4',
      title: 'Le grand air commence ici',
      subtitle: 'Configurez vos préférences et partez immédiatement à la découverte des plus beaux panoramas.',
      bgColor: '#E9EAEF',
      targetRotationDeg: 6.04,
      rotationStr: '6.04deg',
      imageSource: require('@/assets/images/onboarding_slide4_panorama.jpg'),
    },
  ];

  const [isAutoPlayUserPaused, setIsAutoPlayUserPaused] = useState(false);

  const pauseAutoPlay = () => {
    setIsAutoPlayUserPaused(true);
  };

  // Smart Auto-Advance Timer (Option B: 10s interval, pauses on user drag/interaction)
  useEffect(() => {
    if (isAutoPlayUserPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex < slides.length - 1) {
          const nextIndex = prevIndex + 1;
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          return nextIndex;
        } else {
          setIsAutoPlayUserPaused(true);
          return prevIndex;
        }
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [isAutoPlayUserPaused, slides.length]);

  const finishOnboarding = () => {
    pauseAutoPlay();
    completeOnboarding();
    router.push('/(auth)/register');
  };

  const handleNext = () => {
    pauseAutoPlay();
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      finishOnboarding();
    }
  };

  const handlePrev = () => {
    pauseAutoPlay();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  const activeCardBg = slides[currentIndex].bgColor;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top + 16, 44),
          paddingBottom: Math.max(insets.bottom + 16, 34),
        },
      ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} animated />
      {/* Cards Swiper */}
      <View style={styles.swiperContainer}>
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onScrollBeginDrag={pauseAutoPlay}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentIndex(index);
          }}
          renderItem={({ item, index }) => (
            <SlideCard
              item={item}
              index={index}
              isActive={index === currentIndex}
              screenWidth={screenWidth}
              theme={theme}
              colorScheme={colorScheme}
              onPrev={handlePrev}
              onNext={handleNext}
              isLastSlide={index === slides.length - 1}
            />
          )}
        />
      </View>

      {/* Bottom Fixed Toolbar Container */}
      <View
        style={[
          styles.toolbarCard,
          {
            backgroundColor: activeCardBg,
          },
        ]}>
        <Button
          title="Commencer gratuitement"
          colorScheme="light"
          variant="secondary"
          onPress={finishOnboarding}
          style={styles.ctaButton}
        />

        {/* Animated Stretching Worm Pagination Pill */}
        <View style={styles.paginationRow}>
          {slides.map((_, idx) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [
                (idx - 1) * screenWidth,
                (idx - 0.5) * screenWidth,
                idx * screenWidth,
                (idx + 0.5) * screenWidth,
                (idx + 1) * screenWidth,
              ],
              outputRange: [8, 20, 32, 20, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange: [
                (idx - 1) * screenWidth,
                idx * screenWidth,
                (idx + 1) * screenWidth,
              ],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={idx}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: '#222222',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  swiperContainer: {
    flex: 1,
    marginHorizontal: -20,
    marginBottom: 16,
  },
  slideWrapper: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'visible',
  },
  textContainer: {
    gap: 10,
    marginTop: 8,
    zIndex: 2,
  },
  cardTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 40,
    lineHeight: 38,
  },
  cardSubtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  imageOuterFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  imageRotatedFrame: {
    width: '106%',
    height: '94%',
    borderRadius: 20,
    borderWidth: 2.5,
    borderBottomWidth: 6.5,
    borderRightWidth: 6.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  imageInnerClip: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    zIndex: 2,
  },
  arrowCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 28,
  },
  inactiveDot: {
    width: 8,
  },
});
