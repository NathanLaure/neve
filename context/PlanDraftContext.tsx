import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { addDays, toISODate } from '@/components/plan/DateRangeCalendar';
import { fetchTransitHorizon } from '@/services/transitService';

export type TripType = 'round' | 'oneway';

/**
 * Choix de dates en cours de planification.
 *
 * Il vit ici et non dans l'écran de planification parce que le calendrier est une
 * route à part, présentée en modale : deux écrans frères dans la même pile, sans
 * autre parent commun que la racine. Les faire dialoguer par paramètres d'URL
 * imposerait un effet de synchronisation dans les deux sens — c'est exactement ce
 * transport manuel d'état qui avait fait perdre le lieu de retour et la date de
 * retour entre la planification et les écrans aller/retour.
 *
 * Volontairement limité aux dates pour l'instant. Le point de départ, le lieu de
 * retour et le sens de parcours pourront le rejoindre : la structure s'y prête.
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
}

interface PlanDraftContextValue {
  draft: PlanDraft;
  /** Enregistre un choix de dates et le marque comme confirmé. */
  commitDates: (dates: Omit<PlanDraft, 'datesValidated'>) => void;
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

  const commitDates = useCallback((dates: Omit<PlanDraft, 'datesValidated'>) => {
    setDraft({ ...dates, datesValidated: true });
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
      setOutwardTime,
      resetDraft,
      horizon,
    }),
    [draft, commitDates, setOutwardTime, resetDraft, horizon]
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
