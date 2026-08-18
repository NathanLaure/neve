import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Dimensions,
  Image,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import RandoCard from '@/components/RandoCard';
import { useAdventure } from '@/context/AdventureContext';
import {
  IMMERSIVE_ANIMATION,
  useImmersiveProgress,
  useMapImmersiveMode,
} from '@/context/MapImmersiveContext';
import { type RandoData } from '@/constants/RandosData';
import ExplorerMap, { type ExplorerMapRef, type BoundingBox } from '@/components/ExplorerMap';
import { setPreference, usePreferences } from '@/utils/preferences';
import GlobalSearchbar from '@/components/GlobalSearchbar';
import MapControls from '@/components/MapControls';
import HikesBottomSheet, { type HikesBottomSheetRef } from '@/components/HikesBottomSheet';
import FiltersBottomSheet, { type FiltersBottomSheetRef } from '@/components/FiltersBottomSheet';
import RadiusBottomSheet, { type RadiusBottomSheetRef } from '@/components/RadiusBottomSheet';
import FilterChipsBar from '@/components/FilterChipsBar';
import Fab from '@/components/Fab';
import { MAP_CHIPS_BAR_GAP, MAP_CHIPS_BAR_HEIGHT } from '@/components/MapChipsBar';
import { useBottomChromeHideDistance, useTabBarHeight } from '@/components/TabBar';
import { useHikeTraces } from '@/components/useHikeTraces';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type MapStyleType = 'default' | 'satellite';

// Simulated stations for manual toggling
const SIMULATED_LOCATIONS = [
  { name: 'Montparnasse', latitude: 48.8412, longitude: 2.3201 },
  { name: 'Gare de Lyon', latitude: 48.8443, longitude: 2.3744 },
  { name: "Gare de l'Est", latitude: 48.8762, longitude: 2.3584 },
];

const formatHikeDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export default function ExplorerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<ExplorerMapRef>(null);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;
  const cardWidth = screenWidth > 0 ? screenWidth - 48 : 320;

  const {
    userLocation,
    userLocationName,
    isLocating,
    refreshUserLocation,
    setUserLocationManually,
    getTransitInfo,
    hikes,
    filteredHikes,
    isLoadingHikes,
    searchQuery,
    selectedDifficulties,
    maxTrainDuration,
    maxDistance,
    maxElevation,
    dogsAllowed,
    kidsFriendly,
    selectedActivityTypes,
    selectedPointsOfInterest,
    searchRadiusKm,
    setSearchRadiusKm,
    isMapAreaActive,
    setMapSearchArea,
    clearAllFilters,
    ensureHikesRadius,
  } = useAdventure();

  const [selectedHikeId, setSelectedHikeId] = useState<string | null>(null);
  const { isImmersive, toggleImmersive, exitImmersive } = useMapImmersiveMode();
  const carouselRef = useRef<FlatList<RandoData>>(null);
  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [showSimulator] = useState<boolean>(false);
  const bottomSheetRef = useRef<HikesBottomSheetRef>(null);
  const filtersSheetRef = useRef<FiltersBottomSheetRef>(null);
  const radiusSheetRef = useRef<RadiusBottomSheetRef>(null);
  const layerSheetRef = useRef<BaseBottomSheetModalRef>(null);
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  const mapTypes = React.useMemo(() => {
    const defaultPreviewStyle =
      colorScheme === 'dark' ? 'nlaure/cmqeb16wa001u01qn7zxmgncl' : 'mapbox/outdoors-v12';

    return [
      {
        key: 'default' as MapStyleType,
        label: 'Par défaut',
        previewUri: `https://api.mapbox.com/styles/v1/${defaultPreviewStyle}/static/2.35,48.86,10,0/200x200@2x?access_token=`,
      },
      {
        key: 'satellite' as MapStyleType,
        label: 'Satellite',
        previewUri:
          'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/2.35,48.86,10,0/200x200@2x?access_token=',
      },
    ];
  }, [colorScheme]);

  useFocusEffect(
    useCallback(() => {
      // Reset selected hike so global map restores overview
      setSelectedHikeId(null);
    }, [])
  );

  /* Le fond de carte est une préférence de l'appareil et non un état d'écran :
     le choisir ici le retient, et l'écran de résultats ouvre sur le même. */
  const { mapStyle } = usePreferences();
  const setMapStyle = (style: MapStyleType) => setPreference('mapStyle', style);

  const compassBearing = useSharedValue(0);
  const [showSearchInAreaBtn, setShowSearchInAreaBtn] = useState(false);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [pendingSearchCenter, setPendingSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingSearchZoom, setPendingSearchZoom] = useState<number>(10);
  const [pendingSearchBounds, setPendingSearchBounds] = useState<BoundingBox | null>(null);
  const [mapAreaCenter, setMapAreaCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapAreaZoom, setMapAreaZoom] = useState<number | null>(null);
  const [mapAreaBounds, setMapAreaBounds] = useState<BoundingBox | null>(null);

  const lastSearchedCoordsRef = useRef<{ latitude: number; longitude: number }>({
    latitude: userLocation?.latitude ?? 48.8566,
    longitude: userLocation?.longitude ?? 2.3522,
  });
  const lastSearchedZoomRef = useRef<number>(10);

  const geoScopedHikes = useMemo(() => {
    if (!isMapAreaActive) {
      const activeRadius = searchRadiusKm ?? 5;
      return hikes.filter((rando) => {
        const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
        const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
        const dist = calculateDistanceKm(
          userLocation?.latitude ?? 48.8566,
          userLocation?.longitude ?? 2.3522,
          randoLat,
          randoLng
        );
        return dist <= activeRadius;
      });
    }

    if (!mapAreaCenter && !mapAreaBounds) return hikes;

    if (mapAreaBounds) {
      return hikes.filter((rando) => {
        const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
        const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
        return (
          randoLat >= mapAreaBounds.swLat &&
          randoLat <= mapAreaBounds.neLat &&
          randoLng >= mapAreaBounds.swLng &&
          randoLng <= mapAreaBounds.neLng
        );
      });
    }

    let radius = 60;
    if (mapAreaZoom != null) {
      if (mapAreaZoom >= 15) radius = 3;
      else if (mapAreaZoom >= 14) radius = 6;
      else if (mapAreaZoom >= 13) radius = 12;
      else if (mapAreaZoom >= 12) radius = 22;
      else if (mapAreaZoom >= 11) radius = 40;
      else if (mapAreaZoom >= 10) radius = 70;
      else radius = 120;
    } else if (searchRadiusKm !== null) {
      radius = searchRadiusKm;
    }

    return hikes.filter((rando) => {
      const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
      const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
      const dist = calculateDistanceKm(
        mapAreaCenter!.latitude,
        mapAreaCenter!.longitude,
        randoLat,
        randoLng
      );
      return dist <= radius;
    });
  }, [hikes, mapAreaCenter, mapAreaBounds, mapAreaZoom, searchRadiusKm, isMapAreaActive, userLocation]);

  const filteredRandos = useMemo(() => {
    // An explicit radius picked from the chip (or "Position actuelle" defaulting to 5 km)
    // filters hikes around the user's location when map area search is inactive.
    if (!isMapAreaActive) {
      const activeRadius = searchRadiusKm ?? 5;
      return filteredHikes.filter((rando) => {
        const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
        const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
        const dist = calculateDistanceKm(
          userLocation?.latitude ?? 48.8566,
          userLocation?.longitude ?? 2.3522,
          randoLat,
          randoLng
        );
        return dist <= activeRadius;
      });
    }

    if (!mapAreaCenter && !mapAreaBounds) return filteredHikes;

    if (mapAreaBounds) {
      // Strict screen bounding box filtering!
      return filteredHikes.filter((rando) => {
        const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
        const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
        return (
          randoLat >= mapAreaBounds.swLat &&
          randoLat <= mapAreaBounds.neLat &&
          randoLng >= mapAreaBounds.swLng &&
          randoLng <= mapAreaBounds.neLng
        );
      });
    }

    // Fallback: calculate dynamic radius based on map zoom level
    let radius = 60;
    if (mapAreaZoom != null) {
      if (mapAreaZoom >= 15) radius = 3;
      else if (mapAreaZoom >= 14) radius = 6;
      else if (mapAreaZoom >= 13) radius = 12;
      else if (mapAreaZoom >= 12) radius = 22;
      else if (mapAreaZoom >= 11) radius = 40;
      else if (mapAreaZoom >= 10) radius = 70;
      else radius = 120;
    } else if (searchRadiusKm !== null) {
      radius = searchRadiusKm;
    }

    return filteredHikes.filter((rando) => {
      const randoLat = (rando as any)?.start_lat ?? rando?.startStationCoords?.latitude ?? 48.8566;
      const randoLng = (rando as any)?.start_lng ?? rando?.startStationCoords?.longitude ?? 2.3522;
      const dist = calculateDistanceKm(
        mapAreaCenter!.latitude,
        mapAreaCenter!.longitude,
        randoLat,
        randoLng
      );
      return dist <= radius;
    });
  }, [filteredHikes, mapAreaCenter, mapAreaBounds, mapAreaZoom, searchRadiusKm, isMapAreaActive, userLocation]);

  const isInitialAreaSetRef = useRef(false);
  const hasLeftFirstCarouselCardRef = useRef(false);

  // Tracés des randos à l'écran, chargés à la volée une fois le seuil de zoom
  // franchi — ils ne font pas partie des colonnes de liste.
  const { traces, onCameraChange: onTracesCameraChange } = useHikeTraces(filteredRandos);

  const handleCameraChangeComplete = useCallback(
    (center: { latitude: number; longitude: number }, zoom: number, bounds: BoundingBox | null) => {
      // Automatically set initial screen bounds on app startup
      if (!isInitialAreaSetRef.current) {
        if (bounds || center) {
          isInitialAreaSetRef.current = true;
          setMapAreaCenter(center);
          setMapAreaZoom(zoom);
          setMapAreaBounds(bounds);
          lastSearchedCoordsRef.current = center;
          lastSearchedZoomRef.current = zoom;
          return;
        }
      }

      const dist = calculateDistanceKm(
        lastSearchedCoordsRef.current.latitude,
        lastSearchedCoordsRef.current.longitude,
        center.latitude,
        center.longitude
      );
      const zoomDiff = Math.abs(lastSearchedZoomRef.current - zoom);

      if (dist > 0.8 || zoomDiff > 0.4) {
        setPendingSearchCenter(center);
        setPendingSearchZoom(zoom);
        setPendingSearchBounds(bounds);
        setShowSearchInAreaBtn(true);
      }
    },
    []
  );

  const handleSearchInThisArea = () => {
    if (!pendingSearchCenter) return;

    // Calculate targeted radius in km based on the visible map screen area
    let estimatedRadiusKm = 20;
    if (pendingSearchBounds) {
      const distKm = calculateDistanceKm(
        pendingSearchCenter.latitude,
        pendingSearchCenter.longitude,
        pendingSearchBounds.neLat,
        pendingSearchBounds.neLng
      );
      estimatedRadiusKm = Math.max(1, Math.round(distKm));
    } else if (pendingSearchZoom != null) {
      if (pendingSearchZoom >= 15) estimatedRadiusKm = 3;
      else if (pendingSearchZoom >= 14) estimatedRadiusKm = 6;
      else if (pendingSearchZoom >= 13) estimatedRadiusKm = 12;
      else if (pendingSearchZoom >= 12) estimatedRadiusKm = 22;
      else if (pendingSearchZoom >= 11) estimatedRadiusKm = 40;
      else if (pendingSearchZoom >= 10) estimatedRadiusKm = 70;
      else estimatedRadiusKm = 120;
    }

    setMapSearchArea(estimatedRadiusKm);
    ensureHikesRadius(pendingSearchCenter, estimatedRadiusKm);
    setIsSearchingArea(true);
    setShowSearchInAreaBtn(false);
    hasLeftFirstCarouselCardRef.current = false;
    // Smooth transition: carousel animates out -> new area filters -> new carousel animates in
    setTimeout(() => {
      setMapAreaCenter(pendingSearchCenter);
      setMapAreaZoom(pendingSearchZoom);
      setMapAreaBounds(pendingSearchBounds);
      lastSearchedCoordsRef.current = pendingSearchCenter;
      lastSearchedZoomRef.current = pendingSearchZoom;
      setIsSearchingArea(false);
    }, 350);
  };

  // Reset map area bounds when user selects 'Position actuelle'
  React.useEffect(() => {
    if (searchRadiusKm === null && !isMapAreaActive) {
      setMapAreaCenter(null);
      setMapAreaBounds(null);
      setMapAreaZoom(null);
      if (userLocation) {
        mapRef.current?.centerOnUser();
      }
    }
  }, [searchRadiusKm, isMapAreaActive, userLocation]);

  // Picking a plain radius (5/10/20... km) recenters the map on the user so the visible
  // area roughly matches what's now filtered below — it must not fight the auto-captured
  // viewport bounds on every render, only react to an actual radius selection.
  const lastAppliedChipRadiusRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (isMapAreaActive || searchRadiusKm === null) return;
    if (lastAppliedChipRadiusRef.current === searchRadiusKm) return;
    lastAppliedChipRadiusRef.current = searchRadiusKm;
    setMapAreaCenter(null);
    setMapAreaBounds(null);
    setMapAreaZoom(null);
    mapRef.current?.centerOnUser();
  }, [searchRadiusKm, isMapAreaActive]);

  const hasCards = filteredRandos.length > 0;
  const showCarousel = !isSearchingArea && hasCards && !isImmersive;

  // La TabBar flotte au-dessus de l'écran : tout ce qui se cale en bas doit lui
  // réserver sa place. En immersif elle est escamotée, on ne garde que la barre
  // système.
  const tabBarHeight = useTabBarHeight();

  const animatedMapControlsStyle = useAnimatedStyle(() => ({
    bottom: withTiming((showCarousel ? 240 : 96) + tabBarHeight, IMMERSIVE_ANIMATION),
    opacity: withTiming(isImmersive ? 0 : 1, IMMERSIVE_ANIMATION),
    transform: [{ translateX: withTiming(isImmersive ? 88 : 0, IMMERSIVE_ANIMATION) }],
  }));

  const animatedFabStyle = useAnimatedStyle(() => ({
    bottom: withTiming(
      isImmersive ? insets.bottom + 24 : (showCarousel ? 217 : 100) + tabBarHeight,
      IMMERSIVE_ANIMATION
    ),
  }));

  // Le carrousel reste monté tant qu'il y a des cartes, et se cache en glissant :
  // le démonter faisait repartir la FlatList de zéro au retour, le temps que les
  // images se rechargent on voyait les cartes vides. La translation l'emmène juste
  // au-delà du bord bas de l'écran, où la scène le rogne.
  const carouselHideDistance = 85 + tabBarHeight + 120;

  const animatedCarouselStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showCarousel ? 1 : 0, IMMERSIVE_ANIMATION),
    transform: [
      { translateY: withTiming(showCarousel ? 0 : carouselHideDistance, IMMERSIVE_ANIMATION) },
    ],
  }));

  // La feuille sort par translation, exactement comme la barre d'onglets et sur la
  // même valeur partagée : les deux sont jointives, elles glissent d'un bloc. Passer
  // par la fermeture de gorhom rouvrait la porte aux désynchronisations — son
  // animation a sa propre courbe, et fermer/rouvrir faisait perdre l'accroche.
  const immersiveProgress = useImmersiveProgress();
  const bottomChromeHideDistance = useBottomChromeHideDistance();

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: immersiveProgress.value * bottomChromeHideDistance }],
  }));

  // Un tap dans le vide de la carte bascule le mode immersif. Feuille dépliée, on la
  // replie d'abord : la translation ne suffirait pas à sortir une feuille qui occupe
  // la moitié de l'écran.
  const handleMapPress = useCallback(() => {
    if (!isImmersive && sheetIndex > 0) {
      bottomSheetRef.current?.snapToIndex(0, IMMERSIVE_ANIMATION);
    }
    toggleImmersive();
  }, [isImmersive, sheetIndex, toggleImmersive]);

  /**
   * Tap sur un marqueur de départ ou sur un tracé : on amène la carte de la rando
   * dans le carrousel plutôt que d'ouvrir sa fiche. Toucher la carte, c'est
   * explorer — ouvrir la fiche reste un geste délibéré, sur la carte du carrousel.
   * Le recadrage automatique est neutralisé, sans quoi la caméra sauterait au
   * départ de la rando, loin de l'endroit touché.
   */
  const handleHikeFocus = useCallback(
    (hikeId: string) => {
      const index = filteredRandos.findIndex((hike) => hike.id === hikeId);
      if (index < 0) return;

      exitImmersive();
      mapRef.current?.suppressNextRecenter();
      setSelectedHikeId(hikeId);
      hasLeftFirstCarouselCardRef.current = true;
      carouselRef.current?.scrollToOffset({
        offset: index * (cardWidth + 12),
        animated: true,
      });
    },
    [filteredRandos, cardWidth, exitImmersive]
  );

  const handleSelectHike = useCallback(
    (id?: string) => {
      if (!id) return;
      setSelectedHikeId(id);
      const rando = hikes.find((r) => r.id === id);
      if (rando) {
        router.push(`/rando/${id}`);
      }
    },
    [hikes, router]
  );

  // Stable identity (deps exclude selectedHikeId) so selection changes don't force
  // every carousel card to re-render — React.memo on RandoCard can then skip them.
  const renderCarouselItem = useCallback(
    ({ item }: ListRenderItemInfo<RandoData>) => {
      const transitInfo = getTransitInfo(item);
      return (
        <RandoCard
          id={item.id}
          horizontal
          title={item.title}
          imageUrl={item.imageUrl}
          departureStation={item.startStation}
          distance={item.distance}
          weatherTemp={item.weatherTemp}
          weatherIcon={item.weatherIcon}
          trainDuration={transitInfo.durationText}
          trainType={item.trainType}
          difficulty={item.difficulty}
          elevation={item.elevation}
          onPress={handleSelectHike}
          location={item.location}
          duration={formatHikeDuration(item.durationHours)}
          width={cardWidth}
        />
      );
    },
    [getTransitInfo, handleSelectHike, cardWidth]
  );

  // As the carousel snaps to a card, zoom the map onto that hike without navigating away.
  // The carousel opens on card 0: don't zoom there until the user has actually scrolled
  // away from it by hand at least once (coming back to it afterwards is fine).
  const handleCarouselScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + 12));
    const clampedIndex = Math.max(0, Math.min(index, filteredRandos.length - 1));

    if (clampedIndex > 0) {
      hasLeftFirstCarouselCardRef.current = true;
    } else if (!hasLeftFirstCarouselCardRef.current) {
      return;
    }

    const hike = filteredRandos[clampedIndex];
    if (hike && hike.id !== selectedHikeId) {
      setSelectedHikeId(hike.id);
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' || sheetIndex !== 2 ? 'light-content' : 'dark-content'}
        />

        {/* Full-bleed background map */}
        <ExplorerMap
          ref={mapRef}
          userLocation={userLocation}
          userLocationName={userLocationName}
          hikes={filteredRandos}
          traces={traces}
          selectedHikeId={selectedHikeId}
          onMapPress={handleMapPress}
          onHikeFocus={handleHikeFocus}
          onBearingChange={(bearing) => {
            compassBearing.value = bearing;
          }}
          onCameraChangeComplete={handleCameraChangeComplete}
          onCameraStateChange={onTracesCameraChange}
          mapStyle={mapStyle}
          style={styles.mapContainerFullScreen}
        />

        {/* Subtle dark gradient overlay at the bottom of the map */}
        {filteredRandos.length > 0 && !isImmersive && (
          <Reanimated.View
            entering={FadeIn.duration(IMMERSIVE_ANIMATION.duration)}
            exiting={FadeOut.duration(IMMERSIVE_ANIMATION.duration)}
            style={styles.mapBottomOverlay}
            pointerEvents="none">
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </Reanimated.View>
        )}

        {/* Floating Pill Search Bar */}
        <GlobalSearchbar
          searchQuery={searchQuery}
          isStatic={true}
          onPress={() => {
            router.push('/search');
          }}
          style={{ top: Math.max(insets.top, 16), zIndex: 30, elevation: 30 }}
        />

        {/* Floating Filters / Radius Chips, right below the searchbar */}
        <FilterChipsBar
          onPressFilters={() => filtersSheetRef.current?.present()}
          onPressRadius={() => radiusSheetRef.current?.present()}
          style={{
            top: Math.max(insets.top, 16) + 56 + MAP_CHIPS_BAR_GAP,
            zIndex: 30,
            elevation: 30,
          }}
        />



        {/* Floating Location Simulator Bar */}
        {showSimulator && (
          <View
            style={[
              styles.floatingLocationBar,
              {
                top: Math.max(insets.top, 16) + 68,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Text style={[styles.locationBarLabel, { color: theme.textMuted }]}>
              📍 Position :{' '}
              <Text style={{ color: theme.text, fontWeight: '800' }}>
                {userLocationName.replace('Paris ', '')}
              </Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}>
              <Pressable
                onPress={refreshUserLocation}
                style={[styles.simButton, { backgroundColor: theme.greenBadge }]}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : (
                  <Text style={[styles.simButtonText, { color: theme.tint }]}>⚡ GPS</Text>
                )}
              </Pressable>
              {SIMULATED_LOCATIONS.map((loc) => {
                const isActive = userLocationName.includes(loc.name);
                return (
                  <Pressable
                    key={loc.name}
                    onPress={() =>
                      setUserLocationManually(
                        { latitude: loc.latitude, longitude: loc.longitude },
                        `Paris ${loc.name}`
                      )
                    }
                    style={[
                      styles.simButton,
                      {
                        backgroundColor: isActive ? theme.secondary : theme.blueBadge,
                        borderColor: isActive ? theme.secondary : 'transparent',
                        borderWidth: 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.simButtonText,
                        { color: isActive ? '#FFFFFF' : theme.secondary },
                      ]}>
                      {loc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Floating Map Controls */}
        <MapControls
          compassBearing={compassBearing}
          onPressCompass={() => mapRef.current?.resetNorth()}
          onPressLayers={() => layerSheetRef.current?.present()}
          onPressLocate={() => mapRef.current?.centerOnUser()}
          isLocating={isLocating}
          style={animatedMapControlsStyle}
          pointerEvents={isImmersive ? 'none' : 'auto'}
        />

        {/* Floating "Rechercher ici" FAB positioned right above horizontal cards carousel */}
        <Fab
          visible={showSearchInAreaBtn}
          text="Rechercher dans cette zone"
          icon={<RotateCcw size={18} color="#FFFFFF" />}
          onPress={handleSearchInThisArea}
          style={[animatedFabStyle, styles.searchInAreaFab]}
        />

        {/* Horizontal Hikes Carousel "A proximité" with smooth enter/exit animations */}
        {hasCards && (
          <Reanimated.View
            pointerEvents={showCarousel ? 'auto' : 'none'}
            style={[
              styles.carouselContainer,
              { bottom: 85 + tabBarHeight },
              animatedCarouselStyle,
            ]}>
            <FlatList
              ref={carouselRef}
              data={filteredRandos}
              horizontal
              keyExtractor={(item) => `carousel-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
              snapToInterval={cardWidth + 12}
              decelerationRate="fast"
              snapToAlignment="start"
              onMomentumScrollEnd={handleCarouselScrollEnd}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={renderCarouselItem}
            />
          </Reanimated.View>
        )}

        {/* Bottom Sheet Slider */}
        <Reanimated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.sheetLayer, animatedSheetStyle]}>
          <HikesBottomSheet
            ref={bottomSheetRef}
            hikes={filteredRandos}
            isLoadingHikes={isLoadingHikes || isSearchingArea}
            getTransitInfo={getTransitInfo}
            onSelectHike={handleSelectHike}
            onChange={setSheetIndex}
            expandedTopOffset={MAP_CHIPS_BAR_HEIGHT + MAP_CHIPS_BAR_GAP}
            bottomInset={tabBarHeight}
          />
        </Reanimated.View>

        {/* Map Layer Sheet Modal */}
        <BaseBottomSheetModal
          ref={layerSheetRef}
          snapPoints={['30%']}
          title="Type de carte"
          showCloseButton={true}>
          <View style={styles.layerOptionsList}>
            {mapTypes.map((mapType) => {
              const isSelected = mapStyle === mapType.key;
              return (
                <Pressable
                  key={mapType.key}
                  onPress={() => {
                    setMapStyle(mapType.key);
                    layerSheetRef.current?.dismiss();
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

        {/* Filters Bottom Sheet Modal */}
        <FiltersBottomSheet ref={filtersSheetRef} baseHikes={geoScopedHikes} />

        {/* Search Radius Bottom Sheet Modal */}
        <RadiusBottomSheet ref={radiusSheetRef} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mapContainerFullScreen: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },

  floatingLocationBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    zIndex: 9,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  locationBarLabel: {
    fontFamily: 'Satoshi',
    fontSize: 11,
    fontWeight: '700',
  },
  simButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simButtonText: {
    fontFamily: 'Satoshi',
    fontSize: 10,
    fontWeight: '800',
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  carouselScroll: {
    paddingHorizontal: 24,
  },
  mapBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  layerOptionsList: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
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
  // Calque qui porte la feuille pour la faire glisser hors écran. Il couvre tout
  // l'écran — c'est le conteneur que gorhom mesure — d'où le `box-none` au rendu,
  // sans quoi il avalerait les taps destinés à la carte.
  sheetLayer: {
    zIndex: 20,
  },
  // Au-dessus du carrousel (5) mais sous la feuille (20) : en mode immersif le FAB
  // descend en traversant l'emplacement des cartes, il ne doit pas passer dessous.
  // L'`elevation` reste basse, elle ne sert qu'à l'ombre du bouton sur Android.
  searchInAreaFab: {
    zIndex: 15,
    elevation: 5,
  },
});
