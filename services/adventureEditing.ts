import type { PlannedAdventure } from '@/context/AdventureContext';
import { isOneWayAdventure } from '@/context/AdventureContext';
import type { EditedPlan } from '@/context/PlanDraftContext';
import { fromTrainOption } from '@/services/transitService';

/**
 * Reprise d'une aventure enregistrée pour en corriger un trajet.
 *
 * Deux écrans ouvrent ce parcours — la feuille d'options d'une aventure et les
 * boutons « Modifier » du résumé — et ils doivent le faire à l'identique : ce qui
 * n'est pas transmis ici est définitivement perdu, l'écran d'arrivée retomberait
 * sur le GPS et sur aujourd'hui.
 */

/**
 * Contexte de planification transporté par l'URL vers `/plan/outward`,
 * `/plan/return` ou `/plan/dates`.
 *
 * Les coordonnées du départ en font partie, et c'est le point important : sans
 * elles, l'écran d'arrivée retombe sur la position de l'appareil et recalcule les
 * itinéraires depuis là où se trouve le téléphone au moment de la correction —
 * alors que le nom affiché, lui, reste celui du départ d'origine. On planifie de
 * chez soi, on corrige l'aller depuis le bureau, et on se voit proposer des
 * trains au départ du bureau.
 *
 * Elles restent absentes des aventures enregistrées avant la colonne
 * `departure_lat` : l'ancien repli sur la position de l'appareil vaut alors
 * toujours, faute de mieux.
 */
export function buildAdventurePlanParams(adventure: PlannedAdventure) {
  const returnCoords = adventure.returnCoords ?? adventure.departureCoords;

  return {
    randoId: adventure.randoId,
    departureName: adventure.departureStationName,
    returnName: adventure.returnStationName ?? adventure.departureStationName,
    /* Chaînes et non nombres : un paramètre d'URL n'en transporte pas d'autres.
       Omis plutôt que vides quand l'aventure n'en a pas — `parseCoordinates`
       rejette la chaîne vide, mais un paramètre absent se lit plus franchement
       comme « on ne sait pas ». */
    ...(adventure.departureCoords
      ? {
          departureLat: String(adventure.departureCoords.latitude),
          departureLng: String(adventure.departureCoords.longitude),
        }
      : {}),
    ...(returnCoords
      ? {
          returnLat: String(returnCoords.latitude),
          returnLng: String(returnCoords.longitude),
        }
      : {}),
    outwardDate: adventure.outwardDate,
    outwardTime: adventure.outwardTrain.time,
    returnDate: adventure.returnDate,
    returnTime: adventure.returnTrain.time,
    passengersCount: adventure.passengersCount,
    passengers: JSON.stringify(adventure.passengers ?? []),
    isReversed: String(adventure.isReversed ?? false),
  };
}

/**
 * Brouillon posé avant d'aller rechoisir un trajet.
 *
 * Les deux trajets de l'aventure y sont réinjectés, y compris celui qu'on part
 * remplacer : tant que rien n'a été retenu sur l'écran de choix, revenir en
 * arrière doit rendre le voyage intact. Vider le trajet visé d'entrée le faisait
 * disparaître du résumé au premier retour.
 *
 * Le type de voyage suit l'aventure : corriger l'aller d'un aller simple ne doit
 * pas lui inventer un retour.
 */
export function buildAdventureEdit(adventure: PlannedAdventure): EditedPlan {
  const isOneWay = isOneWayAdventure(adventure);

  return {
    startDate: adventure.outwardDate,
    endDate: isOneWay ? null : adventure.returnDate,
    tripType: isOneWay ? 'oneway' : 'round',
    outwardJourney: fromTrainOption(adventure.outwardTrain),
    outwardIsRealtime: adventure.outwardTrain.isRealtime ?? false,
    /* Sur un aller simple, `returnTrain` n'est que l'aller recopié — le
       restaurer ferait passer le voyage pour un aller-retour complet. */
    returnJourney: isOneWay ? null : fromTrainOption(adventure.returnTrain),
    returnIsRealtime: isOneWay ? false : (adventure.returnTrain.isRealtime ?? false),
    savedAdventureId: adventure.id,
  };
}

/** Repli pour le retour tant qu'on ne sait pas à quelle heure la marche s'achève. */
const DEFAULT_RETURN_TIME = '16:00';
/** On ne propose pas de retour au-delà : les dessertes franciliennes se raréfient. */
const LATEST_RETURN_TIME_MINUTES = 21 * 60;

/**
 * Heure à partir de laquelle chercher un retour : l'arrivée de l'aller, plus la
 * durée de la marche.
 *
 * Même règle que l'écran de planification, où elle s'applique à l'aller qu'on
 * vient de retenir. Ici l'aller est déjà enregistré, mais la question est la
 * même : proposer des trains avant que le randonneur soit redescendu n'a pas de
 * sens. Sans arrivée ni durée connue, on retombe sur le milieu d'après-midi.
 */
export function suggestReturnTime(arrivalTime?: string, durationHours?: number): string {
  /* Les deux sont nécessaires : sans durée, ajouter zéro proposerait de repartir
     à la seconde où l'on descend du train. */
  if (!arrivalTime || !durationHours || durationHours <= 0) return DEFAULT_RETURN_TIME;

  const [hours, minutes] = arrivalTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return DEFAULT_RETURN_TIME;

  const readyAt = hours * 60 + minutes + Math.round(durationHours * 60);
  const capped = Math.min(readyAt, LATEST_RETURN_TIME_MINUTES);
  return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
}
