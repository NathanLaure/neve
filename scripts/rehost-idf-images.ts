import { supabase } from './supabase-admin';

const BUCKET = 'hike-images';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

async function fetchWithRetry(url: string, maxRetries = 5): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'neve-hiking-app-import/1.0 (contact: nathan.laure.laure@gmail.com)' },
    });
    if (res.ok) return res;
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
      const backoffMs = !isNaN(retryAfter) ? retryAfter * 1000 : 2000 * Math.pow(2, attempt);
      console.warn(`  ⏳ 429 reçu, nouvelle tentative dans ${Math.round(backoffMs / 1000)}s...`);
      await sleep(backoffMs);
      continue;
    }
    return res;
  }
  return null;
}

async function rehostOne(sourceId: string, wikiUrl: string): Promise<string | null> {
  const res = await fetchWithRetry(wikiUrl);
  if (!res || !res.ok) {
    console.warn(`  ⚠️  Téléchargement échoué (${res?.status ?? 'timeout'}) pour ${sourceId}`);
    return null;
  }
  const contentType = res.headers.get('content-type');
  const ext = extFromContentType(contentType);
  const buffer = Buffer.from(await res.arrayBuffer());
  const path = `${sourceId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType || 'image/jpeg',
  });
  if (error) {
    // Déjà présent (relance du script) : on récupère quand même l'URL publique existante
    if (!error.message.includes('already exists')) {
      console.warn(`  ⚠️  Upload échoué pour ${sourceId}:`, error.message);
      return null;
    }
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

async function run() {
  console.log('🔍 Recherche des randos IDF avec une image Wikipedia à rapatrier...');

  const { data: hikes, error } = await supabase
    .from('hikes')
    .select('id, source_id, title, cover_image_url, gallery_urls')
    .in('source', ['osm_idf', 'osm_overpass_idf'])
    .like('cover_image_url', '%wikimedia.org%');

  if (error) {
    console.error('❌ Erreur de lecture:', error.message);
    process.exit(1);
  }

  const limit = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : hikes.length;
  const toProcess = hikes.slice(0, limit);
  console.log(`📦 ${hikes.length} randos concernées, ${toProcess.length} vont être traitées.`);

  let successCount = 0;
  let failCount = 0;

  for (const hike of toProcess) {
    const newUrl = await rehostOne(hike.source_id, hike.cover_image_url);
    if (!newUrl) {
      failCount++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('hikes')
      .update({ cover_image_url: newUrl, gallery_urls: [newUrl] })
      .eq('id', hike.id);

    if (updateError) {
      console.warn(`  ⚠️  Mise à jour échouée pour "${hike.title}":`, updateError.message);
      failCount++;
    } else {
      successCount++;
      console.log(`  ✓ ${hike.title} -> ${newUrl}`);
    }

    await sleep(1500); // reste courtois envers les serveurs Wikimedia (429 rencontrés à 200ms)
  }

  console.log(`\n🎉 Terminé : ${successCount} images rapatriées, ${failCount} échecs sur ${hikes.length}.`);
}

run().catch((err) => {
  console.error('💥 Erreur:', err);
  process.exit(1);
});
