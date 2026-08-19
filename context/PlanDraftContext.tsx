import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { addDays, toISODate } from '@/components/plan/DateRangeCalendar';
import { fetchTransitHorizon, TransitOption } from '@/services/transitService';

export type TripType = 'round' | 'oneway';

/**
 * Choix en cours de planification, partagés par les écrans du parcours.
 *
 * Ils vivent ici et non dans l'écran de planification parce que le calendrier est
 * une route à part, présentée en modale : deux écrans frères dans la même pile,
 * sans autre parent commun que la racine. Les faire dialoguer par paramètres
 * d'URL imposerait un effet de synchronisation dans les deux sens — c'est
 * exactement ce transport manuel d'état qui avait fait perdre le lieu de retour et
 * la date de retour entre la planification et les écrans aller/retour.
 *
 * Les itinéraires retenus l'ont rejoint pour une autre raison : un `TransitOption`
 * porte tous ses tronçons et leurs perturbations, soit plusieurs kilo-octets que
 * l'écran de résumé doit afficher intégralement. Les faire transiter en JSON dans
 * l'URL les rendrait illisibles et fragiles. Le reste du contexte (point de
 * départ, lieu de retour, sens de parcours, voyageurs) continue de passer par
 * paramètres : ce sont des scalaires, ils y sont à leur place.
 */
export interface PlanDraft {
  /** `YYYY-MM-DD`. `null` tant que l'utilisateur n'a pas sélectionné de date. */
  startDate: string | null;
  /** `null` tant que l'utilisateur n'a pas posé de retour explicite. */
  endDate: string | null;
  tripType: TripType;
  /** L'utilisateur a choisi son retour lui-même, le calcul auto ne s'applique plus. */
  hasCustomReturn: boolean;
  /**
   * `HH:MM` — heure à partir de laquelle chercher l'aller. Elle se choisit dans
   * la même modale que les dates, et se réajuste depuis l'écran de résultats.
   */
  outwardTime: string;
  /** Les dates ont été confirmées dans la modale : la suite du formulaire s'ouvre. */
  datesValidated: boolean;
  /** Itinéraire d'aller retenu sur `/plan/outward`. */
  outwardJourney: TransitOption | null;
  /** Itinéraire de retour retenu sur `/plan/return`. Nul en aller simple. */
  returnJourney: TransitOption | null;
  /**
   * Les horaires retenus viennent du calculateur et non de l'estimation locale.
   * Enregistré avec l'aventure : sans lui, une estimation de repli s'y figerait
   * en horaire ferme.
   */
  outwardIsRealtime: boolean;
  returnIsRealtime: boolean;
  /**
   * Aventure déjà enregistrée depuis le résumé de ce parcours.
   *
   * Elle ne peut pas vivre dans l'écran de résumé : revenir modifier l'aller le
   * démonte, et le résumé suivant en rouvrirait un neuf — qui enregistrerait une
   * deuxième aventure au lieu de corriger la première.
   */
  savedAdventureId: string | null;
}

/** Les seuls champs que la modale des dates a la charge de poser. */
export type PlanDates = Pick<
  PlanDraft,
  'startDate' | 'endDate' | 'tripType' | 'hasCustomReturn' | 'outwardTime'
>;

/** Ce qu'une aventure enregistrée rend au brouillon pour lui ajouter un retour. */
export interface RestoredPlan {
  startDate: string;
  endDate: string | null;
  outwardJourney: TransitOption;
  outwardIsRealtime: boolean;
  savedAdventureId: string;
}

/**
 * Ce qu'une aventure enregistrée rend au brouillon pour qu'on en corrige un trajet.
 *
 * Contrairement à `RestoredPlan`, le type de voyage suit : reprendre l'aller d'un
 * aller simple ne doit pas lui inventer un retour au passage.
 */
export interface EditedPlan {
  startDate: string;
  endDate: string | null;
  tripType: TripType;
  /**
   * Trajets déjà retenus, réinjectés tels quels — y compris celui qu'on part
   * remplacer : abandonner la modification en cours de route doit laisser
   * l'aventure exactement dans l'état où on l'a trouvée. C'est
   * `selectOutwardJourney` qui périmera le retour, et seulement si un nouvel
   * aller est réellement retenu.
   */
  outwardJourney: TransitOption | null;
  outwardIsRealtime: boolean;
  returnJourney: TransitOption | null;
  returnIsRealtime: boolean;
  savedAdventureId: string;
}

