import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Navigation2 } from 'lucide-react-native';
import { RandoData } from '@/constants/RandosData';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { TRACE_MIN_ZOOM } from '@/services/hikeTraceService';
import type { HikeTrace } from '@/components/useHikeTraces';

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
  /** Tracés à dessiner sous les marqueurs, au-delà de `TRACE_MIN_ZOOM`. */
  traces?: HikeTrace[];
  selectedHikeId: string | null;
  /**
   * Tap sur une zone vide de la carte. Les marqueurs et les tracés sont servis
   * avant par leur `ShapeSource` : ce rappel ne se déclenche donc que « dans le vide ».
   */
  onMapPress?: () => void;
  /**
   * Tap sur un marqueur de départ ou sur un tracé — un même geste, une même
   * intention : mettre cette rando en avant sans quitter la carte. La navigation
   * vers la fiche reste à la charge de la carte du carrousel.
   */
  onHikeFocus?: (id: string) => void;
  onBearingChange?: (bearing: number) => void;
  onCameraChangeComplete?: (
    center: { latitude: number; longitude: number },
    zoom: number,
    bounds: BoundingBox | null
  ) => void;
  /**
   * Position de la caméra à chaque image, mouvements programmatiques compris —
   * contrairement à `onCameraChangeComplete`, réservé aux gestes de l'utilisateur.
   * Pour ce qui doit suivre le cadre visible dès l'ouverture, sans attendre un geste.
   */
  onCameraStateChange?: (zoom: number, bounds: BoundingBox | null) => void;
  mapStyle?: MapStyleType;
  showGpxTrace?: boolean;
  initialZoomLevel?: number;
  style?: any;
}

