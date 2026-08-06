import { supabase } from './supabase-admin';
import { formatStationLabel } from '../utils/stationLabel';
import * as fs from 'fs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Même source que rando-facile.fr : itinéraires OSM (relations route=hiking) + relief réel IGN RGE ALTI,
// au lieu du CSV `hiking_foot_routes_line.csv` (incomplet et de mauvaise qualité).

// --- Mapbox (miniature du tracé, identique à RandoCard.tsx / ingest-csv-hikes-idf.ts) ---
function loadMapboxToken(): string | null {
  if (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) return process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/^EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
const MAPBOX_TOKEN = loadMapboxToken();

function samplePoints<T>(points: T[], maxPoints: number): T[] {
  const step = Math.max(1, Math.floor(points.length / maxPoints));
  return points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);
}

function buildTrailThumbnailUrl(coordinates: number[][]): string | null {
  if (!MAPBOX_TOKEN) return null;

  const sampled = samplePoints(coordinates, 30);
  const lons = sampled.map((p) => p[0]);
  const lats = sampled.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const centerLat = Number(((minLat + maxLat) / 2).toFixed(4));
  const centerLon = Number(((minLon + maxLon) / 2).toFixed(4));

  const coordsStr = sampled.map((p) => `[${p[0].toFixed(4)},${p[1].toFixed(4)}]`).join(',');
  const geojson = `{"type":"Feature","properties":{"stroke":"#eb490b","stroke-width":3.5,"stroke-opacity":0.95},"geometry":{"type":"LineString","coordinates":[${coordsStr}]}}`;

  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;
  const maxDiff = Math.max(latDiff, lonDiff);
  let zoom = 12.2;
  if (maxDiff > 0.15) zoom = 9.5;
  else if (maxDiff > 0.08) zoom = 10.5;
  else if (maxDiff > 0.04) zoom = 11.2;
  else if (maxDiff > 0.02) zoom = 11.8;

  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/geojson(${encodeURIComponent(geojson)})/${centerLon},${centerLat},${zoom},0/800x500@2x?access_token=${MAPBOX_TOKEN}`;
}

// --- Nominatim (commune) + Wikipedia (photo commune) ---
const NOMINATIM_USER_AGENT = 'neve-hiking-app-import/1.0 (contact: nathan.laure.laure@gmail.com)';
const communeCache = new Map<string, string | null>();
const wikiImageCache = new Map<string, string | null>();

async function reverseGeocodeCommune(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (communeCache.has(cacheKey)) return communeCache.get(cacheKey)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { 'User-Agent': NOMINATIM_USER_AGENT } }
    );
    if (!res.ok) {
      communeCache.set(cacheKey, null);
      return null;
    }
    const json: any = await res.json();
    const commune = json.address?.city || json.address?.town || json.address?.village || json.address?.municipality || null;
    communeCache.set(cacheKey, commune);
    return commune;
  } catch {
    communeCache.set(cacheKey, null);
    return null;
  } finally {
    await sleep(1100); // politique d'usage Nominatim : max 1 requête/seconde
  }
}

const WIKI_THUMB_WIDTH = 1200;
async function fetchWikipediaCommuneImage(commune: string): Promise<string | null> {
  if (wikiImageCache.has(commune)) return wikiImageCache.get(commune)!;

  try {
    const url = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(commune)}&prop=pageimages&format=json&pithumbsize=${WIKI_THUMB_WIDTH}`;
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) {
      wikiImageCache.set(commune, null);
      return null;
    }
    const json: any = await res.json();
    const pages = json.query?.pages || {};
    const page: any = Object.values(pages)[0];
    const rawUrl: string | null = page?.thumbnail?.source || null;
    const imageUrl = rawUrl ? rawUrl.split('?')[0] : null;
    wikiImageCache.set(commune, imageUrl);
    return imageUrl;
  } catch {
    wikiImageCache.set(commune, null);
    return null;
  }
}

