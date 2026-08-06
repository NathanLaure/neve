import { supabase } from './supabase-admin';
import * as fs from 'fs';
import * as readline from 'readline';

// Charge EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN depuis .env (pas de dépendance dotenv dans ce projet)
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

// Génère une miniature Mapbox Static Images avec le vrai tracé du sentier superposé
// (même approche que components/RandoCard.tsx côté client)
function buildTrailThumbnailUrl(geometry: { coordinates: number[][] }): string | null {
  if (!MAPBOX_TOKEN) return null;

  const maxPoints = 30;
  const step = Math.max(1, Math.floor(geometry.coordinates.length / maxPoints));
  const sampled = geometry.coordinates.filter((_, idx) => idx % step === 0 || idx === geometry.coordinates.length - 1);

  const lons = sampled.map((p) => p[0]);
  const lats = sampled.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const centerLat = Number(((minLat + maxLat) / 2).toFixed(4));
  const centerLon = Number(((minLon + maxLon) / 2).toFixed(4));

  const coordinates = sampled.map((p) => `[${p[0].toFixed(4)},${p[1].toFixed(4)}]`).join(',');
  const geojson = `{"type":"Feature","properties":{"stroke":"#eb490b","stroke-width":3.5,"stroke-opacity":0.95},"geometry":{"type":"LineString","coordinates":[${coordinates}]}}`;

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

const NOMINATIM_USER_AGENT = 'neve-hiking-app-import/1.0 (contact: nathan.laure.laure@gmail.com)';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Cache par coordonnées arrondies (~100m) pour éviter de refaire le même géocodage
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
    // Respect de la politique d'usage Nominatim : max 1 requête/seconde
    await sleep(1100);
  }
}

// Cherche une photo d'illustration de la commune via l'API MediaWiki (fr), avec une taille de
// miniature explicite : l'API REST /page/summary renvoie parfois "thumbnail"/"originalimage" à
// pleine résolution (jusqu'à plusieurs Mo), ce que <Image> de RN charge silencieusement en échec
// (pas de onError dans l'app) et affiche comme une zone vide sans aucune erreur.
// Les images Wikipedia proviennent de Wikimedia Commons, sous licences libres (CC-BY-SA / domaine public)
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
    // Retire les paramètres de tracking (utm_source, etc.) ajoutés par l'API Wikipedia :
    // inutiles pour charger l'image, et potentiellement bloqués par des bloqueurs de trackers.
    const rawUrl: string | null = page?.thumbnail?.source || null;
    const imageUrl = rawUrl ? rawUrl.split('?')[0] : null;
    wikiImageCache.set(commune, imageUrl);
    return imageUrl;
  } catch {
    wikiImageCache.set(commune, null);
    return null;
  }
}

const CSV_FILE_PATH = 'data/hiking_foot_routes_line.csv';
const IDF_BOUNDARY_PATH = 'data/idf-boundary.geojson';
const STATIONS_FILE_PATH = 'data/idf-train-stations.json';

interface IDFStation {
  id: string;
  name: string;
  shortCode?: string;
  latitude: number;
  longitude: number;
  insee?: string;
  uic?: string;
}

// Load IDF train stations
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
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestStation(
  lat: number,
  lon: number
): { station: IDFStation; distanceKm: number } | null {
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

  if (nearest && minDistance <= 8.0) {
    return { station: nearest, distanceKm: minDistance };
  }
  return null;
}

// DRY_RUN=false pour réellement écrire dans Supabase. Par défaut on écrit juste un aperçu JSON.
const DRY_RUN = process.env.DRY_RUN !== 'false';
const OUTPUT_PATH = 'data/preview-hikes-idf.json';

// Bounding box grossière pour un rejet rapide avant le test point-dans-polygone (perf)
const IDF_BBOX = { minLat: 48.05, maxLat: 49.25, minLng: 1.40, maxLng: 3.60 };

const idfBoundary: { type: string; geometry: { type: string; coordinates: number[][][] } } = JSON.parse(
  fs.readFileSync(IDF_BOUNDARY_PATH, 'utf-8')
);
const idfRing = idfBoundary.geometry.coordinates[0]; // polygone simple, un seul anneau

