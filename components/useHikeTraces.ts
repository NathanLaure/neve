import { useCallback, useEffect, useRef, useState } from 'react';

import { type RandoData } from '@/constants/RandosData';
import type { BoundingBox } from '@/components/ExplorerMap';
import {
  ensureHikeTraces,
  getVisibleTraces,
  MAX_TRACES_PER_REQUEST,
  TRACE_MIN_ZOOM,
  type TraceCoordinates,
} from '@/services/hikeTraceService';

export interface HikeTrace {
  id: string;
  coordinates: TraceCoordinates;
}

/**
 * Délai d'attente après le dernier mouvement de caméra. `onCameraChanged` tire à
 * chaque image : sans cette temporisation, un simple glissement déclencherait une
 * requête par frame.
 */
const CAMERA_SETTLE_DELAY = 300;

/**
 * Plafond de tracés dessinés simultanément. Le cache s'étoffe au fil de la session
 * et un dézoom fait soudain intersecter tout ce qu'il contient : cette borne évite
 * de reconstruire une collection démesurée à chaque mouvement.
 */
const MAX_DRAWN_TRACES = 150;

/**
 * Marge appliquée au cadre visible pour décider quoi *télécharger*.
 *
 * Avant d'avoir la géométrie, le point de départ est le seul indice disponible :
 * on ratisse donc autour de l'écran pour attraper les randos qui démarrent juste
 * à côté et dont le parcours entre dans le cadre. 1 = un écran de marge de chaque
 * côté, soit une zone trois fois plus large que le viewport.
 */
const FETCH_BOUNDS_PADDING = 1;

const DEFAULT_LAT = 48.8566;
const DEFAULT_LNG = 2.3522;

function padBounds(bounds: BoundingBox | null): BoundingBox | null {
  if (!bounds) return null;
  const latMargin = (bounds.neLat - bounds.swLat) * FETCH_BOUNDS_PADDING;
  const lngMargin = (bounds.neLng - bounds.swLng) * FETCH_BOUNDS_PADDING;
  return {
    swLat: bounds.swLat - latMargin,
    neLat: bounds.neLat + latMargin,
    swLng: bounds.swLng - lngMargin,
    neLng: bounds.neLng + lngMargin,
  };
}

function hikeCoordinates(hike: RandoData): { latitude: number; longitude: number } {
  return {
    latitude: (hike as any)?.start_lat ?? hike?.startStationCoords?.latitude ?? DEFAULT_LAT,
    longitude: (hike as any)?.start_lng ?? hike?.startStationCoords?.longitude ?? DEFAULT_LNG,
  };
}

function isInsideBounds(hike: RandoData, bounds: BoundingBox | null): boolean {
  if (!bounds) return true;
  const { latitude, longitude } = hikeCoordinates(hike);
  return (
    latitude >= bounds.swLat &&
    latitude <= bounds.neLat &&
    longitude >= bounds.swLng &&
    longitude <= bounds.neLng
  );
}

/**
 * Tracés à dessiner sous les marqueurs de l'écran carte.
 *
 * Ne charge que ce qui est réellement à l'écran, et seulement une fois le seuil de
 * zoom franchi : les tracés vivent hors des colonnes de liste, chacun est une
 * requête de données à part entière.
 *
 * Renvoie `onCameraChange`, à brancher sur le rappel de caméra de la carte.
 */
export function useHikeTraces(hikes: RandoData[]) {
  const [traces, setTraces] = useState<HikeTrace[]>([]);

  const hikesRef = useRef<RandoData[]>(hikes);
  const cameraRef = useRef<{ zoom: number; bounds: BoundingBox | null } | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Jeton de la dernière demande : les requêtes ne reviennent pas forcément dans
  // l'ordre où elles sont parties, et une réponse en retard écraserait la bonne.
  const requestTokenRef = useRef(0);

  const refresh = useCallback(async () => {
    const camera = cameraRef.current;
    // Sous le seuil, la couche ne dessine rien : inutile de télécharger quoi que ce
    // soit. Les tracés déjà là sont conservés, pour un retour en zoom instantané.
    if (!camera || camera.zoom < TRACE_MIN_ZOOM) return;

    const allIds = hikesRef.current.map((hike) => hike.id);

    // Ce qu'on télécharge : les randos qui *démarrent* autour de l'écran, faute de
    // mieux tant qu'on n'a pas leur géométrie.
    const fetchBounds = padBounds(camera.bounds);
    const candidateIds = hikesRef.current
      .filter((hike) => isInsideBounds(hike, fetchBounds))
      .slice(0, MAX_TRACES_PER_REQUEST)
      .map((hike) => hike.id);

    const token = ++requestTokenRef.current;

    await ensureHikeTraces(candidateIds, camera.bounds);
    if (token !== requestTokenRef.current) return;

    // Ce qu'on dessine : tout tracé connu qui traverse le cadre, y compris ceux
    // récupérés plus tôt et dont le départ est maintenant hors champ. C'est cette
    // seconde passe, relue après le téléchargement, qui évite qu'un tracé
    // disparaisse quand on zoome sur son milieu.
    const visible = getVisibleTraces(allIds, camera.bounds);

    setTraces(
      Array.from(visible, ([id, coordinates]) => ({ id, coordinates })).slice(0, MAX_DRAWN_TRACES)
    );
  }, []);

  const onCameraChange = useCallback(
    (zoom: number, bounds: BoundingBox | null) => {
      cameraRef.current = { zoom, bounds };
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(refresh, CAMERA_SETTLE_DELAY);
    },
    [refresh]
  );

  // Les filtres ont changé : la liste des marqueurs aussi, les tracés doivent la
  // suivre sans attendre le prochain mouvement de caméra.
  useEffect(() => {
    hikesRef.current = hikes;
    refresh();
  }, [hikes, refresh]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    []
  );

  return { traces, onCameraChange };
}
