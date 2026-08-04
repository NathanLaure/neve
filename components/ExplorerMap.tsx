import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { RandoData } from '@/constants/RandosData';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_TOKEN);

export type MapStyleType = 'default' | 'satellite';

interface ExplorerMapProps {
  userLocation?: { latitude: number; longitude: number };
  userLocationName?: string;
  hikes: RandoData[];
  selectedHikeId: string | null;
  onSelectHike?: (id: string) => void;
  onBearingChange?: (bearing: number) => void;
  mapStyle?: MapStyleType;
  showGpxTrace?: boolean;
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

const ExplorerMap = forwardRef<ExplorerMapRef, ExplorerMapProps>(function ExplorerMap(
  {
    userLocation,
    userLocationName,
    hikes = [],
    selectedHikeId,
    onSelectHike,
    onBearingChange,
    mapStyle = 'default',
    showGpxTrace = false,
    style,
  },
  ref
) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const cameraRef = useRef<Mapbox.Camera>(null);

  const safeUserLat = userLocation?.latitude ?? DEFAULT_LAT;
  const safeUserLng = userLocation?.longitude ?? DEFAULT_LNG;

  useImperativeHandle(ref, () => ({
    resetNorth: () => {
      cameraRef.current?.setCamera({
        heading: 0,
        animationDuration: 500,
      });
    },
    // Recenters the camera on the position already tracked in the background —
    // it does not request a new GPS fix.
    centerOnUser: () => {
      cameraRef.current?.setCamera({
        centerCoordinate: [safeUserLng, safeUserLat],
        zoomLevel: 12,
        animationDuration: 600,
      });
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
      const lng = hike.startStationCoords
        ? hike.startStationCoords.longitude
        : (hike as any).start_lng || DEFAULT_LNG;
      const lat = hike.startStationCoords
        ? hike.startStationCoords.latitude
        : (hike as any).start_lat || DEFAULT_LAT;

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

  // Handle press on hike marker or cluster
  const handleShapePress = (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      // Zoom into cluster
      const clusterId = feature.properties.cluster_id;
      // Mapbox handles cluster zoom via camera
      const coords = feature.geometry.coordinates;
      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 13,
        animationDuration: 500,
      });
    } else if (feature.properties?.id) {
      onSelectHike?.(feature.properties.id);
    }
  };

  // Center camera when selected hike changes
  useEffect(() => {
    if (!selectedHike) return;
    const lng = selectedHike.startStationCoords
      ? selectedHike.startStationCoords.longitude
      : (selectedHike as any).start_lng || DEFAULT_LNG;
    const lat = selectedHike.startStationCoords
      ? selectedHike.startStationCoords.latitude
      : (selectedHike as any).start_lat || DEFAULT_LAT;

    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 12.5,
      animationDuration: 800,
    });
  }, [selectedHikeId]);

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={activeStyleURL}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        onCameraChanged={(state) => {
          if (state.properties?.heading !== undefined) {
            onBearingChange?.(state.properties.heading);
          }
        }}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [safeUserLng, safeUserLat],
            zoomLevel: 10,
          }}
        />

        {/* User Location Marker */}
        <Mapbox.PointAnnotation id="userLocation" coordinate={[safeUserLng, safeUserLat]}>
          <View style={styles.userMarkerContainer}>
            <View style={styles.userPulse} />
            <View style={styles.userDot} />
          </View>
        </Mapbox.PointAnnotation>

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
