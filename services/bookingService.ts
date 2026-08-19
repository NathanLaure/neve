import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import type { TransitLeg, TransitOption } from '@/services/transitService';

/**
 * Achat des titres de transport.
 *
 * Névé ne vend rien : il prépare la recherche et passe la main au distributeur.
 * Ce module rassemble les liens et la règle qui dit lequel proposer, pour que
 * l'écran de résumé et la fiche d'une aventure enregistrée envoient exactement au
 * même endroit.
 */

export type BookingProvider = 'idfm' | 'trainline' | 'sncf';

export const BOOKING_PROVIDER_LABELS: Record<BookingProvider, string> = {
  idfm: 'Île-de-France Mobilités',
  trainline: 'Trainline',
  sncf: 'SNCF Connect',
};

/**
 * Liens officiels vers les distributeurs (app native et web garanti fonctionnel).
 */
const PROVIDER_LINKS: Record<BookingProvider, { app?: string; web: string }> = {
  idfm: {
    app: 'https://app.idf-mobilites.fr/default',
    web: 'https://app.idf-mobilites.fr/default',
  },
  sncf: {
    app: 'sncfconnect://',
    web: 'https://www.sncf-connect.com/',
  },
  trainline: {
    app: 'trainline://',
    web: 'https://www.thetrainline.com/fr',
  },
};

export interface TrainlineSearchQuery {
  originName: string;
  destinationName: string;
  /** `YYYY-MM-DD` */
  outwardDate: string;
  /** `HH:MM` */
  outwardTime: string;
  /** Absents pour un aller simple : la recherche s'ouvre alors sans retour. */
  returnDate?: string | null;
  returnTime?: string | null;
}

/** URL de recherche Trainline vers la plateforme de réservation. */
export function buildTrainlineSearchUrl(query: TrainlineSearchQuery): string {
  // Lien garanti fonctionnel vers Trainline France
  return 'https://www.thetrainline.com/fr';
}

/**
 * Ouvre le distributeur : son application si elle est installée (App Links / Universal Links), ou le navigateur.
 */
export async function openBookingProvider(
  provider: BookingProvider,
  url?: string
): Promise<boolean> {
  const links = PROVIDER_LINKS[provider];
  const target = url || links.app || links.web;

  try {
    const canOpen = await Linking.canOpenURL(target);
    if (canOpen) {
      await Linking.openURL(target);
      return true;
    }
  } catch {
    // Repli sur le WebBrowser
  }

  try {
    await WebBrowser.openBrowserAsync(target);
    return true;
  } catch {
    try {
      await Linking.openURL(target);
      return true;
    } catch (finalErr) {
      console.warn(`Impossible d'ouvrir le distributeur ${provider} :`, finalErr);
      return false;
    }
  }
}

/**
 * Tronçons à titre de transport, rangés par distributeur.
 *
 * Le réseau francilien (métro, RER, tram, bus) se paie chez Île-de-France
 * Mobilités ; les trains grandes lignes se réservent chez un distributeur SNCF.
 * Un Transilien remonte du calculateur en mode `train` et part donc du côté SNCF,
 * qui vend bien ses billets — la section francilienne reste là pour le métro qui
 * mène à la gare.
 *
 * Les marches n'ont rien à payer et disparaissent des deux listes.
 */
export interface BookableLegs {
  network: TransitLeg[];
  mainLine: TransitLeg[];
}

export function splitBookableLegs(option: TransitOption | null): BookableLegs {
  if (!option) return { network: [], mainLine: [] };

  const network: TransitLeg[] = [];
  const mainLine: TransitLeg[] = [];

  for (const leg of option.legs) {
    if (leg.mode === 'walk') continue;
    if (leg.mode === 'train') mainLine.push(leg);
    else network.push(leg);
  }

  return { network, mainLine };
}

/**
 * Modes physiques Navitia des trains compris dans le pass.
 *
 * `LocalTrain` est le train régional : les Transiliens, et les TER qui entrent en
 * Île-de-France. `RailShuttle` couvre les navettes du même réseau.
 */
const NAVIGO_COVERED_PHYSICAL_MODES = ['localtrain', 'railshuttle'];

/** Mode physique des trains qui restent à acheter : les grandes lignes. */
const NAVIGO_EXCLUDED_PHYSICAL_MODES = ['longdistancetrain'];

/**
 * Marques de trains grandes lignes, pour les réponses où le mode physique manque
 * et où seul le libellé commercial est renseigné.
 */
const MAIN_LINE_BRANDS = [
  'tgv',
  'inoui',
  'ouigo',
  'intercit',
  'lyria',
  'thalys',
  'eurostar',
  'nightjet',
  'renfe',
  'trenitalia',
];

/**
 * Le tronçon est-il compris dans le pass Navigo ?
 *
 * `leg.mode` ne suffit pas à répondre : Transilien, TER, Intercités et TGV y
 * tombent tous dans `train`, alors que le pass couvre les premiers et pas les
 * seconds. C'est le mode Navitia brut, transporté depuis la fonction edge, qui
 * les départage.
 *
 * Les tronçons enregistrés avant que ce champ existe — aventures déjà en base,
 * estimations locales de repli — n'en portent pas : ils sont réputés couverts,
 * toute l'offre desservie par Névé étant francilienne. C'est la même hypothèse
 * qu'avant, mais réduite aux seuls cas où l'on ne sait pas.
 */
export function isNavigoCoveredLeg(leg: TransitLeg): boolean {
  // Métro, RER, tram, bus : le réseau francilien, couvert sans discussion.
  if (leg.mode !== 'train') return true;

  const physical = (leg.physicalMode ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (physical) {
    if (NAVIGO_EXCLUDED_PHYSICAL_MODES.includes(physical)) return false;
    if (NAVIGO_COVERED_PHYSICAL_MODES.includes(physical)) return true;
  }

  const commercial = (leg.commercialMode ?? '').toLowerCase();
  if (commercial) return !MAIN_LINE_BRANDS.some((brand) => commercial.includes(brand));

  return true;
}

/**
 * Le trajet est-il couvert de bout en bout par un pass Navigo ?
 *
 * Un itinéraire entièrement à pied ne coûte rien à personne : il n'est pas
 * « inclus » dans un abonnement, il est simplement hors sujet.
 */
export function isFullyCoveredByNavigo(option: TransitOption | null): boolean {
  if (!option) return false;
  const rides = option.legs.filter((leg) => leg.mode !== 'walk');
  return rides.length > 0 && rides.every(isNavigoCoveredLeg);
}
