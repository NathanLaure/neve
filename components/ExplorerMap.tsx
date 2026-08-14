import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { RandoData } from '@/constants/RandosData';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_TOKEN);

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export type MapStyleType = 'default' | 'satellite';

interface ExplorerMapProps {
  userLocation?: { latitude: number; longitude: number };
  userLocationName?: string;
  hikes: RandoData[];
  selectedHikeId: string | null;
  onSelectHike?: (id: string) => void;
  /**
   * Tap sur une zone vide de la carte. Les marqueurs et les clusters sont servis
   * avant par la `ShapeSource` : ce rappel ne se déclenche donc que « dans le vide ».
   */
  onMapPress?: () => void;
  onBearingChange?: (bearing: number) => void;
  onCameraChangeComplete?: (
    center: { latitude: number; longitude: number },
    zoom: number,
    bounds: BoundingBox | null
  ) => void;
  mapStyle?: MapStyleType;
  showGpxTrace?: boolean;
  initialZoomLevel?: number;
  style?: any;
}

export interface ExplorerMapRef {
  resetNorth: () => void;
  centerOnUser: () => void;
}

const MAPBOX_STYLES: Record<MapStyleType | 'dark', string> = {
  default: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/nlaure/cmqeb16wa001u01qn7zxmgncl',
};

const DEFAULT_LAT = 48.8566;
const DEFAULT_LNG = 2.3522;

// Marge autour du tracé quand on cadre dessus, pour qu'il ne colle pas aux bords
// ni ne passe sous les contrôles de la carte.
const TRACE_PADDING = 40;

