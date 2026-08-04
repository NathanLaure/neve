import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gealgvgsnhskyrbbnxay.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlYWxndmdzbmhza3lyYmJueGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjM2NzEsImV4cCI6MjA5NjQ5OTY3MX0.Cx7HazV2sW85bKBFYiML4RcaXPDoWpcMBH8Xp8oU7Vc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_FILE_PATH = 'data/hiking_foot_routes_line.csv';
// Limite configurable via variable d'environnement (ex: LIMIT=5000 npm run seed:csv)
const MAX_HIKES_TO_IMPORT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 3000;

// Conversion EPSG:3857 (Web Mercator) vers WGS84 (Longitude, Latitude)
function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lng = (x / 6378137.0) * (180 / Math.PI);
  const lat = (Math.atan(Math.sinh(y / 6378137.0))) * (180 / Math.PI);
  return [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000];
}

// Convertit la chaîne MULTILINESTRING / LINESTRING du CSV en coordonnées GeoJSON WGS84
function parseGeometry(geomStr: string): { type: 'LineString'; coordinates: number[][] } | null {
  if (!geomStr) return null;

  // Extraire tous les couples de nombres
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

  return {
    type: 'LineString',
    coordinates,
  };
}

// Parse la durée au format HH:MM ou minutes
function parseDurationMinutes(durationStr: string, distanceKm: number): number {
  if (durationStr && durationStr.includes(':')) {
    const parts = durationStr.split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }
  const parsed = parseInt(durationStr, 10);
  if (!isNaN(parsed) && parsed > 0) return parsed;
  
  // Estimation : ~18 min par km + 20 min de pause
  return Math.round(distanceKm * 18 + 20);
}

// Détermine la difficulté
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

// Images de couverture haute qualité selon le niveau
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
];

async function runCsvIngestion() {
  console.log(`🌲 Lecture du fichier CSV : ${CSV_FILE_PATH}...`);

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Le fichier ${CSV_FILE_PATH} n'existe pas.`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(CSV_FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  const hikesBatch: any[] = [];
  let lineCount = 0;
  let successCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      // Extraction des en-têtes CSV
      headers = line.split(',').map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''));
      continue;
    }

    // Parser sommaire du CSV (en tenant compte des guillemets)
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    const row: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] !== undefined ? match[1] : match[2];
      row.push(val ? val.trim() : '');
    }

    if (row.length < headers.length - 2) continue;

    const rowData: Record<string, string> = {};
    headers.forEach((h, index) => {
      rowData[h] = row[index] || '';
    });

    const name = rowData['name'] || rowData['ref'];
    if (!name || name.length < 3) continue; // Ignorer les sentiers sans nom

    const distanceKm = parseFloat(rowData['distance']);
    if (isNaN(distanceKm) || distanceKm <= 0.5 || distanceKm > 150) continue; // Ignorer distances absurde

    const geomStr = rowData['the_geom'];
    const geometry = parseGeometry(geomStr);
    if (!geometry || geometry.coordinates.length < 2) continue;

    const [startLng, startLat] = geometry.coordinates[0];
    const durationMinutes = parseDurationMinutes(rowData['duration'], distanceKm);
    const difficulty = parseDifficulty(rowData['sac_scale'], distanceKm);
    const routeType = rowData['roundtrip'] === 'yes' ? 'boucle' : 'aller_retour';
    const osmId = rowData['osm_id'] || rowData['FID'] || `generated-${lineCount}`;
    const slug = `osm-${osmId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    // Estimation réaliste du dénivelé (D+)
    const elevFactor = difficulty === 'facile' ? 25 : difficulty === 'modere' ? 45 : difficulty === 'difficile' ? 70 : 110;
    const elevationGain = Math.round(distanceKm * elevFactor);
    const elevationLoss = routeType === 'boucle' ? elevationGain : Math.round(elevationGain * 0.95);

    const fromLoc = rowData['from'] ? `Départ : ${rowData['from']}` : '';
    const toLoc = rowData['to'] ? `Arrivée : ${rowData['to']}` : '';
    const locationName = [rowData['from'], rowData['to'], rowData['operator']].filter(Boolean).join(' - ') || 'France';
    const description = rowData['description'] || rowData['note'] || `Itinéraire de randonnée "${name}". ${fromLoc} ${toLoc}`.trim();
    const coverImage = COVER_IMAGES[lineCount % COVER_IMAGES.length];

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
      geometry,
      cover_image_url: coverImage,
      gallery_urls: [coverImage],
      source: 'osm_france',
      source_id: `osm-${osmId}`,
      updated_at: new Date().toISOString(),
    });

    if (hikesBatch.length >= MAX_HIKES_TO_IMPORT) break;
  }

  console.log(`📦 ${hikesBatch.length} randonnées prêtes pour l'insertion dans Supabase...`);

  // Insertion par paquets de 50
  const BATCH_SIZE = 50;
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

  console.log(`\n🎉 Ingestion CSV terminée ! TOTAL : ${successCount} randonnées insérées avec succès dans Supabase.`);
}

runCsvIngestion().catch((err) => {
  console.error('💥 Erreur lors du script d\'ingestion :', err);
  process.exit(1);
});
