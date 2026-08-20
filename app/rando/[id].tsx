import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Modal,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Host, Switch } from '@expo/ui';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Share as ShareIcon,
  Heart,
  MoreVertical,
  RefreshCw,
  ArrowLeftRight,
  ArrowRight,
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
  Flag,
  MessageSquareWarning,
  Trash2,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAdventure } from '@/context/AdventureContext';
import { Button } from '@/components/Button';
import ScreenFooter, { useScreenFooterPadding } from '@/components/ScreenFooter';
import Chip from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import Tag from '@/components/Tag';
import Reanimated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import ItemButton from '@/components/ItemButton';
import ToggleRow from '@/components/ToggleRow';
import WeatherIcon, { WeatherIconType } from '@/components/WeatherIcon';
import ExplorerMap, { MapStyleType, ExplorerMapRef } from '@/components/ExplorerMap';
import RandoDetailSkeleton from '@/components/RandoDetailSkeleton';
import { isNavigoAccessible } from '@/services/transitService';
import Toast from 'react-native-toast-message';

/* eslint-disable @typescript-eslint/no-require-imports */
const iosTint = Platform.OS === 'ios' ? require('@expo/ui/swift-ui/modifiers').tint : null;
const AndroidSwitch = Platform.OS === 'android' ? require('@expo/ui/jetpack-compose').Switch : null;
/* eslint-enable @typescript-eslint/no-require-imports */

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export default function RandoDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  // Le footer est en `position: absolute` : il ne prend aucune place dans le flux.
  // C'est ce dégagement qui évite que le dernier bloc de contenu finisse caché
  // dessous — il suit le padding bas du footer, plus la hauteur de sa rangée.
  const scrollBottomClearance = useScreenFooterPadding() + 72;

  const {
    userLocationName,
    userLocation,
    hikes,
    loadHikes,
    loadHikeDetail,
    isLoadingHikes,
    isFavorite: isFavoriteHike,
    toggleFavorite,
    isSavedOffline,
    toggleOffline,
  } = useAdventure();
  const isFavorite = !!id && isFavoriteHike(String(id));
  const isOffline = !!id && isSavedOffline(String(id));

  // Local interactive states
  const [refreshing, setRefreshing] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [hasOpenedMapModal, setHasOpenedMapModal] = useState(false);
  const [fullMapStyle, setFullMapStyle] = useState<MapStyleType>('default');
  const [mapBearing, setMapBearing] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [descriptionLineCount, setDescriptionLineCount] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadHikeDetail(String(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Always paint the lightweight skeleton first, even when the hike's full
  // detail is already cached (e.g. a repeat visit): mounting the heavy tree
  // (images, Mapbox, weather, reviews) synchronously on the very first render
  // blocks the JS thread long enough to stall the push/back transition.
  const [readyToRenderFull, setReadyToRenderFull] = useState(false);

  useEffect(() => {
    setReadyToRenderFull(false);
    // native-stack drives the push/pop animation natively, so it never
    // registers an InteractionManager handle — a fixed delay roughly
    // matching the platform transition duration is what actually keeps
    // the heavy mount from competing with the slide animation for frames.
    const timer = setTimeout(() => {
      setReadyToRenderFull(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [id]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHikes();
    } catch (error) {
      console.warn('Could not refresh hike details:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadHikes]);

  const actionsSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const mapLayerSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const fullMapRef = useRef<ExplorerMapRef>(null);

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  const mapTypes = useMemo(() => {
    return [
      {
        key: 'default' as MapStyleType,
        label: 'Par défaut',
        previewUri:
          colorScheme === 'dark'
            ? 'https://api.mapbox.com/styles/v1/nlaure/cmqeb16wa001u01qn7zxmgncl/static/2.35,48.86,10,0/200x200@2x?access_token='
            : 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/2.35,48.86,10,0/200x200@2x?access_token=',
      },
      {
        key: 'satellite' as MapStyleType,
        label: 'Satellite',
        previewUri:
          'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/2.35,48.86,10,0/200x200@2x?access_token=',
      },
    ];
  }, [colorScheme]);

  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Header background color animation
  const headerBgColor = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [
      colorScheme === 'dark' ? 'rgba(17, 17, 17, 0)' : 'rgba(255, 255, 255, 0)',
      theme.background,
    ],
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

  // Helper for Open-Meteo WMO Weather codes with multi-color icons
  const getWeatherDetails = (code: number): { type: WeatherIconType; desc: string } => {
    if (code === 0) return { type: 'sun', desc: 'Ensoleillé' };
    if (code >= 1 && code <= 3) return { type: 'cloud-sun', desc: 'Éclaircies' };
    if (code === 45 || code === 48) return { type: 'fog', desc: 'Brouillard' };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { type: 'cloud-rain', desc: 'Pluie' };
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { type: 'cloud-snow', desc: 'Neige' };
    if (code >= 95 && code <= 99) return { type: 'cloud-lightning', desc: 'Orage' };
    return { type: 'sun', desc: 'Ensoleillé' };
  };

  const [realWeather, setRealWeather] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    const lat = rando?.start_lat ?? rando?.startStationCoords?.latitude ?? 45.9237;
    const lon = rando?.start_lng ?? rando?.startStationCoords?.longitude ?? 6.8694;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await res.json();

        if (data?.daily?.time && isMounted) {
          const daysLabels = ['Aujourd’hui', 'Demain', 'Après-demain'];
          const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

          const forecast = data.daily.time.slice(0, 3).map((dateStr: string, idx: number) => {
            const dateObj = new Date(dateStr);
            const dayName = dayNames[dateObj.getDay()];
            const dateNum = dateObj.getDate();
            const maxTemp = Math.round(data.daily.temperature_2m_max[idx]);
            const minTemp = Math.round(data.daily.temperature_2m_min[idx]);
            const code = data.daily.weather_code[idx];
            const { type, desc } = getWeatherDetails(code);

            return {
              day: daysLabels[idx] || dayName,
              date: `${dayName} ${dateNum}`,
              type,
              desc,
              temp: `${minTemp}-${maxTemp}℃`,
            };
          });

          setRealWeather(forecast);
        }
      } catch (err) {
        console.warn('Erreur lors du chargement de la météo Open-Meteo:', err);
      }
    };

    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, [rando?.start_lat, rando?.start_lng, rando?.startStationCoords?.latitude, rando?.startStationCoords?.longitude]);

  // Mock weather fallback
  const weatherForecast = realWeather || [
    {
      day: 'Aujourd’hui',
      date: 'Mar 6',
      type: 'sun' as WeatherIconType,
      desc: 'Ensoleillé',
      temp: '15-20℃',
    },
    {
      day: 'Demain',
      date: 'Mer 7',
      type: 'cloud-sun' as WeatherIconType,
      desc: 'Éclaircies',
      temp: '14-18℃',
    },
    {
      day: 'Après-demain',
      date: 'Jeu 8',
      type: 'cloud-rain' as WeatherIconType,
      desc: 'Pluie faible',
      temp: '11-15℃',
    },
  ];

  /*
   * Note réelle de la randonnée, ou rien.
   *
   * Cet écran affichait auparavant trois témoignages inventés — noms et photos
   * de banque d'images — sous une note « 4,6 » figée et un nombre d'avis tiré du
   * premier caractère de l'identifiant. C'était du remplissage de maquette, mais
   * publié tel quel ce sont de faux avis : trompeur pour le randonneur, et motif
   * de retrait chez Google au titre de la fausse déclaration.
   *
   * `rating_avg` et `rating_count` viennent de la base et valent zéro tant que
   * personne n'a noté. Tant que la table `hike_comments` n'est alimentée par
   * aucun écran, c'est donc l'état vide qui s'affiche — ce qui est la vérité.
   */
  const ratingCount = rando?.ratingCount ?? 0;
  const ratingAvg = rando?.ratingAvg ?? 0;
  const hasReviews = ratingCount > 0 && ratingAvg > 0;
  /** Virgule décimale : une note se lit « 4,6 » en français, pas « 4.6 ». */
  const ratingLabel = ratingAvg.toFixed(1).replace('.', ',');

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

  const gallery = useMemo(() => {
    if (rando?.galleryUrls && rando.galleryUrls.length > 0) {
      return rando.galleryUrls;
    }
    return rando?.imageUrl ? [rando.imageUrl] : [];
  }, [rando]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleGalleryScroll = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const width = Dimensions.get('window').width || 375;
    const index = Math.round(contentOffsetX / width);
    setActiveImageIndex(index);
  };

  if (isLoadingHikes) {
    return <RandoDetailSkeleton />;
  }

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

  if (!rando.hasFullDetail || !readyToRenderFull) {
    return <RandoDetailSkeleton />;
  }

  const getRouteTypeInfo = (routeType?: string) => {
    switch (routeType) {
      case 'aller_retour':
        return { label: 'Aller-retour', Icon: ArrowLeftRight };
      case 'point_a_point':
        return { label: 'Point à point', Icon: ArrowRight };
      case 'boucle':
      default:
        return { label: 'Boucle', Icon: RefreshCw };
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

  return (
    <Reanimated.View entering={FadeIn.duration(180)} style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Floating Animated Header Bar */}
      <Animated.View
        style={[
          styles.headerOverlay,
          {
            paddingTop: insets.top + 8,
            backgroundColor: headerBgColor,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
            top: 0,
            zIndex: 10,
          },
        ]}>
        {/* Pastille claire dans les deux thèmes, `Colors.light` et non `theme` :
            même règle que les retours de la planification. Le bouton se pose sur
            la photo de la rando, dont le fond ne suit pas le réglage de
            l'appareil. Partage, favori et options, eux, basculent. */}
        <IconButton
          variant="circle"
          icon={<ArrowLeft size={20} color={Colors.light.buttonIconColor} />}
          style={{ backgroundColor: Colors.light.buttonBgIcon }}
          onPress={() => router.back()}
        />

        <Animated.Text
          style={[{ fontFamily: 'BricolageGrotesque-SemiBold', fontSize: 16, flex: 1, textAlign: 'center', marginHorizontal: 12 }, { color: theme.text, opacity: headerTitleOpacity }]}
          numberOfLines={1}>
          {rando.title}
        </Animated.Text>

        <View style={styles.headerRight}>
          {/* Extra buttons: fade OUT on scroll */}
          <Animated.View
            style={[styles.headerRight, { opacity: extraButtonsOpacity }]}
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
              onPress={() => id && toggleFavorite(String(id))}
            />
          </Animated.View>

          {/* Options button: stays present */}
          <IconButton
            variant="circle"
            icon={<MoreVertical size={20} color={theme.text} />}
            onPress={() => actionsSheetRef.current?.present()}
          />
        </View>
      </Animated.View>

      {/* Fixed Header Image Carousel behind ScrollView */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleGalleryScroll}
          scrollEventThrottle={16}>
          {gallery.map((imgUrl, idx) => (
            <Image
              key={`gallery-img-${idx}`}
              source={{ uri: imgUrl }}
              style={[styles.image, { width: Dimensions.get('window').width }]}
            />
          ))}
        </ScrollView>
        <View style={styles.imageGradientOverlay} pointerEvents="none" />

        {/* Dynamic Dots Indicator overlay */}
        {gallery.length > 1 && (
          <View style={styles.sliderIndicator} pointerEvents="none">
            {gallery.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[
                  styles.dot,
                  idx === activeImageIndex
                    ? styles.dotActive
                    : { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={['#FA6415', '#EB490B']}
            progressViewOffset={60}
          />
        }
        contentContainerStyle={{ paddingBottom: scrollBottomClearance }}>

        {/* Transparent Spacer to reveal the fixed image underneath */}
        <View style={{ height: 380 }} />

        {/* Bottom Sheet Card Style Body */}
        <View style={[styles.sheetContainer, { backgroundColor: theme.card }]}>

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
                  {(() => {
                    const { label, Icon } = getRouteTypeInfo(rando.routeType);
                    return (
                      <>
                        <Icon size={16} color={theme.text} />
                        <Text style={[styles.routeTypeText, { color: theme.text }]}>{label}</Text>
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Rien plutôt qu'une note inventée : une randonnée que personne
                  n'a encore notée n'a pas de note à montrer. */}
              {hasReviews ? (
                <View style={styles.ratingRow}>
                  <Star size={12} color={theme.text} fill={theme.text} />
                  <Text style={[styles.ratingText, { color: theme.text }]}>
                    {ratingLabel}{' '}
                    <Text style={[styles.ratingCountText, { color: theme.textMuted }]}>
                      ({ratingCount})
                    </Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Hike Main Title */}
            <Text style={[styles.title, { color: theme.text }]}>{rando.title}</Text>

            {/* Geo Location */}
            {/* Gare de départ : c'est celle qu'on doit rejoindre pour attaquer
                la rando, pas celle d'où l'on repart. */}
            <Text style={[styles.locationSubtitle, { color: theme.textMuted }]}>
              {rando.startStation ? `${rando.startStation}, France` : 'Île-de-France, France'}
            </Text>

            {/* Description Description */}
            <Text
              style={[styles.description, { color: theme.text }]}
              numberOfLines={descriptionLineCount === null || isDescriptionExpanded ? undefined : 3}
              onTextLayout={(e) => {
                if (descriptionLineCount === null) {
                  setDescriptionLineCount(e.nativeEvent.lines.length);
                }
              }}>
              {rando.description}
            </Text>

            {descriptionLineCount !== null && descriptionLineCount > 3 && (
              <Pressable
                onPress={() => setIsDescriptionExpanded((v) => !v)}
                style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <Text style={[styles.descriptionToggle, { color: theme.tint }]}>
                  {isDescriptionExpanded ? 'Afficher moins' : 'Afficher plus'}
                </Text>
              </Pressable>
            )}

            {/* Navigo Sticker — la gare de départ appartient-elle au réseau
                francilien ? Le champ `trainType` qui décidait ici ne vient
                d'aucune colonne : il retombait toujours sur « Transilien / RER »
                et n'a donc jamais laissé passer le badge. */}
            {isNavigoAccessible(rando.startStationCoords) ? (
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
                {formatHikeDuration(rando.durationHours)}
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

          {/* Offline Toggle row */}
          <ToggleRow
            title="Conserver hors ligne"
            icon={<Download size={24} color={theme.text} />}
            value={isOffline}
            onValueChange={async (val: boolean) => {
              if (id) {
                await toggleOffline(String(id), val);
              }
              if (val) {
                Toast.show({
                  type: 'success',
                  text1: 'Enregistrée hors ligne',
                  text2: 'Randonnée et tracé GPX disponibles sans connexion.',
                });
              } else {
                Toast.show({
                  type: 'info',
                  text1: 'Sauvegarde supprimée',
                  text2: 'La randonnée a été retirée de votre stockage local.',
                });
              }
            }}
            backgroundColor={theme.transparent}
            style={{ marginBottom: 40, paddingVertical: 8, paddingHorizontal: 4 }}
          />

          {/* GPX Map Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Carte du parcours</Text>
          </View>

          <View style={styles.inlineMapCardContainer}>
            <ExplorerMap
              // La vraie position de l'utilisateur, pas celle de la rando : le
              // marqueur « vous êtes ici » doit dire où l'on est. Le cadrage sur
              // la rando vient de `selectedHikeId`.
              userLocation={userLocation}
              userLocationName={userLocationName}
              hikes={[rando]}
              selectedHikeId={rando?.id || null}
              showGpxTrace={true}
              style={styles.inlineMapStyle}
            />

            {/* Floating Maximize Button in Top-Right */}
            <Pressable
              onPress={() => {
                setHasOpenedMapModal(true);
                setIsMapModalVisible(true);
              }}
              style={[styles.mapMaximizeBtn, { backgroundColor: theme.card }]}>
              <Maximize2 size={16} color={theme.text} />
            </Pressable>
          </View>

          {/* Transport Info Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Comment s'y rendre</Text>
          </View>

          <View style={styles.transitContainer}>
            {/* Une boucle part et revient à la même gare ; un point à point non,
                et annoncer une seule gare y ferait rater le trajet de retour. */}
            {rando.endStation && rando.endStation !== rando.startStation ? (
              <Text style={[styles.transitText, { color: theme.text }]}>
                Cette randonnée commence à proximité de la gare de{' '}
                <Text style={{ fontFamily: 'Satoshi-Bold' }}>{rando.startStation}</Text> et se
                termine à proximité de la gare de{' '}
                <Text style={{ fontFamily: 'Satoshi-Bold' }}>{rando.endStation}</Text>.
              </Text>
            ) : (
              <Text style={[styles.transitText, { color: theme.text }]}>
                Cette randonnée commence et se termine à proximité de la gare de{' '}
                <Text style={{ fontFamily: 'Satoshi-Bold' }}>
                  {rando.startStation || 'Station Nature'}
                </Text>
                .
              </Text>
            )}

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
              {/* La météo est relevée sur `start_lat`/`start_lng` : le libellé
                  doit désigner le même endroit, donc la gare de départ. */}
              <Text style={[styles.weatherCity, { color: theme.text }]}>
                {rando.location || rando.startStation || 'Île-de-France, France'}
              </Text>
              <ChevronRight size={24} color={theme.text} />
            </View>

            <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />

            <View style={styles.weatherForecastList}>
              {weatherForecast.map((fc, index) => {
                return (
                  <View key={index} style={styles.weatherForecastCol}>
                    <Text style={[styles.weatherDay, { color: theme.text }]}>{fc.day}</Text>
                    <Text style={[styles.weatherDate, { color: theme.textMuted }]}>{fc.date}</Text>
                    <View style={styles.weatherIconWrapper}>
                      <WeatherIcon type={fc.type} size={48} />
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
              <Chip key={index} text={cat} size="small" />
            ))}
          </View>

          {/* Reviews Section from Figma */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Avis des randonneurs</Text>
          </View>

          {hasReviews ? (
            <View style={[styles.reviewsSummaryRow, { marginBottom: 24 }]}>
              <View style={styles.reviewsSummaryLeft}>
                <Text style={[styles.reviewsLargeScore, { color: theme.text }]}>{ratingLabel}</Text>
                <Star size={20} color={theme.text} fill={theme.text} style={{ marginBottom: 7 }} />
              </View>
              <Text style={[styles.reviewsCountUnderline, { color: theme.textMuted }]}>
                {ratingCount} avis
              </Text>
            </View>
          ) : (
            /* Aucun avis : on le dit. La liste des avis se remplira quand les
               randonneurs pourront en déposer — pas avant. */
            <Text style={[styles.reviewsEmptyText, { color: theme.textMuted }]}>
              Aucun avis pour l’instant. Sois le premier à raconter cette randonnée.
            </Text>
          )}

          {/* Write a review Button */}
          <Button
            variant="tertiary"
            title="Laisser un avis sur cette randonnée"
            onPress={() => Alert.alert('Laisser un avis', 'Formulaire de notation en cours de développement.')}
          />

        </View>
      </Animated.ScrollView>

      {/* Floating Bottom Booking Section with Double Buttons from Figma */}
      <ScreenFooter row>

        {/* Navigate Button */}
        <Button
          variant="secondary"
          title="Naviguer"
          icon={<Navigation/>}
          onPress={() => Alert.alert('Navigation', 'Lancement de l’itinéraire GPX vers le point de départ.')}
          style={{ flex: 1 }}
        />

        {/* Plan/Book Button */}
        <Button
          variant="primary"
          title="Planifier"
          icon={<Calendar/>}
          onPress={() => router.push(`/plan?randoId=${rando.id}`)}
          style={{ flex: 1 }}
        />

      </ScreenFooter>

      {/* Actions Bottom Sheet Modal (Figma node 424:5042) */}
      <BaseBottomSheetModal
        ref={actionsSheetRef}>
        <View style={styles.actionsOptionsList}>
          {/* Item 1: Partager la randonnée */}
          <ItemButton
            icon={<ShareIcon size={20} color={theme.text} />}
            label="Partager la randonnée"
            onPress={() => {
              actionsSheetRef.current?.dismiss();
              handleShare();
            }}
          />

          {/* Item 2: Ajouter aux favoris */}
          <ItemButton
            icon={
              <Heart
                size={20}
                color={isFavorite ? '#EF4444' : theme.text}
                fill={isFavorite ? '#EF4444' : 'none'}
              />
            }
            label="Ajouter aux favoris"
            onPress={() => {
              actionsSheetRef.current?.dismiss();
              if (id) toggleFavorite(String(id));
            }}
          />

          {/* Item 3: Rendre disponible hors connexion */}
          <ItemButton
            icon={isOffline ? <Trash2 size={20} color={theme.text} /> : <Download size={20} color={theme.text} />}
            label={isOffline ? 'Supprimer la sauvegarde locale' : 'Rendre disponible hors connexion'}
            onPress={async () => {
              actionsSheetRef.current?.dismiss();
              if (id) {
                const nextState = await toggleOffline(String(id));
                if (nextState) {
                  Toast.show({
                    type: 'success',
                    text1: 'Enregistrée hors ligne',
                    text2: 'Randonnée et tracé GPX disponibles sans connexion.',
                  });
                } else {
                  Toast.show({
                    type: 'info',
                    text1: 'Sauvegarde supprimée',
                    text2: 'La randonnée a été retirée de votre stockage local.',
                  });
                }
              }
            }}
          />

          <View style={[styles.actionsDivider, { backgroundColor: theme.border }]} />

          {/* Item 4: Signaler une anomalie */}
          <ItemButton
            icon={<MessageSquareWarning size={20} color="#E0633B" />}
            label="Signaler une anomalie"
            color="#E0633B"
            onPress={() => {
              actionsSheetRef.current?.dismiss();
              Alert.alert(
                'Signaler une anomalie',
                'Merci de nous aider à maintenir les informations de randonnées à jour.'
              );
            }}
          />
        </View>
      </BaseBottomSheetModal>

      {/* Fullscreen Interactive Map Modal */}
      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsMapModalVisible(false)}>
        {hasOpenedMapModal && (
        <BottomSheetModalProvider>
          <View style={[styles.fullMapContainer, { backgroundColor: theme.background }]}>
            <ExplorerMap
              ref={fullMapRef}
              userLocation={userLocation}
              userLocationName={userLocationName}
              hikes={[rando]}
              selectedHikeId={rando?.id || null}
              showGpxTrace={true}
              mapStyle={fullMapStyle}
              onBearingChange={setMapBearing}
            />

            {/* Fullscreen Map Floating Header */}
            <View
              style={[
                styles.fullMapHeader,
                {
                  paddingTop: Math.max(insets.top + 8, 20),
                  backgroundColor: colorScheme === 'dark' ? 'rgba(27,27,27,0.92)' : 'rgba(255,255,255,0.92)',
                  borderBottomColor: theme.border,
                },
              ]}>
              <Pressable
                onPress={() => setIsMapModalVisible(false)}
                style={[styles.fullMapBackBtn, { backgroundColor: theme.card }]}>
                <ArrowLeft size={22} color={theme.text} />
              </Pressable>

              <View style={styles.fullMapTitleCol}>
                <Text style={[styles.fullMapTitle, { color: theme.text }]} numberOfLines={1}>
                  {rando.title}
                </Text>
                <Text style={[styles.fullMapSubtitle, { color: theme.textMuted }]}>
                  {rando.distance} • {rando.elevation} • {rando.durationHours}h
                </Text>
              </View>

              <Pressable
                onPress={() => mapLayerSheetRef.current?.present()}
                style={[styles.fullMapLayerBtn, { backgroundColor: theme.card }]}>
                <Layers size={20} color={theme.text} />
              </Pressable>
            </View>

            {/* Compass / Reset North floating button */}
            {mapBearing !== 0 && (
              <Pressable
                onPress={() => fullMapRef.current?.resetNorth()}
                style={[
                  styles.fullMapCompassBtn,
                  { backgroundColor: theme.card, bottom: insets.bottom + 24 },
                ]}>
                <Navigation
                  size={22}
                  color={theme.primary}
                  style={{ transform: [{ rotate: `${-mapBearing}deg` }] }}
                />
              </Pressable>
            )}

            {/* Map Layer Selector Sheet */}
            <BaseBottomSheetModal
              ref={mapLayerSheetRef}
              snapPoints={['30%']}
              title="Type de carte"
              showCloseButton={true}>
              <View style={styles.layerOptionsList}>
                {mapTypes.map((mapType) => {
                  const isSelected = fullMapStyle === mapType.key;
                  return (
                    <Pressable
                      key={mapType.key}
                      onPress={() => {
                        setFullMapStyle(mapType.key);
                        mapLayerSheetRef.current?.dismiss();
                      }}
                      style={styles.layerOptionItem}>
                      <View
                        style={[
                          styles.layerPreviewContainer,
                          isSelected && {
                            borderColor: theme.tint,
                            borderWidth: 2,
                          },
                          !isSelected && {
                            borderColor: theme.border,
                            borderWidth: 1,
                          },
                        ]}>
                        <Image
                          source={{ uri: mapType.previewUri + mapboxToken }}
                          style={styles.layerPreviewImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text
                        style={[
                          styles.layerOptionLabel,
                          { color: isSelected ? theme.text : theme.textMuted },
                        ]}>
                        {mapType.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </BaseBottomSheetModal>
          </View>
        </BottomSheetModalProvider>
        )}
      </Modal>
    </Reanimated.View>
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
    height: 400,
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
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
    marginBottom: 40,
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
  descriptionToggle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },

  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
  reviewsEmptyText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
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
  /* Les styles de la liste d'avis sont partis avec elle. Ils reviendront le jour
     où de vrais avis s'afficheront — les recopier depuis l'historique coûtera
     moins cher que de laisser traîner un décor sans pièce à jouer. */
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
  actionsOptionsList: {
    width: '100%',
    gap: 4,
    paddingTop: 8,
  },
  actionsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actionsOptionText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  actionsDivider: {
    height: 1,
    marginVertical: 8,
  },
  inlineMapCardContainer: {
    height: 220,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 40,
  },
  inlineMapStyle: {
    width: '100%',
    height: '100%',
  },
  fullMapContainer: {
    flex: 1,
    position: 'relative',
  },
  fullMapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  fullMapBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapTitleCol: {
    flex: 1,
  },
  fullMapTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 17,
  },
  fullMapSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    marginTop: 2,
  },
  fullMapLayerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapCompassBtn: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  layerOptionsList: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
  },
  layerOptionItem: {
    alignItems: 'center',
    gap: 8,
  },
  layerPreviewContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  layerPreviewImage: {
    width: '100%',
    height: '100%',
  },
  layerOptionLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
});
