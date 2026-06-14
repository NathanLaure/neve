import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { RandoData } from '@/constants/RandosData';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { MapStyleType } from '@/components/MapLayerSheet';

interface ExplorerMapProps {
  userLocation: { latitude: number; longitude: number };
  userLocationName: string;
  hikes: RandoData[];
  selectedHikeId: string | null;
  onSelectHike: (id: string) => void;
  onBearingChange?: (bearing: number) => void;
  mapStyle?: MapStyleType;
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

  // Generate the full HTML template with serialized initial data
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
        
        /* User marker custom styling */
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

        /* Hike marker styling */
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

        // Add user marker
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = '<div class="user-pulse"></div><div class="user-dot"></div>';
        
        const userMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([${userLocation.longitude}, ${userLocation.latitude}])
          .addTo(map);

        // Function to render hike markers
        function renderHikes(hikesList, selectedId) {
          // Remove old markers
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

        // Initialize markers
        const initialHikes = ${JSON.stringify(hikes)};
        renderHikes(initialHikes, selectedHikeId);

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
                map.easeTo({
                  center: [hike.startStationCoords.longitude, hike.startStationCoords.latitude],
                  zoom: 12,
                  duration: 800
                });
                
                // Update selected classes immediately
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
              map.easeTo({
                center: [data.longitude, data.latitude],
                zoom: 10.5,
                duration: 800
              });
              // Reset all marker styles
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

        // Report bearing changes to React Native
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

  // Update hikes and selected state dynamically
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

  // Update user location dynamically
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

  // Pan to selected hike or return to user location
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

  // Update map style dynamically
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_STYLE',
          style: mapboxStyle,
        })
      );
    }
  }, [mapStyle, mapboxStyle]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_HIKE') {
        onSelectHike(data.id);
      } else if (data.type === 'BEARING_CHANGE') {
        onBearingChange?.(data.bearing);
      }
    } catch (e) {
      console.warn('Error parsing message from webview:', e);
    }
  };

  return (
    <View style={[styles.mapContainer, style, { backgroundColor: theme.background }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        renderLoading={() => (
          <View style={StyleSheet.absoluteFillObject}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        )}
        startInLoadingState={true}
        androidLayerType="hardware"
        mixedContentMode="always"
      />
    </View>
  );
});

export default ExplorerMap;

const styles = StyleSheet.create({
  mapContainer: {
    height: 250,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
