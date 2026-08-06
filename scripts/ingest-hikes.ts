import { supabase } from './supabase-admin';

interface SeedHike {
  title: string;
  slug: string;
  description: string;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  duration_minutes: number;
  difficulty: 'facile' | 'modere' | 'difficile' | 'expert';
  route_type: 'boucle' | 'aller_retour' | 'point_a_point';
  start_lat: number;
  start_lng: number;
  location_name: string;
  cover_image_url: string;
  gallery_urls: string[];
  source: 'geotrek_ecrins' | 'geotrek_mercantour' | 'decathlon_outdoor' | 'osm';
  source_id: string;
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

const SAMPLE_HIKES: SeedHike[] = [
  {
    title: 'Le Lac Blanc & Les Aiguilles Rouges',
    slug: 'lac-blanc-aiguilles-rouges',
    description: 'Une randonnée spectaculaire face au massif du Mont-Blanc. Le panorama sur la Mer de Glace et les Grandes Jorasses depuis le refuge du Lac Blanc est incontournable.',
    distance_km: 10.5,
    elevation_gain_m: 680,
    elevation_loss_m: 680,
    duration_minutes: 270,
    difficulty: 'modere',
    route_type: 'boucle',
    start_lat: 45.9625,
    start_lng: 6.8833,
    location_name: 'Chamonix-Mont-Blanc, Haute-Savoie',
    cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80'
    ],
    source: 'decathlon_outdoor',
    source_id: 'decathlon-lac-blanc-01',
    geometry: {
      type: 'LineString',
      coordinates: [
        [6.8833, 45.9625],
        [6.8870, 45.9660],
        [6.8920, 45.9710],
        [6.8980, 45.9760],
        [6.8833, 45.9625]
      ]
    }
  },
  {
    title: 'Le Cirque de Gavarnie & Cascade',
    slug: 'cirque-de-gavarnie-cascade',
    description: 'Au cœur du Parc National des Pyrénées, découvrez le gigantesque mur calcaire de 1500m de haut et la plus grande cascade d\'Europe occidentale.',
    distance_km: 8.2,
    elevation_gain_m: 280,
    elevation_loss_m: 280,
    duration_minutes: 180,
    difficulty: 'facile',
    route_type: 'aller_retour',
    start_lat: 42.7356,
    start_lng: -0.0108,
    location_name: 'Gavarnie-Gèdre, Hautes-Pyrénées',
    cover_image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80'
    ],
    source: 'osm',
    source_id: 'osm-gavarnie-102',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.0108, 42.7356],
        [-0.0080, 42.7290],
        [-0.0050, 42.7210],
        [-0.0030, 42.7150]
      ]
    }
  },
  {
    title: 'Le Tour des Lacs des 7 Laux',
    slug: 'tour-lacs-7-laux',
    description: 'Une superbe immersion dans le massif de Belledonne reliant une succession de lacs glaciaires turquoise (Lac Noir, Lac Carré, Lac Cottepens).',
    distance_km: 14.8,
    elevation_gain_m: 1150,
    elevation_loss_m: 1150,
    duration_minutes: 360,
    difficulty: 'difficile',
    route_type: 'boucle',
    start_lat: 45.2280,
    start_lng: 6.0420,
    location_name: 'Le Pleynet, Isère',
    cover_image_url: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    source: 'geotrek_ecrins',
    source_id: 'geotrek-7laux-03',
    geometry: {
      type: 'LineString',
      coordinates: [
        [6.0420, 45.2280],
        [6.0510, 45.2310],
        [6.0620, 45.2390],
        [6.0580, 45.2450],
        [6.0420, 45.2280]
      ]
    }
  },
  {
    title: 'Sentier des Douaniers - Cap Fréhel',
    slug: 'sentier-douaniers-cap-frehel',
    description: 'Randonnée côtière le long du GR34 entre les falaises de grès rose et la lande bretonne, menant au phare du Cap Fréhel et au Fort La Latte.',
    distance_km: 12.0,
    elevation_gain_m: 210,
    elevation_loss_m: 210,
    duration_minutes: 210,
    difficulty: 'facile',
    route_type: 'aller_retour',
    start_lat: 48.6833,
    start_lng: -2.3167,
    location_name: 'Plévenon, Côtes-d\'Armor',
    cover_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    source: 'decathlon_outdoor',
    source_id: 'decathlon-cap-frehel-88',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-2.3167, 48.6833],
        [-2.3050, 48.6870],
        [-2.2920, 48.6910],
        [-2.2810, 48.6940]
      ]
    }
  },
  {
    title: 'L\'Ascension du Pic du Midi d\'Ossau',
    slug: 'ascension-pic-du-midi-d-ossau',
    description: 'Un sommet mythique du Béarn réservé aux randonneurs aguerris. Le tour de Jean-Pierre offre des vues vertigineuses sur la vallée d\'Ossau et les lacs d\'Ayous.',
    distance_km: 16.2,
    elevation_gain_m: 1420,
    elevation_loss_m: 1420,
    duration_minutes: 480,
    difficulty: 'expert',
    route_type: 'boucle',
    start_lat: 42.8460,
    start_lng: -0.4280,
    location_name: 'Laruns, Pyrénées-Atlantiques',
    cover_image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    source: 'osm',
    source_id: 'osm-ossau-554',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.4280, 42.8460],
        [-0.4210, 42.8510],
        [-0.4120, 42.8480],
        [-0.4280, 42.8460]
      ]
    }
  },
  {
    title: 'Le Puy de Sancy par les Crêtes',
    slug: 'puy-de-sancy-cretes',
    description: 'Le point culminant du Massif Central (1886m). Randonnée grandiose traversant le Val de Courre et les crêtes volcaniques d\'Auvergne.',
    distance_km: 11.4,
    elevation_gain_m: 750,
    elevation_loss_m: 750,
    duration_minutes: 250,
    difficulty: 'modere',
    route_type: 'boucle',
    start_lat: 45.5250,
    start_lng: 2.8120,
    location_name: 'Mont-Dore, Puy-de-Dôme',
    cover_image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    source: 'decathlon_outdoor',
    source_id: 'decathlon-sancy-12',
    geometry: {
      type: 'LineString',
      coordinates: [
        [2.8120, 45.5250],
        [2.8190, 45.5310],
        [2.8250, 45.5380],
        [2.8120, 45.5250]
      ]
    }
  }
];

