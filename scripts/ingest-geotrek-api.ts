import { supabase } from './supabase-admin';

const GEOTREK_ENDPOINTS = [
  {
    name: 'alpes_haute_provence',
    baseUrl: 'https://admin.rando-alpes-haute-provence.fr/api/v2/trek/?format=json',
    citiesUrl: 'https://admin.rando-alpes-haute-provence.fr/api/v2/city/?format=json',
    defaultLocation: 'Alpes-de-Haute-Provence',
  },
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
];

function mapDifficulty(diffId: number | null, distanceKm: number): 'facile' | 'modere' | 'difficile' | 'expert' {
  if (diffId === 1) return 'facile';
  if (diffId === 2) return 'modere';
  if (diffId === 3) return 'difficile';
  if (diffId === 4) return 'expert';

  if (distanceKm < 7) return 'facile';
  if (distanceKm < 14) return 'modere';
  if (distanceKm < 22) return 'difficile';
  return 'expert';
}

function mapRouteType(routeId: number | null): 'boucle' | 'aller_retour' | 'point_a_point' {
  if (routeId === 1) return 'boucle';
  if (routeId === 2) return 'aller_retour';
  return 'point_a_point';
}

function cleanHtml(val: any): string {
  if (!val) return '';
  const str = typeof val === 'string' ? val : typeof val === 'object' && val.fr ? String(val.fr) : String(val);
  return str
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&icirc;/g, 'î')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCitiesMap(citiesUrl: string): Promise<Map<string, string>> {
  const cityMap = new Map<string, string>();
  let pageUrl: string | null = citiesUrl;

  while (pageUrl) {
    try {
      const res: any = await fetch(pageUrl);
      if (!res.ok) break;
      const data: any = await res.json();
      for (const item of data.results || []) {
        if (item.name && item.id) {
          cityMap.set(String(item.id), item.name);
        }
      }
      pageUrl = data.next || null;
    } catch (e) {
      break;
    }
  }

  return cityMap;
}

