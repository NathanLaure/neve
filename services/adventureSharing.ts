import type { PlannedAdventure } from '@/context/AdventureContext';
import { isOneWayAdventure } from '@/context/AdventureContext';
import { formatAdventureRange } from '@/components/plan/DateRangeCalendar';

/** Message d'invitation prêt à partir, et le jeton qui lui donne son adresse. */
export interface AdventureShare {
  /**
   * Jeton du lien de partage. Créé ici s'il manquait : c'est à l'appelant de
   * l'enregistrer sur l'aventure, sans quoi un second partage de la même sortie
   * pointerait vers une autre adresse.
   */
  shareToken: string;
  isNewToken: boolean;
  title: string;
  message: string;
  url: string;
}

function createShareToken(): string {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Compose l'invitation d'une aventure enregistrée.
 *
 * Deux écrans partagent la même sortie — la feuille d'options d'une carte et le
 * récapitulatif — et doivent envoyer le même message : c'est la même aventure,
 * elle ne peut pas se raconter différemment selon le bouton emprunté.
 */
/**
 * Racine des liens de partage, sur l'hôte canonique.
 *
 * `www` et non l'apex, qui répond 308 vers lui : Android ne suit pas les
 * redirections pour aller lire `/.well-known/assetlinks.json`, l'apex ne peut
 * donc pas être vérifié et un lien qui le porte ouvre le navigateur au lieu de
 * l'application.
 */
export const SHARE_BASE_URL = 'https://www.neve-rando.fr/share';

export function buildAdventureShare(
  adventure: PlannedAdventure,
  options: { hikeTitle: string; isPast?: boolean }
): AdventureShare {
  const { hikeTitle, isPast = false } = options;
  const isOneWay = isOneWayAdventure(adventure);

  const isNewToken = !adventure.shareToken;
  const shareToken = adventure.shareToken ?? createShareToken();
  const url = `${SHARE_BASE_URL}/${shareToken}`;

  const dateStr = formatAdventureRange(
    adventure.outwardDate,
    isOneWay ? null : adventure.returnDate
  );

  const lines = [
    isPast
      ? `🌲 J'ai fait cette rando : ${hikeTitle}`
      : `🌲 Viens avec moi à l'aventure : ${hikeTitle} !`,
    '',
    `📅 Date : ${dateStr}`,
    `🚆 Train aller : ${adventure.outwardTrain.time} (départ de ${adventure.departureStationName})`,
    isOneWay ? null : `🚆 Train retour : ${adventure.returnTrain.time}`,
    '',
    "🗺️ Retrouve la feuille de route, les horaires et l'itinéraire ici :",
    url,
  ].filter((line) => line !== null);

  return {
    shareToken,
    isNewToken,
    title: `Aventure Névé : ${hikeTitle}`,
    message: lines.join('\n'),
    url,
  };
}