export interface ExplorerMapRef {
  resetNorth: () => void;
  centerOnUser: () => void;
  /**
   * Fait sauter le recadrage automatique du prochain changement de sélection.
   * À appeler juste avant de sélectionner une rando depuis la carte elle-même.
   */
  suppressNextRecenter: () => void;
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

/**
 * Comment colorer les tracés — à l'essai.
 *
 * `difficulty` porte une information : mêmes jetons que les étiquettes des cartes
 * de rando. `varied` ne veut rien dire, mais distingue mieux deux parcours voisins
 * de même difficulté.
 */
const TRACE_COLOR_MODE = 'difficulty' as 'difficulty' | 'varied';

/** Nombre de teintes du mode `varied`, voir `traceColorExpression`. */
const VARIED_PALETTE_SIZE = 5;

/**
 * Teinte attribuée à une rando, dérivée de son identifiant.
 *
 * Volontairement déterministe : un `Math.random()` changerait de couleur à chaque
 * recalcul de la liste — donc à chaque déplacement de caméra — et les tracés
 * clignoteraient. Ici la même rando garde sa teinte d'une session à l'autre.
 */
function variedColorIndex(hikeId: string): number {
  let hash = 0;
  for (let i = 0; i < hikeId.length; i++) {
    hash = (hash * 31 + hikeId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % VARIED_PALETTE_SIZE;
}

const ExplorerMap = forwardRef<ExplorerMapRef, ExplorerMapProps>(function ExplorerMap(
  {
    userLocation,
    userLocationName,
    hikes = [],
    traces,
    selectedHikeId,
    onMapPress,
    onHikeFocus,
    onBearingChange,
    onCameraChangeComplete,
    onCameraStateChange,
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
  const skipNextRecenterRef = useRef(false);

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
    suppressNextRecenter: () => {
      skipNextRecenterRef.current = true;
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
          // Mêmes propriétés que les entités de tracé : les deux couches partagent
          // `traceColorExpression`, donc le marqueur porte la couleur de son tracé.
          colorIndex: variedColorIndex(hike.id),
          isSelected: hike.id === selectedHikeId,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [hikes, selectedHikeId]);

  /**
   * Prédicat « ce point est la rando sélectionnée », partagé par les couches de
   * marqueurs. Comparé à l'identifiant plutôt qu'à la propriété `isSelected` du
   * GeoJSON : Mapbox ne relit les propriétés qu'au remplacement de la source.
   */
  const isSelectedExpression = useMemo(
    () => ['==', ['get', 'id'], selectedHikeId ?? ''] as any,
    [selectedHikeId]
  );

  /**
   * Opacité des tracés selon la sélection.
   *
   * Sans sélection, tout reste à pleine opacité : mettre les autres en retrait n'a
   * de sens que s'il y en a un à mettre en avant. D'où le test en JavaScript plutôt
   * qu'un `case` de plus — l'expression est de toute façon reconstruite à chaque
   * changement de sélection.
   */
  const traceOpacityExpression = useMemo(
    () => (selectedHikeId ? (['case', isSelectedExpression, 1, 0.5] as any) : 1),
    [selectedHikeId, isSelectedExpression]
  );

  const tracesGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(() => {
    if (!traces || traces.length === 0) return null;

    // La difficulté vit sur la rando, pas sur le tracé — le service de tracés ne
    // manipule que de la géométrie. On la rapporte ici, où elle sert à colorer.
    const difficultyById = new Map(hikes.map((hike) => [hike.id, hike.difficulty || 'Modéré']));

    return {
      type: 'FeatureCollection',
      features: traces.map((trace) => ({
        type: 'Feature',
        id: trace.id,
        geometry: { type: 'LineString', coordinates: trace.coordinates },
        properties: {
          id: trace.id,
          difficulty: difficultyById.get(trace.id) ?? 'Modéré',
          colorIndex: variedColorIndex(trace.id),
        },
      })),
    };
  }, [traces, hikes]);

  /**
   * Couleur du tracé, selon `TRACE_COLOR_MODE`.
   *
   * En mode `difficulty`, les jetons sont ceux des étiquettes de difficulté des
   * cartes de rando — `Tag` traduit Facile en Success, Modéré en Warning et
   * Difficile en Error. En mode `varied`, la teinte vient du hachage de
   * l'identifiant : aucune signification, mais deux parcours voisins de même
   * difficulté cessent de se confondre.
   */
  const traceColorExpression = useMemo(() => {
    if (TRACE_COLOR_MODE === 'varied') {
      const palette = [
        theme.primary,
        theme.secondary,
        theme.accentPink,
        theme.accentGreen,
        theme.statusBgInfo,
      ];
      // Dernière teinte en valeur par défaut : `match` en exige une, et l'indice
      // ne peut de toute façon pas sortir de la palette.
      return [
        'match',
        ['get', 'colorIndex'],
        0,
        palette[0],
        1,
        palette[1],
        2,
        palette[2],
        3,
        palette[3],
        palette[4],
      ] as any;
    }

    return [
      'match',
      ['get', 'difficulty'],
      'Facile',
      theme.statusBgSuccess,
      'Difficile',
      theme.statusBgError,
      theme.statusBgWarning,
    ] as any;
  }, [theme]);

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
      onHikeFocus?.(feature.properties.id);
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

    // Sélection venue d'un tap sur un tracé : l'utilisateur regarde déjà l'endroit
    // qui l'intéresse, recadrer sur le départ de la rando le téléporterait ailleurs.
    if (skipNextRecenterRef.current) {
      skipNextRecenterRef.current = false;
      return;
    }

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
        onCameraChanged={(state: any) => {
          if (state.properties?.heading !== undefined) {
            onBearingChange?.(state.properties.heading);
          }
          if (state.properties?.center) {
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

            // Où est la caméra, quelle qu'en soit la cause — y compris le cadrage
            // d'ouverture, qui est programmatique. Sans ça, rien qui dépend du
            // cadre visible ne s'affiche tant que l'utilisateur n'a pas bougé.
            onCameraStateChange?.(zoom, bounds);

            // Un déplacement *de l'utilisateur*, condition distincte : c'est elle
            // qui décide d'ouvrir « Rechercher dans cette zone », et un recadrage
            // qu'on a déclenché nous-mêmes ne doit pas le proposer.
            if (!isProgrammaticMoveRef.current) {
              onCameraChangeComplete?.({ latitude: lat, longitude: lng }, zoom, bounds);
            }
          }
        }}>
        {/* Icône rasterisée une fois en image de style, puis référencée par son nom
            dans la couche. On reste ainsi sur du natif : pas de vue React par
            marqueur, le clustering et les performances sont préservés. */}
        <Mapbox.Images>
          <Mapbox.Image name="hikeStartIcon">
            <View style={styles.markerIcon}>
              {/* Rempli plutôt que détouré : à cette taille, un contour de flèche
                  se referme visuellement et ne se lit plus. Le trait fin ne sert
                  qu'à adoucir la pointe. */}
              <Navigation2 size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
            </View>
          </Mapbox.Image>
        </Mapbox.Images>

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

        {/* Tracés des randos visibles, dessinés avant tout le reste pour passer
            dessous. `minZoomLevel` est porté par la couche : en deçà du seuil
            Mapbox ne dessine simplement pas, sans rien remonter à React. */}
        {tracesGeoJSON && (
          <Mapbox.ShapeSource
            id="hikeTracesSource"
            shape={tracesGeoJSON}
            onPress={(event) => {
              const id = event.features?.[0]?.properties?.id;
              if (id) onHikeFocus?.(id as string);
            }}>
            <Mapbox.LineLayer
              id="hikeTracesCasing"
              // Les tracés se montent après les marqueurs — ils n'existent qu'une
              // fois chargés — et se retrouvaient donc empilés par-dessus, malgré
              // leur position plus haut dans le JSX. L'ordre se déclare, il ne se
              // déduit pas de l'ordre de rendu.
              belowLayerID="clusteredPoints"
              minZoomLevel={TRACE_MIN_ZOOM}
              style={{
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: ['case', isSelectedExpression, 10, 8],
                lineColor: '#FFFFFF',
                lineOpacity: traceOpacityExpression,
                // Le tracé sélectionné passe devant les autres. Sans clé de tri,
                // l'ordre de dessin suit celui des entités dans la source, et un
                // tracé voisin peut recouvrir celui qu'on met en avant.
                lineSortKey: ['case', isSelectedExpression, 1, 0],
              }}
            />
            <Mapbox.LineLayer
              id="hikeTracesLine"
              belowLayerID="clusteredPoints"
              minZoomLevel={TRACE_MIN_ZOOM}
              style={{
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: ['case', isSelectedExpression, 6, 4],
                lineColor: traceColorExpression,
                lineOpacity: traceOpacityExpression,
                lineSortKey: ['case', isSelectedExpression, 1, 0],
              }}
            />
          </Mapbox.ShapeSource>
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

          {/* Halo de la rando sélectionnée.
              Les `CircleLayer` n'ont pas d'ombre portée : ce disque translucide est
              ce qui détache le marqueur du fond, en particulier sur le satellite.
              Le blanc du contour ne suffit pas sur une image satellite claire. */}
          <Mapbox.CircleLayer
            id="unclusteredHalo"
            filter={['all', ['!', ['has', 'point_count']], isSelectedExpression]}
            style={{
              circleColor: traceColorExpression,
              circleOpacity: 0.18,
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 12, 13, 18, 16, 24],
            }}
          />

          {/* Individual Unclustered Hike Dots */}
          <Mapbox.CircleLayer
            id="unclusteredPoints"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: traceColorExpression,
              // `zoom` doit rester l'entrée de l'expression la plus externe — la
              // spec Mapbox l'interdit imbriqué. D'où l'interpolation au-dessus et
              // le `case` dans chaque palier, et non l'inverse.
              //
              // Assez large pour loger l'icône : en dessous de ~20 px de diamètre
              // le pictogramme n'est plus qu'une tache.
              circleRadius: [
                'interpolate',
                ['linear'],
                ['zoom'],
                9,
                ['case', isSelectedExpression, 10, 8],
                13,
                ['case', isSelectedExpression, 15, 12],
                16,
                ['case', isSelectedExpression, 17, 14],
              ],
              // Contour aminci à mesure que la pastille grossit : à taille égale,
              // c'est l'épaisseur de l'anneau qui donne l'impression de lourdeur.
              circleStrokeWidth: ['case', isSelectedExpression, 3, 2],
              circleStrokeColor: '#FFFFFF',
            }}
          />

          {/* Pictogramme au centre de la pastille.
              `iconAllowOverlap` et `iconIgnorePlacement` sont indispensables : sans
              eux, l'icône entre en concurrence avec les libellés dans la détection
              de collision et disparaît dès que les marqueurs se rapprochent. */}
          <Mapbox.SymbolLayer
            id="unclusteredIcons"
            filter={['!', ['has', 'point_count']]}
            style={{
              iconImage: 'hikeStartIcon',
              iconSize: ['interpolate', ['linear'], ['zoom'], 9, 0.6, 13, 0.85, 16, 1],
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />

          {/* Individual Hike Labels */}
          <Mapbox.SymbolLayer
            id="unclusteredLabels"
            filter={['!', ['has', 'point_count']]}
            style={{
              // `format` découpe le libellé en sections stylables séparément : la
              // mention de service en plus petit et en atténué, le nom de la rando
              // à pleine taille. Les paires vont contenu / options.
              //
              // `font-scale` est un multiplicateur du `textSize` ci-dessous, donc la
              // hiérarchie tient à tous les zooms sans dupliquer l'interpolation.
              // Et la syntaxe à accolades `{title}` n'a plus cours ici : c'est
              // l'ancienne interpolation de jetons, incompatible avec les expressions.
              // `text-font` attend une expression : un tableau nu serait interprété
              // comme un appel de fonction nommée « DIN Pro Bold ». D'où `literal`.
              // La famille DIN Pro est servie par les trois styles utilisés ici, qui
              // partagent le même dépôt de glyphes `mapbox://fonts/mapbox/`.
              textField: [
                'format',
                'Point de départ\n',
                {
                  'font-scale': 0.8,
                  'text-color': theme.text,
                  'text-font': ['literal', ['Roboto Pro Medium', 'Arial Unicode MS Regular']],
                },
                ['get', 'title'],
                {
                  'font-scale': 1,
                  'text-font': ['literal', ['Roboto Pro Bold', 'Arial Unicode MS Bold']],
                },
              ],
              textSize: [
                'interpolate',
                ['linear'],
                ['zoom'],
                10,
                ['case', isSelectedExpression, 13, 12],
                15,
                ['case', isSelectedExpression, 15, 13.5],
              ],
              // Ancré par le haut : l'écart au point ne dépend plus de la longueur
              // du texte, et le libellé dégage la pastille désormais plus grande.
              textAnchor: 'top',
              textOffset: [0, 1.1],
              textColor: theme.text,
              // Halo épais plutôt que gras : la graisse dépend des polices
              // embarquées dans chaque style Mapbox, le halo non — et c'est lui
              // qui fait tenir le texte sur une photo satellite.
              textHaloColor: theme.background,
              textHaloWidth: 2,
              textHaloBlur: 0.5,
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
  // Rendu hors écran pour produire l'image de carte : la taille fixe la définition
  // de la rasterisation, `iconSize` ne fait ensuite que la réduire.
  markerIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
