import * as fs from 'fs';

interface StationRaw {
  id?: string;
  nom: string;
  libellecourt?: string;
  position_geographique?: {
    lat: number;
    lon: number;
  };
  codeinsee?: string;
  codes_uic?: string;
}

export interface IDFStation {
  id: string;
  name: string;
  shortCode?: string;
  latitude: number;
  longitude: number;
  insee?: string;
  uic?: string;
  lines?: string[];
}

async function buildIDFStations() {
  console.log('🔄 Fetching SNCF train stations dataset...');
  let allStations: IDFStation[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/records?limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    const data = (await res.json()) as { total_count: number; results: StationRaw[] };

    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      if (r.position_geographique) {
        const { lat, lon } = r.position_geographique;
        // Bounding box élargie Île-de-France + bordures proches (Oise, Eure, Eure-et-Loir, Loiret, Yonne)
        if (lat >= 48.0 && lat <= 49.3 && lon >= 1.3 && lon <= 3.7) {
          const insee = r.codeinsee || '';

          allStations.push({
            id: r.id || r.codes_uic || `station-${allStations.length + 1}`,
            name: r.nom.trim(),
            shortCode: r.libellecourt,
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lon.toFixed(5)),
            insee,
            uic: r.codes_uic,
          });
        }
      }
    }

    offset += limit;
    if (offset >= data.total_count) break;
  }

  // Deduplicate by name + position
  const uniqueStationsMap = new Map<string, IDFStation>();
  for (const s of allStations) {
    const key = `${s.name.toLowerCase()}-${s.latitude.toFixed(3)}-${s.longitude.toFixed(3)}`;
    if (!uniqueStationsMap.has(key)) {
      uniqueStationsMap.set(key, s);
    }
  }

  const finalStations = Array.from(uniqueStationsMap.values());
  console.log(`✅ Extracted ${finalStations.length} train stations in & around Île-de-France.`);

  fs.writeFileSync('data/idf-train-stations.json', JSON.stringify(finalStations, null, 2), 'utf-8');
  console.log('💾 Saved to data/idf-train-stations.json');
}

buildIDFStations().catch(console.error);
