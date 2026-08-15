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

interface PlanDraftContextValue {
  draft: PlanDraft;
  /** Enregistre un choix de dates et le marque comme confirmé. */
  commitDates: (dates: PlanDates) => void;
  /**
   * Retient l'itinéraire d'aller choisi. Le retour déjà retenu est effacé :
   * revenir modifier l'aller change l'heure à laquelle le retour est possible,
   * le précédent n'a plus de raison d'être proposé au résumé.
   */
  selectOutwardJourney: (journey: TransitOption, isRealtime: boolean) => void;
  /** Retient l'itinéraire de retour choisi. */
  selectReturnJourney: (journey: TransitOption, isRealtime: boolean) => void;
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

  const selectOutwardJourney = useCallback((journey: TransitOption, isRealtime: boolean) => {
    setDraft((current) => ({
      ...current,
      outwardJourney: journey,
      outwardIsRealtime: isRealtime,
      returnJourney: null,
    }));
  }, []);

  const selectReturnJourney = useCallback((journey: TransitOption, isRealtime: boolean) => {
    setDraft((current) => ({ ...current, returnJourney: journey, returnIsRealtime: isRealtime }));
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