async function ingestGeotrekAPI() {
  console.log('🧼 Purge préventive de la table hikes...');
  await supabase.from('hikes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  let totalIngested = 0;

  for (const endpoint of GEOTREK_ENDPOINTS) {
    console.log(`🏙️ Chargement de l'annuaire des communes depuis Geotrek...`);
    const cityMap = await loadCitiesMap(endpoint.citiesUrl);
    console.log(`  ✓ ${cityMap.size} communes associées.`);

    console.log(`📡 Téléchargement des randonnées depuis Geotrek (${endpoint.name})...`);
    let pageUrl: string | null = endpoint.baseUrl;
    let pageCount = 0;

    while (pageUrl && pageCount < 10) { // 10 pages (~500 randos)
      pageCount++;
      try {
        const response: any = await fetch(pageUrl);
        if (!response.ok) break;

        const data: any = await response.json();
        const treks = data.results || [];
        console.log(` Page ${pageCount} : ${treks.length} itinéraires récupérés.`);

        const hikesToInsert: any[] = [];

        for (const trek of treks) {
          const title = trek.name?.fr || trek.name?.en || trek.name;
          if (!title || typeof title !== 'string' || title.length < 3) continue;

          const distanceKm = Math.round(((trek.length_2d || 5000) / 1000) * 10) / 10;
          if (distanceKm <= 0.3 || distanceKm > 200) continue;

          // Coordonnées de départ [lat, lng]
          let startLat = 44.0;
          let startLng = 6.0;

          if (trek.departure_geom && Array.isArray(trek.departure_geom) && trek.departure_geom.length >= 2) {
            startLng = trek.departure_geom[0];
            startLat = trek.departure_geom[1];
          } else if (trek.geometry?.coordinates?.[0]) {
            startLng = trek.geometry.coordinates[0][0];
            startLat = trek.geometry.coordinates[0][1];
          }

          // Tracé GeoJSON -> [[lng, lat]]
          const rawCoords = trek.geometry?.coordinates || [];
          const cleanCoords: number[][] = [];

          if (Array.isArray(rawCoords)) {
            for (const pt of rawCoords) {
              if (Array.isArray(pt) && pt.length >= 2) {
                const lng = Math.round(pt[0] * 100000) / 100000;
                const lat = Math.round(pt[1] * 100000) / 100000;
                if (!isNaN(lng) && !isNaN(lat)) {
                  cleanCoords.push([lng, lat]);
                }
              }
            }
          }

          if (cleanCoords.length < 2) continue;

          // Images HD
          const images: string[] = [];
          if (trek.attachments && Array.isArray(trek.attachments)) {
            for (const att of trek.attachments) {
              if (att.url && (att.type === 'image' || att.filetype?.type === 'Photographie')) {
                images.push(att.url);
              }
            }
          }

          const coverImage = images[0] || FALLBACK_IMAGES[totalIngested % FALLBACK_IMAGES.length];
          const durationMin = trek.duration ? Math.round(trek.duration * 60) : Math.round(distanceKm * 18 + 20);
          const difficulty = mapDifficulty(trek.difficulty, distanceKm);
          const routeType = mapRouteType(trek.route);

          const teaser = cleanHtml(trek.description_teaser?.fr || trek.description_teaser);
          const fullDesc = cleanHtml(trek.description?.fr || trek.description);
          const description = teaser || fullDesc || `Magnifique parcours "${title}" situé à ${endpoint.defaultLocation}.`;

          // Extraction ultra propre du nom du village
          let villageName = '';
          if (trek.cities && Array.isArray(trek.cities) && trek.cities.length > 0) {
            const matchedNames = trek.cities
              .map((c: any) => cityMap.get(String(c)))
              .filter(Boolean);
            if (matchedNames.length > 0) {
              villageName = Array.from(new Set(matchedNames)).join(', ');
            }
          }

          if (!villageName) {
            const rawDep = cleanHtml(trek.departure?.fr || trek.departure || trek.arrival?.fr || trek.arrival);
            if (rawDep) {
              const parts = rawDep
                .split(/,|\.|-|à/)
                .map((p) => p.trim())
                .filter((p) => p.length > 2 && !/parking|départ|arrivée|piste|place|mairie|gare|pont|rond-point|rd/i.test(p));
              if (parts.length > 0) {
                villageName = parts[parts.length - 1];
              }
            }
          }

          if (!villageName) {
            villageName = endpoint.defaultLocation;
          }

          const locationName = `${villageName}, Alpes-de-Haute-Provence, France`;
          const slug = `geotrek-${endpoint.name}-${trek.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

          hikesToInsert.push({
            title,
            slug,
            description,
            distance_km: distanceKm,
            elevation_gain_m: Math.abs(trek.ascent || 0),
            elevation_loss_m: Math.abs(trek.descent || 0),
            duration_minutes: durationMin,
            difficulty,
            route_type: routeType,
            start_lat: Math.round(startLat * 100000) / 100000,
            start_lng: Math.round(startLng * 100000) / 100000,
            location_name: locationName,
            geometry: {
              type: 'LineString',
              coordinates: cleanCoords,
            },
            cover_image_url: coverImage,
            gallery_urls: images.slice(0, 5),
            gpx_url: trek.gpx || null,
            source: `geotrek_${endpoint.name}`,
            source_id: `geotrek-${trek.id}`,
            updated_at: new Date().toISOString(),
          });
        }

        if (hikesToInsert.length > 0) {
          const { error } = await supabase.from('hikes').upsert(hikesToInsert, { onConflict: 'source,source_id' });
          if (error) {
            console.error(`❌ Erreur upsert page ${pageCount}:`, error.message);
          } else {
            totalIngested += hikesToInsert.length;
            console.log(`  ✓ Page ${pageCount} insérée (${hikesToInsert.length} randos)`);
          }
        }

        pageUrl = data.next || null;
      } catch (err: any) {
        console.error(`💥 Erreur sur la page ${pageCount}:`, err.message);
        break;
      }
    }
  }

  console.log(`\n🎉 Ingestion Geotrek terminée avec succès ! TOTAL : ${totalIngested} randonnées avec villages qualifiés en base.`);
}

ingestGeotrekAPI().catch((err) => {
  console.error('💥 Erreur lors du script :', err);
  process.exit(1);
});
