/**
 * Photo de profil : envoi et suppression dans le bucket `avatars`.
 *
 * Voir supabase/migrations/20260818_create_avatars_bucket.sql pour le bucket et
 * ses politiques — l'écriture y est cloisonnée par utilisateur, le premier
 * segment du chemin devant être son identifiant.
 */
import { supabase } from '@/utils/supabase';

const BUCKET = 'avatars';

/**
 * Un seul objet par compte, écrasé à chaque changement, sans extension : le
 * type est porté par les métadonnées, et un passage de JPEG à PNG laisserait
 * sinon un orphelin derrière lui.
 */
function avatarPath(userId: string): string {
  return `${userId}/avatar`;
}

/**
 * Envoie l'image pointée par `uri` et renvoie son URL publique.
 *
 * Le chemin étant fixe, l'URL l'est aussi : sans quoi le CDN continuerait de
 * servir l'ancienne photo. D'où l'horodatage en paramètre, qui change à chaque
 * envoi et force le rechargement.
 */
export async function uploadAvatar(
  userId: string,
  uri: string,
  mimeType?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // `arrayBuffer()` plutôt qu'un aller-retour par le base64 : React Native sait
    // lire une URI `file://` par fetch, et l'image n'a pas à transiter en texte.
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(avatarPath(userId), bytes, {
        contentType: mimeType || 'image/jpeg',
        upsert: true,
      });

    if (error) return { url: null, error: error.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(avatarPath(userId));
    return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message ?? "L'envoi de la photo a échoué." };
  }
}

/** Retire la photo du bucket. L'effacement de `profiles.avatar_url` reste à l'appelant. */
export async function removeAvatar(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(BUCKET).remove([avatarPath(userId)]);
  return { error: error ? error.message : null };
}