// Ray casting : test point-dans-polygone précis sur le contour réel de l'Île-de-France
function isInsideIDF(lng: number, lat: number): boolean {
  if (lat < IDF_BBOX.minLat || lat > IDF_BBOX.maxLat || lng < IDF_BBOX.minLng || lng > IDF_BBOX.maxLng) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = idfRing.length - 1; i < idfRing.length; j = i++) {
    const [xi, yi] = idfRing[i];
    const [xj, yj] = idfRing[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Conversion EPSG:3857 (Web Mercator) vers WGS84 (Longitude, Latitude)
function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lng = (x / 6378137.0) * (180 / Math.PI);
  const lat = Math.atan(Math.sinh(y / 6378137.0)) * (180 / Math.PI);
  return [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000];
}

// Convertit la chaîne MULTILINESTRING / LINESTRING du CSV en coordonnées GeoJSON WGS84
function parseGeometry(geomStr: string): { type: 'LineString'; coordinates: number[][] } | null {
  if (!geomStr) return null;

  const matches = geomStr.match(/([0-9]+\.?[0-9]*)\s+([0-9]+\.?[0-9]*)/g);
  if (!matches || matches.length === 0) return null;

  const coordinates: number[][] = [];
  for (const match of matches) {
    const [xStr, yStr] = match.split(/\s+/);
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    if (!isNaN(x) && !isNaN(y)) {
      const [lng, lat] = webMercatorToWGS84(x, y);
      coordinates.push([lng, lat]);
    }
  }

  if (coordinates.length < 2) return null;

  return { type: 'LineString', coordinates };
}

function parseDurationMinutes(durationStr: string, distanceKm: number): number {
  if (durationStr && durationStr.includes(':')) {
    const parts = durationStr.split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }
  const parsed = parseInt(durationStr, 10);
  if (!isNaN(parsed) && parsed > 0) return parsed;

  return Math.round(distanceKm * 18 + 20);
}

function parseDifficulty(sacScale: string, distanceKm: number): 'facile' | 'modere' | 'difficile' | 'expert' {
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

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
];

function parseCsvLine(line: string, headers: string[]): Record<string, string> | null {
  const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
  const row: string[] = [];
  let match;
  let lastIndex = -1;
  while ((match = regex.exec(line)) !== null) {
    if (regex.lastIndex === lastIndex) break; // ligne vide / boucle vide
    lastIndex = regex.lastIndex;
    const val = match[1] !== undefined ? match[1] : match[2];
    row.push(val ? val.trim() : '');
  }
  if (row.length < headers.length - 2) return null;

  const rowData: Record<string, string> = {};
  headers.forEach((h, index) => {
    rowData[h] = row[index] || '';
  });
  return rowData;
}

async function run() {
  console.log(`🌲 Lecture du fichier CSV : ${CSV_FILE_PATH}...`);
  console.log(DRY_RUN ? '🔎 Mode DRY_RUN : aucune écriture en base, aperçu JSON uniquement.' : '⚠️  Écriture réelle dans Supabase activée (DRY_RUN=false).');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Le fichier ${CSV_FILE_PATH} n'existe pas.`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(CSV_FILE_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  const hikesBatch: any[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      headers = line.split(',').map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''));
      continue;
    }

    const rowData = parseCsvLine(line, headers);
    if (!rowData) continue;

    const name = rowData['name'] || rowData['ref'];
    if (!name || name.length < 3) continue;

    const distanceKm = parseFloat(rowData['distance']);
    if (isNaN(distanceKm) || distanceKm <= 0.5 || distanceKm > 150) continue;

    const geomStr = rowData['the_geom'];
    const geometry = parseGeometry(geomStr);
    if (!geometry || geometry.coordinates.length < 2) continue;

    const [startLng, startLat] = geometry.coordinates[0];

    // Filtre Île-de-France (test géométrique précis, pas juste une bbox)
    if (!isInsideIDF(startLng, startLat)) continue;

    const [endLng, endLat] = geometry.coordinates[geometry.coordinates.length - 1];

    // Compute nearest stations
    const startStationMatch = findNearestStation(startLat, startLng);
    const endStationMatch = findNearestStation(endLat, endLng);

    const startStationName = startStationMatch ? `Gare de ${startStationMatch.station.name}` : 'Gare Île-de-France';
    const startStationLat = startStationMatch ? startStationMatch.station.latitude : startLat;
    const startStationLng = startStationMatch ? startStationMatch.station.longitude : startLng;

    const endStationName = endStationMatch ? `Gare de ${endStationMatch.station.name}` : startStationName;
    const endStationLat = endStationMatch ? endStationMatch.station.latitude : endLat;
    const endStationLng = endStationMatch ? endStationMatch.station.longitude : endLng;

    // Détermine si c'est une boucle ou une traversée gare-à-gare
    let routeType: 'boucle' | 'point_a_point' | 'aller_retour' = 'boucle';
    if (rowData['roundtrip'] === 'yes') {
      routeType = 'boucle';
    } else if (startStationMatch && endStationMatch && startStationMatch.station.id !== endStationMatch.station.id) {
      routeType = 'point_a_point'; // Traversée Gare A -> Gare B !
    } else {
      routeType = 'boucle';
    }

    const durationMinutes = parseDurationMinutes(rowData['duration'], distanceKm);
    const difficulty = parseDifficulty(rowData['sac_scale'], distanceKm);
    const osmId = rowData['osm_id'] || rowData['FID'] || `generated-${lineCount}`;
    const slug = `osm-idf-${osmId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    const elevFactor = difficulty === 'facile' ? 25 : difficulty === 'modere' ? 45 : difficulty === 'difficile' ? 70 : 110;
    const elevationGain = Math.round(distanceKm * elevFactor);
    const elevationLoss = routeType === 'boucle' ? elevationGain : Math.round(elevationGain * 0.95);

    const fromLoc = rowData['from'] ? `Départ : ${rowData['from']}` : '';
    const toLoc = rowData['to'] ? `Arrivée : ${rowData['to']}` : '';
    const locationName = [rowData['from'], rowData['to'], rowData['operator']].filter(Boolean).join(' - ') || 'Île-de-France';
    const description = rowData['description'] || rowData['note'] || `Itinéraire de randonnée "${name}". Accès par ${startStationName}. ${fromLoc} ${toLoc}`.trim();

    // Priorité d'image : vraie photo Wikipedia de la commune > miniature Mapbox du tracé > photo stock générique
    const commune = await reverseGeocodeCommune(startLat, startLng);
    const wikiImage = commune ? await fetchWikipediaCommuneImage(commune) : null;
    const coverImage = wikiImage || buildTrailThumbnailUrl(geometry) || COVER_IMAGES[lineCount % COVER_IMAGES.length];

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
      geometry,
      cover_image_url: coverImage,
      gallery_urls: [coverImage],
      source: 'osm_idf',
      source_id: `osm-idf-${osmId}`,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`📦 ${hikesBatch.length} randonnées Île-de-France trouvées.`);

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

  console.log(`\n🎉 Ingestion IDF terminée ! TOTAL : ${successCount} randonnées insérées avec succès dans Supabase.`);
}

run().catch((err) => {
  console.error("💥 Erreur lors du script d'ingestion :", err);
  process.exit(1);
});