interface PlanDraftContextValue {
  draft: PlanDraft;
  /** Enregistre un choix de dates et le marque comme confirmé. */
  commitDates: (dates: PlanDates) => void;
  /**
   * Retient l'itinéraire d'aller choisi. Le retour déjà retenu est effacé :
   * revenir modifier l'aller change l'heure à laquelle le retour est possible,
   * le précédent n'a plus de raison d'être proposé au résumé.
   *
   * `keepReturn` lève cette règle, pour le seul cas où l'on vient corriger
   * l'aller d'un voyage déjà complet : effacer le retour obligerait à le
   * rechoisir, alors que ce n'est précisément pas ce qu'on est venu faire.
   */
  selectOutwardJourney: (
    journey: TransitOption,
    isRealtime: boolean,
    options?: { keepReturn?: boolean }
  ) => void;
  /** Retient l'itinéraire de retour choisi. */
  selectReturnJourney: (journey: TransitOption, isRealtime: boolean) => void;
  /**
   * Transforme un aller simple en aller-retour depuis le récapitulatif, sans
   * repasser par le calendrier.
   *
   * Contrairement à `commitDates`, l'aller déjà retenu est conservé : on ajoute
   * un retour à un voyage construit, on ne recommence pas la planification.
   */
  addReturnTrip: (endDate: string | null) => void;
  /**
   * Repart d'une aventure déjà enregistrée pour lui ajouter un retour, sans
   * refaire le parcours depuis le début.
   *
   * L'aller est réinjecté tel qu'il a été retenu, et l'identifiant de l'aventure
   * suit : le résumé corrigera la fiche existante au lieu d'en déposer une
   * seconde.
   */
  restoreForReturn: (restored: RestoredPlan) => void;
  /**
   * Repart d'une aventure enregistrée pour en corriger un trajet, depuis la
   * feuille d'options du récapitulatif ou les boutons « Modifier » du résumé.
   *
   * Ne fait que positionner le brouillon — dates, type de voyage, aventure visée.
   * Rien n'est effacé au passage : le randonneur qui repart sans rien choisir
   * doit retrouver son voyage intact.
   */
  restoreForEdit: (edited: EditedPlan) => void;
  /** Note l'aventure enregistrée, pour que le résumé la corrige au lieu d'en créer une autre. */
  setSavedAdventureId: (id: string) => void;
  /**
   * Réajuste la seule heure d'aller, sans repasser par la modale : l'écran de
   * résultats la propose pendant qu'on parcourt la liste des trains.
   */
  setOutwardTime: (time: string) => void;
  /** Repart d'un brouillon vierge, à l'ouverture d'une nouvelle planification. */
  resetDraft: () => void;
  /**
   * Dernière date pour laquelle le calculateur a des horaires. Récupérée une
   * seule fois ici plutôt que dans chaque écran : le calendrier et l'écran de
   * planification en ont besoin tous les deux pour borner la sélection.
   */
  horizon: string;
}

/** Repli pour le calendrier : 1 an complet (365 jours). */
const FALLBACK_HORIZON_DAYS = 365;

/** Heure d'aller par défaut : partir tôt laisse la journée entière pour marcher. */
const DEFAULT_OUTWARD_TIME = '08:00';

function createEmptyDraft(): PlanDraft {
  return {
    startDate: null,
    endDate: null,
    tripType: 'round',
    hasCustomReturn: false,
    outwardTime: DEFAULT_OUTWARD_TIME,
    datesValidated: false,
    outwardJourney: null,
    returnJourney: null,
    outwardIsRealtime: false,
    returnIsRealtime: false,
    savedAdventureId: null,
  };
}

const PlanDraftContext = createContext<PlanDraftContextValue | null>(null);