const ExplorerMap = forwardRef<ExplorerMapRef, ExplorerMapProps>(function ExplorerMap(
  {
    userLocation,
    userLocationName,
    hikes = [],
    selectedHikeId,
    onSelectHike,
    onMapPress,
    onBearingChange,
    onCameraChangeComplete,
    mapStyle = 'default',
    showGpxTrace = false,
    initialZoomLevel = 11.5,
    style,
  },
  ref
) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const cameraRef = useRef<Mapbox.Camera>(null);

  const safeUserLat = userLocation?.latitude ?? DEFAULT_LAT;
  const safeUserLng = userLocation?.longitude ?? DEFAULT_LNG;

  // Tracks camera moves we trigger ourselves (compass reset, locate button,
  // cluster taps, carousel-driven flyTo) so onCameraChangeComplete only fires
  // for camera changes the user actually drove by hand.
  const isProgrammaticMoveRef = useRef(false);
  const programmaticMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCameraProgrammatically = (
    config: {
      centerCoordinate?: number[];
      zoomLevel?: number;
      heading?: number;
      bounds?: {
        ne: number[];
        sw: number[];
        paddingTop?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        paddingRight?: number;
      };
    },
    duration: number
  ) => {
    isProgrammaticMoveRef.current = true;
    if (programmaticMoveTimeoutRef.current) clearTimeout(programmaticMoveTimeoutRef.current);
    programmaticMoveTimeoutRef.current = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, duration + 150);
    cameraRef.current?.setCamera({ ...config, animationDuration: duration } as Mapbox.CameraStop);
  };

  useImperativeHandle(ref, () => ({
    resetNorth: () => {
      setCameraProgrammatically({ heading: 0 }, 500);
    },
    // Recenters the camera on the position already tracked in the background —
    // it does not request a new GPS fix.
    centerOnUser: () => {
      setCameraProgrammatically(
        {
          centerCoordinate: [safeUserLng, safeUserLat],
          zoomLevel: initialZoomLevel,
        },
        600
      );
    },
  }));

  const activeStyleURL =
    mapStyle === 'default'
      ? colorScheme === 'dark'
        ? MAPBOX_STYLES.dark
        : MAPBOX_STYLES.default
      : MAPBOX_STYLES[mapStyle];

  // Convert hikes into a GeoJSON FeatureCollection for native clustering
  const hikesGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = hikes.map((hike) => {
      const lat = (hike as any).start_lat ?? hike.startStationCoords?.latitude ?? DEFAULT_LAT;
      const lng = (hike as any).start_lng ?? hike.startStationCoords?.longitude ?? DEFAULT_LNG;

      return {
        type: 'Feature',
        id: hike.id,
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          id: hike.id,
          title: hike.title,
          difficulty: hike.difficulty || 'Modéré',
          isSelected: hike.id === selectedHikeId,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [hikes, selectedHikeId]);

  // Selected Hike & GPX Trace GeoJSON
  const selectedHike = useMemo(() => hikes.find((h) => h.id === selectedHikeId), [hikes, selectedHikeId]);

  const gpxTraceGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(() => {
    if (!showGpxTrace || !selectedHike) return null;

    let coords: number[][] = [];
    if (selectedHike.gpxTrace && selectedHike.gpxTrace.length > 0) {
      coords = selectedHike.gpxTrace.map((p) => [p.longitude, p.latitude]);
    } else if ((selectedHike as any).geometry?.coordinates) {
      coords = (selectedHike as any).geometry.coordinates;
    }

    if (coords.length < 2) return null;

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
          properties: {},
        },
      ],
    };
  }, [showGpxTrace, selectedHike]);

  /**
   * Cadre englobant le tracé affiché.
   *
   * La caméra doit montrer le parcours entier et pas seulement son départ : sur
   * une rando de 15 km, cadrer sur le point de départ laisse tout le reste hors
   * écran. Nul tant que la géométrie n'est pas chargée — sur la fiche rando elle
   * arrive après le premier rendu, d'où le repli sur le point de départ.
   */
  const traceBounds = useMemo(() => {
    const coords = gpxTraceGeoJSON?.features[0]?.geometry.coordinates;
    if (!coords || coords.length < 2) return null;

    let [minLng, minLat] = coords[0];
    let [maxLng, maxLat] = coords[0];
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
  }, [gpxTraceGeoJSON]);

  // Handle press on hike marker or cluster
  const handleShapePress = (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      // Zoom into cluster
      const coords = feature.geometry.coordinates;
      setCameraProgrammatically({ centerCoordinate: coords, zoomLevel: 13 }, 500);
    } else if (feature.properties?.id) {
      onSelectHike?.(feature.properties.id);
    }
  };

  const hasCenteredInitialLocationRef = useRef(false);

  /** Point de cadrage d'une rando : son vrai départ, à défaut sa gare. */
  const hikeCenter = (hike: RandoData): [number, number] => [
    (hike as any).start_lng ?? hike.startStationCoords?.longitude ?? DEFAULT_LNG,
    (hike as any).start_lat ?? hike.startStationCoords?.latitude ?? DEFAULT_LAT,
  ];

  // Cadrage d'ouverture. Une carte ouverte sur une rando doit s'ouvrir DESSUS :
  // partir de la position de l'utilisateur puis dériver vers le tracé se voit à
  // l'écran, et `defaultSettings` ne s'applique qu'au montage.
  const initialCenter: [number, number] = selectedHike
    ? hikeCenter(selectedHike)
    : [safeUserLng, safeUserLat];

  // Smoothly center camera on user's real GPS position once resolved at startup
  useEffect(() => {
    if (!userLocation || hasCenteredInitialLocationRef.current) return;
    // On se fie à `selectedHikeId` et non à `selectedHike` : l'identifiant est
    // connu dès le montage, alors que la rando peut n'être résolue qu'une fois
    // la liste chargée. Attendre l'objet laisserait cet effet recentrer sur
    // l'utilisateur entre-temps.
    if (selectedHikeId) {
      hasCenteredInitialLocationRef.current = true;
      return;
    }
    hasCenteredInitialLocationRef.current = true;
    setCameraProgrammatically(
      {
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: initialZoomLevel,
      },
      700
    );
  }, [userLocation, initialZoomLevel, selectedHikeId]);

  // Center camera when selected hike changes
  useEffect(() => {
    if (!selectedHike) return;

    // `selectedHike` et `traceBounds` en dépendances, et pas seulement
    // l'identifiant : quand la carte se monte avant le chargement de la liste,
    // l'objet n'arrive qu'après, et la géométrie plus tard encore. Sur le seul
    // identifiant, l'effet sortait à vide et ne repassait jamais.
    if (traceBounds) {
      setCameraProgrammatically(
        {
          bounds: {
            ...traceBounds,
            paddingTop: TRACE_PADDING,
            paddingBottom: TRACE_PADDING,
            paddingLeft: TRACE_PADDING,
            paddingRight: TRACE_PADDING,
          },
        },
        800
      );
      return;
    }

    setCameraProgrammatically({ centerCoordinate: hikeCenter(selectedHike), zoomLevel: 12.5 }, 800);
  }, [selectedHikeId, selectedHike, traceBounds]);

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={activeStyleURL}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        onPress={() => onMapPress?.()}
        onCameraChanged={(state) => {
          if (state.properties?.heading !== undefined) {
            onBearingChange?.(state.properties.heading);
          }
          if (state.properties?.center && !isProgrammaticMoveRef.current) {
            const [lng, lat] = state.properties.center;
            const zoom = state.properties.zoom ?? 10;

            let bounds: BoundingBox | null = null;
            const b = state.properties.bounds;
            if (b) {
              if (b.ne && b.sw) {
                bounds = {
                  neLng: b.ne[0],
                  neLat: b.ne[1],
                  swLng: b.sw[0],
                  swLat: b.sw[1],
                };
              } else if (Array.isArray(b) && b.length === 2) {
                const p1 = b[0];
                const p2 = b[1];
                if (Array.isArray(p1) && Array.isArray(p2)) {
                  bounds = {
                    swLng: Math.min(p1[0], p2[0]),
                    neLng: Math.max(p1[0], p2[0]),
                    swLat: Math.min(p1[1], p2[1]),
                    neLat: Math.max(p1[1], p2[1]),
                  };
                }
              }
            }

            onCameraChangeComplete?.({ latitude: lat, longitude: lng }, zoom, bounds);
          }
        }}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoomLevel,
          }}
        />

        {/* User Location Marker — seulement si on connaît vraiment la position.
            Sans ce garde-fou, `safeUserLat/Lng` retombent sur le centre de Paris
            et la carte affiche un « vous êtes ici » qui n'a aucun fondement. */}
        {userLocation && (
          <Mapbox.PointAnnotation id="userLocation" coordinate={[safeUserLng, safeUserLat]}>
            <View style={styles.userMarkerContainer}>
              <View style={styles.userPulse} />
              <View style={styles.userDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Native GPX Trace Layer */}
        {gpxTraceGeoJSON && (
          <Mapbox.ShapeSource id="gpxTraceSource" shape={gpxTraceGeoJSON}>
            <Mapbox.LineLayer
              id="gpxCasing"
              style={{
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: 6,
                lineColor: '#FFFFFF',
              }}
            />
            <Mapbox.LineLayer
              id="gpxLine"
              style={{
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: 4,
                lineColor: '#EB490B',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Native Clustered Hikes Source */}
        <Mapbox.ShapeSource
          id="hikesSource"
          shape={hikesGeoJSON}
          cluster={true}
          clusterRadius={45}
          clusterMaxZoomLevel={14}
          onPress={handleShapePress}>
          {/* Clusters (Circles) */}
          <Mapbox.CircleLayer
            id="clusteredPoints"
            filter={['has', 'point_count']}
            style={{
              circleColor: '#EB490B',
              circleRadius: ['step', ['get', 'point_count'], 18, 10, 22, 50, 26, 100, 30],
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#FFFFFF',
            }}
          />

          {/* Cluster Text Counts */}
          <Mapbox.SymbolLayer
            id="pointCount"
            filter={['has', 'point_count']}
            style={{
              textField: '{point_count_abbreviated}',
              textSize: 13,
              textColor: '#FFFFFF',
              textPitchAlignment: 'map',
            }}
          />

          {/* Individual Unclustered Hike Dots */}
          <Mapbox.CircleLayer
            id="unclusteredPoints"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: ['case', ['==', ['get', 'id'], selectedHikeId || ''], '#EB490B', '#FFFFFF'],
              circleRadius: ['case', ['==', ['get', 'id'], selectedHikeId || ''], 9, 6],
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#EB490B',
            }}
          />

          {/* Individual Hike Labels */}
          <Mapbox.SymbolLayer
            id="unclusteredLabels"
            filter={['!', ['has', 'point_count']]}
            style={{
              textField: '{title}',
              textSize: 11,
              textOffset: [0, 1.4],
              textColor: colorScheme === 'dark' ? '#EFEFEF' : '#292929',
              textHaloColor: colorScheme === 'dark' ? '#111111' : '#FFFFFF',
              textHaloWidth: 1.5,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  userMarkerContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FA6415',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
  },
  userPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FA6415',
    opacity: 0.35,
  },
});

export default ExplorerMap;
