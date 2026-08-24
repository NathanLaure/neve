/**
 * Envoi des retours : suggestions, corrections et demandes d'assistance.
 *
 * Voir supabase/migrations/20260824_create_feedback.sql pour la table, ses
 * politiques et le bucket `feedback` — privé, contrairement aux avatars : une
 * capture d'écran peut montrer n'importe quoi de l'écran de son auteur.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { supabase } from '@/utils/supabase';

const BUCKET = 'feedback';

/** Les quatre fins de la phrase « Je voudrais… ». */
export type FeedbackIntent = 'problem' | 'data' | 'idea' | 'help';

/** Ce sur quoi porte une correction. Nul pour les trois autres intentions. */
export type FeedbackSubjectKind = 'hike' | 'journey' | 'other';

export interface FeedbackSubmission {
  intent: FeedbackIntent;
  message: string;
  subjectKind?: FeedbackSubjectKind | null;
  /** Identifiant de la randonnée ou de l'aventure concernée, quand on le connaît. */
  subjectId?: string | null;
  /** URI locale de la capture, telle que rendue par le sélecteur d'images. */
  screenshotUri?: string | null;
  /** Écran d'où le formulaire a été ouvert. */
  screen?: string | null;
}

/**
 * Contexte technique joint à chaque envoi.
 *
 * `updateId` est le plus utile de tous : plusieurs mises à jour OTA se
 * succèdent sur un même numéro de build, qui ne suffit donc pas à savoir quel
 * code tournait. En développement il est nul — la session lit le code local et
 * ne passe par aucune mise à jour.
 */
function collectContext() {
  return {
    app_version: Constants.expoConfig?.version ?? null,
    build_number: Constants.expoConfig?.android?.versionCode?.toString() ?? null,
    update_id: Updates.updateId ?? null,
    runtime_version: Updates.runtimeVersion ?? null,
    platform: Platform.OS,
    os_version: String(Platform.Version),
  };
}

/**
 * Envoie la capture et rend son chemin dans le bucket.
 *
 * Le chemin, et non une URL : le bucket est privé, une URL signée expirerait
 * bien avant qu'on lise le message. Premier segment = identifiant du
 * propriétaire, ce sur quoi reposent les politiques.
 */
async function uploadScreenshot(
  userId: string,
  uri: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();

    /* Horodaté et non écrasé : contrairement à l'avatar, chaque retour garde
       la sienne. */
    const path = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
    });

    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (err: any) {
    return { path: null, error: err?.message ?? "L'envoi de la capture a échoué." };
  }
}

/**
 * Enregistre un retour et **attend** que la base l'ait accepté.
 *
 * Une capture qui ne part pas n'annule pas l'envoi : le message vaut mieux
 * seul que perdu. On l'enregistre alors sans elle plutôt que d'annoncer un
 * échec pour une pièce jointe.
 */
export async function submitFeedback(
  userId: string,
  submission: FeedbackSubmission
): Promise<{ error: string | null }> {
  let screenshotPath: string | null = null;

  if (submission.screenshotUri) {
    const { path } = await uploadScreenshot(userId, submission.screenshotUri);
    screenshotPath = path;
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    intent: submission.intent,
    subject_kind: submission.subjectKind ?? null,
    subject_id: submission.subjectId ?? null,
    message: submission.message.trim(),
    screenshot_path: screenshotPath,
    screen: submission.screen ?? null,
    ...collectContext(),
  });

  return { error: error ? error.message : null };
}