export function PlanDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PlanDraft>(createEmptyDraft);
  const [horizon, setHorizon] = useState<string>(() =>
    addDays(toISODate(new Date()), FALLBACK_HORIZON_DAYS)
  );

  useEffect(() => {
    let isStale = false;
    fetchTransitHorizon().then((value) => {
      if (!isStale) setHorizon(value);
    });
    return () => {
      isStale = true;
    };
  }, []);

  const commitDates = useCallback((dates: PlanDates) => {
    // Changer les dates invalide les itinéraires déjà retenus : ils portent des
    // horaires calculés pour l'ancienne journée.
    setDraft((current) => ({
      ...current,
      ...dates,
      datesValidated: true,
      outwardJourney: null,
      returnJourney: null,
    }));
  }, []);

  const selectOutwardJourney = useCallback(
    (journey: TransitOption, isRealtime: boolean, options?: { keepReturn?: boolean }) => {
      setDraft((current) => ({
        ...current,
        outwardJourney: journey,
        outwardIsRealtime: isRealtime,
        returnJourney: options?.keepReturn ? current.returnJourney : null,
      }));
    },
    []
  );

  const selectReturnJourney = useCallback((journey: TransitOption, isRealtime: boolean) => {
    setDraft((current) => ({ ...current, returnJourney: journey, returnIsRealtime: isRealtime }));
  }, []);

  const restoreForReturn = useCallback((restored: RestoredPlan) => {
    setDraft((current) => ({
      ...current,
      startDate: restored.startDate,
      endDate: restored.endDate,
      tripType: 'round',
      datesValidated: true,
      hasCustomReturn: false,
      outwardTime: restored.outwardJourney.departureTime || current.outwardTime,
      outwardJourney: restored.outwardJourney,
      outwardIsRealtime: restored.outwardIsRealtime,
      // Le retour est précisément ce qu'on part chercher.
      returnJourney: null,
      // L'aventure existe déjà : le résumé devra la corriger, pas en créer une
      // seconde à côté.
      savedAdventureId: restored.savedAdventureId,
    }));
  }, []);

  const restoreForEdit = useCallback((edited: EditedPlan) => {
    setDraft((current) => ({
      ...current,
      startDate: edited.startDate,
      // Un aller simple n'a pas de date de retour à retenir, même si l'aventure
      // en porte une par recopie de l'aller.
      endDate: edited.tripType === 'oneway' ? null : edited.endDate,
      tripType: edited.tripType,
      datesValidated: true,
      hasCustomReturn: edited.tripType === 'round' && edited.endDate != null,
      outwardTime: edited.outwardJourney?.departureTime || current.outwardTime,
      outwardJourney: edited.outwardJourney,
      outwardIsRealtime: edited.outwardIsRealtime,
      returnJourney: edited.tripType === 'oneway' ? null : edited.returnJourney,
      returnIsRealtime: edited.returnIsRealtime,
      savedAdventureId: edited.savedAdventureId,
    }));
  }, []);

  const addReturnTrip = useCallback((endDate: string | null) => {
    setDraft((current) => ({
      ...current,
      tripType: 'round',
      /* La date reçue l'emporte : elle sort du calendrier qu'on vient de faire
         remplir. Celle déjà dans le brouillon est un reliquat de l'aller simple
         — sur ce type de voyage, la date de retour recopie celle du départ. */
      endDate: endDate ?? current.endDate,
      // Le retour vient d'être daté à la main, il ne doit plus être recalculé.
      hasCustomReturn: endDate != null,
    }));
  }, []);

  const setSavedAdventureId = useCallback((savedAdventureId: string) => {
    setDraft((current) => ({ ...current, savedAdventureId }));
  }, []);

  const setOutwardTime = useCallback((outwardTime: string) => {
    setDraft((current) => ({ ...current, outwardTime }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(createEmptyDraft());
  }, []);

  const value = useMemo<PlanDraftContextValue>(
    () => ({
      draft,
      commitDates,
      selectOutwardJourney,
      selectReturnJourney,
      addReturnTrip,
      restoreForReturn,
      restoreForEdit,
      setSavedAdventureId,
      setOutwardTime,
      resetDraft,
      horizon,
    }),
    [
      draft,
      commitDates,
      selectOutwardJourney,
      selectReturnJourney,
      addReturnTrip,
      restoreForReturn,
      restoreForEdit,
      setSavedAdventureId,
      setOutwardTime,
      resetDraft,
      horizon,
    ]
  );

  return <PlanDraftContext.Provider value={value}>{children}</PlanDraftContext.Provider>;
}

export function usePlanDraft(): PlanDraftContextValue {
  const context = useContext(PlanDraftContext);
  if (!context) {
    throw new Error('usePlanDraft doit être utilisé sous un PlanDraftProvider');
  }
  return context;
}

/**
 * Date de retour effective. Un aller simple n'en a pas ; sinon c'est le retour
 * choisi, à défaut celui calculé sur la durée de la rando.
 */
export function resolveEndDate(draft: PlanDraft, autoReturnDate: string | null): string | null {
  return draft.tripType === 'oneway' ? null : (draft.endDate ?? autoReturnDate);
}

/**
 * Heures de marche au-delà desquelles la rando déborde sur un jour de plus.
 * Sert à pré-remplir la date de retour : 402 des 431 randos franciliennes tiennent
 * sous ce seuil et repartent donc le jour même.
 */
const HIKING_HOURS_PER_DAY = 8;

/** Nombre de jours de marche qu'appelle une rando, jamais moins d'un. */
export function computeHikeDays(durationHours?: number): number {
  return Math.max(1, Math.ceil((durationHours ?? 0) / HIKING_HOURS_PER_DAY));
}

/**
 * Retour proposé d'office : le départ décalé de la durée de la rando.
 *
 * Sert de repli partout où une date de retour est attendue sans que
 * l'utilisateur en ait posé une — repasser en aller-retour depuis un aller
 * simple, notamment, laisse `endDate` vide.
 */
export function computeAutoReturnDate(
  startDate: string | null,
  durationHours?: number
): string | null {
  return startDate ? addDays(startDate, computeHikeDays(durationHours) - 1) : null;
}