async function fetchFromGeotrekEcrins() {
  console.log('📡 Interrogation de l\'API Geotrek du Parc National des Écrins...');
  try {
    const res = await fetch('https://randonnees.ecrins-parcnational.fr/api/v2/trek/?format=json&page_size=5');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    console.log(`✅ ${data.results?.length || 0} randonnées trouvées sur Geotrek Écrins.`);
    return data.results || [];
  } catch (err) {
    console.warn('⚠️ Impossible de joindre l\'API Geotrek Écrins live:', err);
    return [];
  }
}

async function ingest() {
  console.log('🚀 Début de l\'ingestion des randonnées Névé dans Supabase...');

  // 1. Insertion des données d'exemples structurées
  let insertedCount = 0;
  for (const hike of SAMPLE_HIKES) {
    const { error } = await supabase.from('hikes').upsert(
      {
        title: hike.title,
        slug: hike.slug,
        description: hike.description,
        distance_km: hike.distance_km,
        elevation_gain_m: hike.elevation_gain_m,
        elevation_loss_m: hike.elevation_loss_m,
        duration_minutes: hike.duration_minutes,
        difficulty: hike.difficulty,
        route_type: hike.route_type,
        start_lat: hike.start_lat,
        start_lng: hike.start_lng,
        location_name: hike.location_name,
        cover_image_url: hike.cover_image_url,
        gallery_urls: hike.gallery_urls,
        geometry: hike.geometry,
        source: hike.source,
        source_id: hike.source_id,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'source,source_id' }
    );

    if (error) {
      console.error(`❌ Erreur lors de l'insertion de "${hike.title}":`, error.message);
    } else {
      insertedCount++;
      console.log(`  ✓ Randonnée insérée/mise à jour : ${hike.title}`);
    }
  }

  // 2. Optionnel : Ingestion d'itinéraires en direct via Geotrek API Open Data
  const geotrekTreks = await fetchFromGeotrekEcrins();
  for (const trek of geotrekTreks) {
    if (!trek.name) continue;
    const slug = trek.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const distanceKm = Math.round((trek.length_2d || 5000) / 100) / 10;
    const durationMin = trek.duration ? Math.round(trek.duration * 60) : 180;
    const startCoords = trek.first_point?.coordinates || [6.2, 44.9];

    const { error } = await supabase.from('hikes').upsert(
      {
        title: trek.name,
        slug: `ecrins-${trek.id}-${slug}`,
        description: trek.description_teaser || trek.description || 'Randonnée dans le Parc National des Écrins.',
        distance_km: distanceKm,
        elevation_gain_m: trek.ascent || 300,
        elevation_loss_m: trek.descent || 300,
        duration_minutes: durationMin,
        difficulty: trek.difficulty === 1 ? 'facile' : trek.difficulty === 2 ? 'modere' : 'difficile',
        route_type: 'boucle',
        start_lat: startCoords[1],
        start_lng: startCoords[0],
        location_name: 'Parc National des Écrins, Hautes-Alpes',
        cover_image_url: trek.attachments?.[0]?.url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        gallery_urls: trek.attachments?.slice(1).map((a: any) => a.url) || [],
        source: 'geotrek_ecrins',
        source_id: `geotrek-ecrins-${trek.id}`,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'source,source_id' }
    );

    if (!error) {
      insertedCount++;
      console.log(`  ✓ Geotrek Écrins inséré : ${trek.name}`);
    }
  }

  console.log(`\n🎉 Ingestion terminée avec succès ! TOTAL : ${insertedCount} randonnées en base.`);
}

ingest().catch((err) => {
  console.error('💥 Une erreur s\'est produite lors de l\'ingestion :', err);
  process.exit(1);
});
