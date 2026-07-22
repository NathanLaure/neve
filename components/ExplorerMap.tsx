import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { RandoData } from '@/constants/RandosData';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export type MapStyleType = 'default' | 'satellite';

interface ExplorerMapProps {
  userLocation: { latitude: number; longitude: number };
  userLocationName: string;
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
}

const MAPBOX_STYLES: Record<MapStyleType | 'dark', string> = {
  default: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/nlaure/cmqeb16wa001u01qn7zxmgncl',
};

const ExplorerMap = forwardRef<ExplorerMapRef, ExplorerMapProps>(function ExplorerMap(
  {
    userLocation,
    userLocationName,
    hikes,
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
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    resetNorth: () => {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'RESET_NORTH' }));
    },
  }));

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  const mapboxStyle =
    mapStyle === 'default'
      ? colorScheme === 'dark'
        ? MAPBOX_STYLES.dark
        : MAPBOX_STYLES.default
      : MAPBOX_STYLES[mapStyle];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mapbox Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js"></script>
      <style>
        body { margin: 0; padding: 0; background-color: ${theme.background}; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
        
        .user-marker {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: #fa6415;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          position: absolute;
        }
        .user-pulse {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #fa6415;
          opacity: 0.35;
          animation: pulse 2s infinite ease-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        .hike-marker {
          background-color: #ffffff;
          border: 1.5px solid #eb490b;
          border-radius: 20px;
          padding: 5px 9px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: #292929;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .hike-marker.selected {
          background-color: #eb490b;
          border-color: #ffffff;
          color: #ffffff;
          transform: scale(1.1);
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${mapboxToken}';
        
        const map = new mapboxgl.Map({
          container: 'map',
          style: '${mapboxStyle}',
          center: [${userLocation.longitude}, ${userLocation.latitude}],
          zoom: 10.5,
          attributionControl: false
        });

        let currentMarkers = {};
        let selectedHikeId = ${selectedHikeId ? `'${selectedHikeId}'` : 'null'};
        let activeGpxTrace = null;

        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = '<div class="user-pulse"></div><div class="user-dot"></div>';
        
        const userMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([${userLocation.longitude}, ${userLocation.latitude}])
          .addTo(map);

        function drawGpxTrace(gpxTrace) {
          activeGpxTrace = gpxTrace;
          if (map.getSource('gpx-route')) {
            if (map.getLayer('gpx-route-layer')) map.removeLayer('gpx-route-layer');
            if (map.getLayer('gpx-route-casing')) map.removeLayer('gpx-route-casing');
            map.removeSource('gpx-route');
          }

          if (!gpxTrace || gpxTrace.length === 0) return;

          const coordinates = gpxTrace.map(pt => [pt.longitude, pt.latitude]);

          map.addSource('gpx-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          });

          map.addLayer({
            id: 'gpx-route-casing',
            type: 'line',
            source: 'gpx-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 6,
              'line-opacity': 0.85
            }
          });

          map.addLayer({
            id: 'gpx-route-layer',
            type: 'line',
            source: 'gpx-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#FA6415',
              'line-width': 4.5
            }
          });

          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach(coord => bounds.extend(coord));
          map.fitBounds(bounds, { padding: 40, duration: 800 });
        }

        map.on('style.load', () => {
          if (activeGpxTrace) {
            drawGpxTrace(activeGpxTrace);
          }
        });

        function renderHikes(hikesList, selectedId) {
          Object.keys(currentMarkers).forEach(id => {
            currentMarkers[id].remove();
          });
          currentMarkers = {};
          selectedHikeId = selectedId;

          hikesList.forEach(hike => {
            const isSelected = hike.id === selectedId;
            const hEl = document.createElement('div');
            hEl.className = 'hike-marker' + (isSelected ? ' selected' : '');
            hEl.innerText = '📍 ' + hike.title.split(' ')[0] + '..';

            hEl.addEventListener('click', (e) => {
              e.stopPropagation();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SELECT_HIKE',
                id: hike.id
              }));
            });

            const marker = new mapboxgl.Marker({ element: hEl })
              .setLngLat([hike.startStationCoords.longitude, hike.startStationCoords.latitude])
              .addTo(map);

            currentMarkers[hike.id] = marker;
          });
        }

        const allowGpxTrace = ${showGpxTrace ? 'true' : 'false'};
        const initialHikes = ${JSON.stringify(hikes)};
        renderHikes(initialHikes, selectedHikeId);

        map.on('load', () => {
          const selectedHike = initialHikes.find(h => h.id === selectedHikeId);
          if (allowGpxTrace && selectedHike && selectedHike.gpxTrace && selectedHike.gpxTrace.length > 0) {
            drawGpxTrace(selectedHike.gpxTrace);
          }
        });

        const handleMessageEvent = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'UPDATE_HIKES') {
              renderHikes(data.hikes, data.selectedHikeId);
            } else if (data.type === 'UPDATE_USER_LOCATION') {
              userMarker.setLngLat([data.longitude, data.latitude]);
              if (!selectedHikeId) {
                map.easeTo({
                  center: [data.longitude, data.latitude],
                  zoom: 10.5,
                  duration: 800
                });
              }
            } else if (data.type === 'PAN_TO_HIKE') {
              selectedHikeId = data.id;
              const hike = data.hike;
              if (hike) {
                if (allowGpxTrace && hike.gpxTrace && hike.gpxTrace.length > 0) {
                  drawGpxTrace(hike.gpxTrace);
                } else {
                  map.easeTo({
                    center: [hike.startStationCoords.longitude, hike.startStationCoords.latitude],
                    zoom: 12,
                    duration: 800
                  });
                }
                
                Object.keys(currentMarkers).forEach(id => {
                  const element = currentMarkers[id].getElement();
                  if (id === data.id) {
                    element.classList.add('selected');
                  } else {
                    element.classList.remove('selected');
                  }
                });
              }
            } else if (data.type === 'PAN_TO_USER') {
              selectedHikeId = null;
              drawGpxTrace(null);
              map.easeTo({
                center: [data.longitude, data.latitude],
                zoom: 10.5,
                duration: 800
              });
              Object.keys(currentMarkers).forEach(id => {
                currentMarkers[id].getElement().classList.remove('selected');
              });
            } else if (data.type === 'UPDATE_STYLE') {
              map.setStyle(data.style);
            } else if (data.type === 'RESET_NORTH') {
              map.easeTo({ bearing: 0, duration: 400 });
            }
          } catch (err) {
            console.error('Error handling postMessage:', err);
          }
        };

        window.addEventListener('message', handleMessageEvent);
        document.addEventListener('message', handleMessageEvent);

        map.on('rotate', () => {
          const bearing = map.getBearing();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'BEARING_CHANGE',
            bearing: bearing
          }));
        });
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_HIKES',
          hikes,
          selectedHikeId,
        })
      );
    }
  }, [hikes, selectedHikeId]);

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_USER_LOCATION',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        })
      );
    }
  }, [userLocation.latitude, userLocation.longitude]);

  useEffect(() => {
    if (webViewRef.current) {
      if (selectedHikeId) {
        const selectedHike = hikes.find((h) => h.id === selectedHikeId);
        if (selectedHike) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'PAN_TO_HIKE',
              id: selectedHikeId,
              hike: selectedHike,
            })
          );
        }
      } else {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'PAN_TO_USER',
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          })
        );
      }
    }
  }, [selectedHikeId, userLocation.latitude, userLocation.longitude, hikes]);

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_STYLE',
          style: mapboxStyle,
        })
      );
    }
  }, [mapboxStyle]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_HIKE') {
        if (onSelectHike) {
          onSelectHike(data.id);
        }
      } else if (data.type === 'BEARING_CHANGE') {
        if (onBearingChange) {
          onBearingChange(data.bearing);
        }
      }
    } catch (err) {
      console.error('Error parsing webview message:', err);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {mapboxToken ? (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={styles.map}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      ) : (
        <View style={styles.fallback}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
});

export default ExplorerMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