// --- Gares Île-de-France (aller/retour "gare à gare") ---
const STATIONS_FILE_PATH = 'data/idf-train-stations.json';
interface IDFStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}
let idfStations: IDFStation[] = [];
if (fs.existsSync(STATIONS_FILE_PATH)) {
  idfStations = JSON.parse(fs.readFileSync(STATIONS_FILE_PATH, 'utf-8'));
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestStation(lat: number, lon: number): { station: IDFStation; distanceKm: number } | null {
  if (idfStations.length === 0) return null;
  let nearest: IDFStation | null = null;
  let minDistance = Infinity;
  for (const s of idfStations) {
    const dist = getDistanceKm(lat, lon, s.latitude, s.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = s;
    }
  }
  return nearest && minDistance <= 8.0 ? { station: nearest, distanceKm: minDistance } : null;
}

// --- Frontière Île-de-France (filet de sécurité en plus du filtre Overpass) ---
const IDF_BOUNDARY_PATH = 'data/idf-boundary.geojson';
const IDF_BBOX = { minLat: 48.05, maxLat: 49.25, minLng: 1.4, maxLng: 3.6 };
const idfBoundary: { geometry: { coordinates: number[][][] } } = JSON.parse(fs.readFileSync(IDF_BOUNDARY_PATH, 'utf-8'));
const idfRing = idfBoundary.geometry.coordinates[0];

function isInsideIDF(lng: number, lat: number): boolean {
  if (lat < IDF_BBOX.minLat || lat > IDF_BBOX.maxLat || lng < IDF_BBOX.minLng || lng > IDF_BBOX.maxLng) return false;
  let inside = false;
  for (let i = 0, j = idfRing.length - 1; i < idfRing.length; j = i++) {
    const [xi, yi] = idfRing[i];
    const [xj, yj] = idfRing[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// --- Overpass : téléchargement des relations route=hiking en Île-de-France ---
const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

// Requête par bounding box plutôt que par area OSM : plus robuste (l'index des areas Overpass
// est parfois en retard/instable), le filtre précis se fait ensuite via isInsideIDF().
const OVERPASS_QUERY = `
[out:json][timeout:180];
relation["route"="hiking"](${IDF_BBOX.minLat},${IDF_BBOX.minLng},${IDF_BBOX.maxLat},${IDF_BBOX.maxLng});
out body;
>;
out geom qt;
`;

interface OverpassGeomPoint {
  lat: number;
  lon: number;
}
interface OverpassWay {
  type: 'way';
  id: number;
  geometry?: OverpassGeomPoint[];
}
interface OverpassRelation {
  type: 'relation';
  id: number;
  tags?: Record<string, string>;
  members: { type: string; ref: number; role: string }[];
}

async function fetchOverpassData(): Promise<{ relations: OverpassRelation[]; waysById: Map<number, OverpassWay> }> {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`📡 Interrogation d'Overpass (${endpoint})...`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': NOMINATIM_USER_AGENT },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });
      if (!res.ok) {
        console.warn(`  ⚠️ HTTP ${res.status} sur ${endpoint}`);
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      const json: any = await res.json();
      const elements: any[] = json.elements || [];
      const relations = elements.filter((e) => e.type === 'relation') as OverpassRelation[];
      const waysById = new Map<number, OverpassWay>();
      for (const e of elements) {
        if (e.type === 'way') waysById.set(e.id, e as OverpassWay);
      }
      console.log(`  ✅ ${relations.length} relations "route=hiking" et ${waysById.size} segments (ways) reçus.`);
      return { relations, waysById };
    } catch (err) {
      console.warn(`  ⚠️ ${endpoint} injoignable :`, (err as Error).message);
      lastError = err;
    }
  }
  throw lastError ?? new Error('Tous les endpoints Overpass ont échoué.');
}

// --- Reconstruction du tracé continu à partir des segments (ways) de la relation ---
function closeEnough(a: OverpassGeomPoint, b: OverpassGeomPoint, eps = 1e-6): boolean {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lon - b.lon) < eps;
}

function stitchSegments(segments: OverpassGeomPoint[][]): OverpassGeomPoint[][] {
  const remaining = segments.map((s) => [...s]);
  const chains: OverpassGeomPoint[][] = [];

  while (remaining.length > 0) {
    let chain = remaining.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const chainStart = chain[0];
        const chainEnd = chain[chain.length - 1];
        const segStart = seg[0];
        const segEnd = seg[seg.length - 1];

        if (closeEnough(chainEnd, segStart)) {
          chain = chain.concat(seg.slice(1));
        } else if (closeEnough(chainEnd, segEnd)) {
          chain = chain.concat([...seg].reverse().slice(1));
        } else if (closeEnough(chainStart, segEnd)) {
          chain = seg.slice(0, -1).concat(chain);
        } else if (closeEnough(chainStart, segStart)) {
          chain = [...seg].reverse().slice(0, -1).concat(chain);
        } else {
          continue;
        }
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains;
}

function chainLengthKm(chain: OverpassGeomPoint[]): number {
  let total = 0;
  for (let i = 1; i < chain.length; i++) {
    total += getDistanceKm(chain[i - 1].lat, chain[i - 1].lon, chain[i].lat, chain[i].lon);
  }
  return total;
}

// --- Élévation réelle via l'API altimétrique IGN (RGE ALTI, Licence Ouverte, gratuite) ---
const IGN_ELEVATION_URL = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json';
const ELEV_BATCH_SIZE = 50;
const ELEV_NOISE_THRESHOLD_M = 2; // ignore le bruit du RGE ALTI sous ce seuil pour ne pas gonfler le D+/D-

async function fetchElevations(coordinates: number[][]): Promise<number[] | null> {
  const points = samplePoints(coordinates, 120); // [lng, lat][]
  const elevations: number[] = [];

  for (let i = 0; i < points.length; i += ELEV_BATCH_SIZE) {
    const batch = points.slice(i, i + ELEV_BATCH_SIZE);
    const lons = batch.map((p) => p[0].toFixed(5)).join('|');
    const lats = batch.map((p) => p[1].toFixed(5)).join('|');
    const url = `${IGN_ELEVATION_URL}?lon=${lons}&lat=${lats}&resource=ign_rge_alti_wld`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: any = await res.json();
      for (const e of json.elevations || []) elevations.push(e.z);
    } catch {
      return null;
    }
    await sleep(250);
  }

  return elevations.length === points.length ? elevations : null;
}

function computeElevationGainLoss(elevations: number[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (Math.abs(diff) < ELEV_NOISE_THRESHOLD_M) continue;
    if (diff > 0) gain += diff;
    else loss += -diff;
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

// --- Tags OSM -> champs de l'app ---
function parseDifficulty(sacScale: string | undefined, distanceKm: number): 'facile' | 'modere' | 'difficile' | 'expert' {
  if (sacScale) {
    const scale = sacScale.toLowerCase();
    if (scale.includes('hiking') || scale.includes('t1')) return 'facile';
    if (scale.includes('mountain') || scale.includes('t2')) return 'modere';
    if (scale.includes('demanding') || scale.includes('t3') || scale.includes('t4')) return 'difficile';
    if (scale.includes('alpine') || scale.includes('t5') || scale.includes('t6')) return 'expert';
  }
  if (distanceKm < 7) return 'facile';
  if (distanceKm < 14) return 'modere';
  if (distanceKm < 22) return 'difficile';
  return 'expert';
}

// Règle de Naismith (1h/5km + 1h/600m de D+), plus fiable que l'ancienne estimation
// distance-seule maintenant qu'on dispose d'un vrai dénivelé IGN.
function estimateDurationMinutes(tagDuration: string | undefined, distanceKm: number, elevationGainM: number): number {
  if (tagDuration && tagDuration.includes(':')) {
    const [h, m] = tagDuration.split(':');
    const mins = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
    if (mins > 0) return mins;
  }
  return Math.round(distanceKm * 12 + elevationGainM * 0.1);
}

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
];

const DRY_RUN = process.env.DRY_RUN !== 'false';
const OUTPUT_PATH = 'data/preview-hikes-osm-overpass-idf.json';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
// Rôles de membres de relation à inclure dans le tracé principal (on exclut alternate/approach/excursion)
const PRIMARY_ROLES = new Set(['', 'main', 'forward', 'backward']);

async function run() {
  console.log(DRY_RUN ? '🔎 Mode DRY_RUN : aucune écriture en base, aperçu JSON uniquement.' : '⚠️  Écriture réelle dans Supabase activée (DRY_RUN=false).');

  const { relations, waysById } = await fetchOverpassData();

  const hikesBatch: any[] = [];
  let processed = 0;
  let skippedNoName = 0;
  let skippedNoGeometry = 0;
  let skippedBadDistance = 0;
  let skippedOutsideIDF = 0;

  for (const relation of relations) {
    if (processed >= LIMIT) break;

    const tags = relation.tags || {};
    const name = tags.name || (tags.from && tags.to ? `${tags.from} → ${tags.to}` : null);
    if (!name || name.length < 3) {
      skippedNoName++;
      continue;
    }

    const memberWays = relation.members
      .filter((m) => m.type === 'way' && PRIMARY_ROLES.has(m.role))
      .map((m) => waysById.get(m.ref))
      .filter((w): w is OverpassWay => !!w?.geometry && w.geometry.length >= 2);

    if (memberWays.length === 0) {
      skippedNoGeometry++;
      continue;
    }

    const chains = stitchSegments(memberWays.map((w) => w.geometry!));
    chains.sort((a, b) => chainLengthKm(b) - chainLengthKm(a));
    const mainChain = chains[0];
    if (!mainChain || mainChain.length < 2) {
      skippedNoGeometry++;
      continue;
    }

    const coordinates = mainChain.map((p) => [Math.round(p.lon * 100000) / 100000, Math.round(p.lat * 100000) / 100000]);
    const distanceKm = chainLengthKm(mainChain);
    if (distanceKm <= 0.5 || distanceKm > 150) {
      skippedBadDistance++;
      continue;
    }

    const [startLng, startLat] = coordinates[0];
    if (!isInsideIDF(startLng, startLat)) {
      skippedOutsideIDF++;
      continue;
    }
    const [endLng, endLat] = coordinates[coordinates.length - 1];

    processed++;
    console.log(`[${processed}] ${name} (${distanceKm.toFixed(1)} km)`);

    // Gares les plus proches (concept "gare à gare" de l'app)
    const startStationMatch = findNearestStation(startLat, startLng);
    const endStationMatch = findNearestStation(endLat, endLng);
    const startStationName = startStationMatch
      ? formatStationLabel(startStationMatch.station.name)
      : 'Gare Île-de-France';
    const startStationLat = startStationMatch ? startStationMatch.station.latitude : startLat;
    const startStationLng = startStationMatch ? startStationMatch.station.longitude : startLng;
    const endStationName = endStationMatch
      ? formatStationLabel(endStationMatch.station.name)
      : startStationName;
    const endStationLat = endStationMatch ? endStationMatch.station.latitude : endLat;
    const endStationLng = endStationMatch ? endStationMatch.station.longitude : endLng;

    let routeType: 'boucle' | 'point_a_point' | 'aller_retour' = 'boucle';
    if (tags.roundtrip === 'yes') {
      routeType = 'boucle';
    } else if (startStationMatch && endStationMatch && startStationMatch.station.id !== endStationMatch.station.id) {
      routeType = 'point_a_point';
    }

    // Dénivelé réel via l'API IGN (remplace l'ancienne estimation distance × facteur)
    const elevations = await fetchElevations(coordinates);
    const { gain: elevationGain, loss: elevationLoss } = elevations
      ? computeElevationGainLoss(elevations)
      : { gain: Math.round(distanceKm * 45), loss: Math.round(distanceKm * 45) }; // repli si l'API IGN est indisponible

    const difficulty = parseDifficulty(tags.sac_scale, distanceKm);
    const durationMinutes = estimateDurationMinutes(tags.duration, distanceKm, elevationGain);

    const fromLoc = tags.from ? `Départ : ${tags.from}` : '';
    const toLoc = tags.to ? `Arrivée : ${tags.to}` : '';
    const locationName = [tags.from, tags.to, tags.operator].filter(Boolean).join(' - ') || 'Île-de-France';
    const description = tags.description || tags.note || `Itinéraire de randonnée "${name}". Accès par ${startStationName}. ${fromLoc} ${toLoc}`.trim();

    const commune = await reverseGeocodeCommune(startLat, startLng);
    const wikiImage = commune ? await fetchWikipediaCommuneImage(commune) : null;
    const coverImage = wikiImage || buildTrailThumbnailUrl(coordinates) || COVER_IMAGES[processed % COVER_IMAGES.length];

    const slug = `osm-rel-${relation.id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    hikesBatch.push({
      title: name,
      slug,
      description,
      distance_km: Math.round(distanceKm * 10) / 10,
      elevation_gain_m: elevationGain,
      elevation_loss_m: elevationLoss,
      duration_minutes: durationMinutes,
      difficulty,
      route_type: routeType,
      start_lat: startLat,
      start_lng: startLng,
      location_name: locationName,
      start_station_name: startStationName,
      start_station_lat: startStationLat,
      start_station_lng: startStationLng,
      end_station_name: endStationName,
      end_station_lat: endStationLat,
      end_station_lng: endStationLng,
      geometry: { type: 'LineString', coordinates },
      cover_image_url: coverImage,
      gallery_urls: [coverImage],
      source: 'osm_overpass_idf',
      source_id: `osm-rel-${relation.id}`,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(
    `\n📦 ${hikesBatch.length} randonnées retenues (rejets : ${skippedNoName} sans nom, ${skippedNoGeometry} sans géométrie exploitable, ${skippedBadDistance} distance hors bornes, ${skippedOutsideIDF} hors IDF).`
  );

  if (DRY_RUN) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(hikesBatch, null, 2), 'utf-8');
    console.log(`✅ Aperçu écrit dans ${OUTPUT_PATH}. Relance avec DRY_RUN=false pour insérer réellement dans Supabase.`);
    return;
  }

  const BATCH_SIZE = 50;
  let successCount = 0;
  for (let i = 0; i < hikesBatch.length; i += BATCH_SIZE) {
    const chunk = hikesBatch.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('hikes').upsert(chunk, { onConflict: 'source,source_id' });
    if (error) {
      console.error(`❌ Erreur lors de l'insertion du lot ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      successCount += chunk.length;
      console.log(`  ✓ Lot ${Math.floor(i / BATCH_SIZE) + 1} inséré (${chunk.length} randos)`);
    }
  }

  console.log(`\n🎉 Ingestion Overpass IDF terminée ! TOTAL : ${successCount} randonnées insérées avec succès dans Supabase.`);
}

run().catch((err) => {
  console.error("💥 Erreur lors du script d'ingestion :", err);
  process.exit(1);
});
