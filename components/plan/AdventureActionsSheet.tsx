import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarPlus,
  CalendarX2,
  Download,
  MessageSquareWarning,
  Mountain,
  PencilLine,
  RotateCcw,
  Share2,
  Ticket,
  TicketX,
  Trash2,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import ItemButton from '@/components/ItemButton';
import CancelAdventureSheet from '@/components/plan/CancelAdventureSheet';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { PlannedAdventure, isOneWayAdventure, useAdventure } from '@/context/AdventureContext';
import { usePlanDraft } from '@/context/PlanDraftContext';
import {
  buildAdventureEdit,
  buildAdventurePlanParams,
  suggestReturnTime,
} from '@/services/adventureEditing';
import { buildAdventureShare } from '@/services/adventureSharing';
import { fromTrainOption } from '@/services/transitService';

export interface AdventureActionsSheetProps {
  /** Aventure visée. `null` tant qu'aucune carte n'a été choisie. */
  adventure: PlannedAdventure | null;
  /** Titre de la randonnée, pour le partage et la confirmation de suppression. */
  hikeTitle?: string;
  /**
   * Aventure déjà passée : il n'y a plus de trajet à corriger ni de billet à
   * réserver, seulement une ligne d'historique à partager ou à retirer.
   */
  isPast?: boolean;
  /** Après suppression : l'écran qui affichait cette aventure doit la quitter. */
  onDeleted?: () => void;
  onClose?: () => void;
}

/**
 * Actions contextuelles d'une aventure planifiée.
 *
 * Une même feuille sert le récapitulatif (bouton « … » de l'en-tête) et l'appui
 * long sur une carte de l'onglet Aventures : les deux visent la même fiche, et
 * dédoubler la liste garantissait qu'elles divergent. Les actions vivent ici et
 * non chez l'appelant pour la même raison — seule la sortie d'écran après
 * suppression lui revient, via `onDeleted`.
 */
const AdventureActionsSheet = forwardRef<BaseBottomSheetModalRef, AdventureActionsSheetProps>(
  ({ adventure, hikeTitle, isPast = false, onDeleted, onClose }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();

    const {
      deleteAdventure,
      updateAdventure,
      toggleAdventureBooked,
      isSavedOffline,
      toggleOffline,
    } = useAdventure();
    const { restoreForEdit, restoreForReturn, resetDraft } = usePlanDraft();

    const sheetRef = useRef<BaseBottomSheetModalRef>(null);
    const confirmRef = useRef<BaseBottomSheetModalRef>(null);

    /**
     * Aventure retenue au moment où la confirmation s'ouvre.
     *
     * La feuille d'actions se referme pour laisser la place à la confirmation, et
     * l'appelant en profite souvent pour remettre `adventure` à `null` : sans
     * cette copie, il ne resterait plus rien à supprimer une fois confirmé.
     */
    const [pendingCancel, setPendingCancel] = useState<{
      id: string;
      title: string;
      isPast: boolean;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const isOneWay = adventure ? isOneWayAdventure(adventure) : false;
    const isOffline = adventure ? isSavedOffline(adventure.randoId) : false;
    const title = hikeTitle || adventure?.hikeSnapshot?.title || 'Cette randonnée';

    const planParams = useMemo(
      () => (adventure ? buildAdventurePlanParams(adventure) : null),
      [adventure]
    );

    const handleOpenHike = useCallback(() => {
      sheetRef.current?.dismiss();
      if (adventure) router.push(`/rando/${adventure.randoId}`);
    }, [adventure, router]);

    const handleEditOutward = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure || !planParams) return;

      restoreForEdit(buildAdventureEdit(adventure));
      /* `editOnly` : l'écran d'aller enchaînerait sinon sur le choix d'un retour,
         qui est déjà fait — on ne vient corriger que l'aller. */
      router.push({
        pathname: '/plan/outward',
        params: { ...planParams, editOnly: 'outward' },
      });
    }, [adventure, planParams, restoreForEdit, router]);

    const handleEditReturn = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure || !planParams) return;

      restoreForEdit(buildAdventureEdit(adventure));

      router.push({
        pathname: '/plan/return',
        params: { ...planParams, outwardId: adventure.outwardTrain.id, editOnly: 'return' },
      });
    }, [adventure, planParams, restoreForEdit, router]);

    /**
     * Ajout d'un retour à un aller simple.
     *
     * Passe par le calendrier, contrairement à « Modifier le retour » : il n'y a
     * pas de date de retour à reprendre, et proposer des horaires avant que le
     * jour soit choisi reviendrait à le décider à la place de l'utilisateur.
     */
    const handleAddReturn = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure || !planParams) return;

      restoreForReturn({
        startDate: adventure.outwardDate,
        endDate: null,
        outwardJourney: fromTrainOption(adventure.outwardTrain),
        outwardIsRealtime: adventure.outwardTrain.isRealtime ?? false,
        savedAdventureId: adventure.id,
      });

      /* `editOnly` traverse le calendrier, qui relaie ses paramètres : ajouter un
         retour à une aventure enregistrée est une correction comme une autre, et
         l'écran de choix ne doit pas rester dans la pile derrière le résumé. */
      router.push({
        pathname: '/plan/dates',
        params: {
          ...planParams,
          next: 'return',
          outwardId: adventure.outwardTrain.id,
          editOnly: 'return',
          /* En aller simple, `returnTrain` recopie l'aller : le `returnTime` des
             paramètres vaut l'heure du départ du matin. On lui substitue la fin
             estimée de la marche, seule heure de retour qui ait un sens. */
          returnTime: suggestReturnTime(
            adventure.outwardTrain.arrivalTime,
            adventure.hikeSnapshot?.durationHours
          ),
        },
      });
    }, [adventure, planParams, restoreForReturn, router]);

    /**
     * Repartir sur ce sentier.
     *
     * Seule issue d'une sortie passée : ses trajets ne se corrigent plus, mais
     * rien n'empêche d'y retourner. Le brouillon repart à neuf — sans quoi son
     * `savedAdventureId` ferait écraser l'aventure passée par la nouvelle.
     */
    const handleReplan = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure) return;
      resetDraft();
      router.push(`/plan?randoId=${adventure.randoId}`);
    }, [adventure, resetDraft, router]);

    const handleToggleBooked = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure) return;

      toggleAdventureBooked(adventure.id);
      Toast.show({
        type: adventure.isBooked ? 'info' : 'success',
        text1: adventure.isBooked ? 'Billets à reprendre' : 'Billets marqués comme achetés',
        text2: adventure.isBooked
          ? "L'aventure repasse en attente de réservation."
          : 'La fiche ne te réclamera plus de réserver.',
      });
    }, [adventure, toggleAdventureBooked]);

    const handleShare = useCallback(async () => {
      sheetRef.current?.dismiss();
      if (!adventure) return;

      const share = buildAdventureShare(adventure, { hikeTitle: title, isPast });
      // Le jeton est enregistré avant l'envoi, sans quoi un second partage de la
      // même aventure pointerait vers une autre adresse.
      if (share.isNewToken) updateAdventure(adventure.id, { shareToken: share.shareToken });

      try {
        await Share.share({ title: share.title, message: share.message, url: share.url });
      } catch (error) {
        console.warn('Partage impossible :', error);
      }
    }, [adventure, isPast, title, updateAdventure]);

    const handleToggleOffline = useCallback(async () => {
      sheetRef.current?.dismiss();
      if (!adventure) return;

      const nextState = await toggleOffline(adventure.randoId);
      Toast.show({
        type: nextState ? 'success' : 'info',
        text1: nextState ? 'Enregistrée hors ligne' : 'Sauvegarde supprimée',
        text2: nextState
          ? 'Randonnée et tracé GPX disponibles sans connexion.'
          : 'La randonnée a été retirée de votre stockage local.',
      });
    }, [adventure, toggleOffline]);

    /*
     * Le formulaire s'ouvre réglé sur cette aventure. Sans son identifiant, un
     * « ce train n'existe pas » ne dit ni quelle ligne, ni quel jour, ni quelle
     * correspondance — c'est-à-dire rien d'exploitable.
     */
    const handleReportJourney = useCallback(() => {
      sheetRef.current?.dismiss();
      if (!adventure) return;

      router.push({
        pathname: '/settings/support',
        params: {
          intent: 'data',
          subjectKind: 'journey',
          subjectId: adventure.id,
          from: 'aventure',
        },
      });
    }, [adventure, router]);

    const handleAskCancel = useCallback(() => {
      if (!adventure) return;
      setPendingCancel({ id: adventure.id, title, isPast });
      sheetRef.current?.dismiss();
      confirmRef.current?.present();
    }, [adventure, isPast, title]);

    const handleConfirmCancel = useCallback(() => {
      confirmRef.current?.dismiss();
      if (!pendingCancel) return;

      deleteAdventure(pendingCancel.id);
      Toast.show({
        type: 'success',
        text1: pendingCancel.isPast ? "Retirée de l'historique" : 'Aventure annulée',
        text2: pendingCancel.title,
      });
      setPendingCancel(null);
      onDeleted?.();
    }, [deleteAdventure, onDeleted, pendingCancel]);

    return (
      <>
        <BaseBottomSheetModal ref={sheetRef} enableDynamicSizing onClose={onClose}>
          <View style={styles.actionsList}>
            <ItemButton
              icon={<Mountain size={20} color={theme.text} />}
              label="Voir la randonnée"
              onPress={handleOpenHike}
            />

            {isPast && (
              <ItemButton
                icon={<RotateCcw size={20} color={theme.text} />}
                label="Replanifier cette sortie"
                onPress={handleReplan}
              />
            )}

            {!isPast && (
              <ItemButton
                icon={<PencilLine size={20} color={theme.text} />}
                label="Modifier l'aller"
                onPress={handleEditOutward}
              />
            )}

            {!isPast &&
              (isOneWay ? (
                <ItemButton
                  icon={<CalendarPlus size={20} color={theme.text} />}
                  label="Ajouter un retour"
                  onPress={handleAddReturn}
                />
              ) : (
                <ItemButton
                  icon={<PencilLine size={20} color={theme.text} />}
                  label="Modifier le retour"
                  onPress={handleEditReturn}
                />
              ))}

            {!isPast && (
              <ItemButton
                icon={
                  adventure?.isBooked ? (
                    <TicketX size={20} color={theme.text} />
                  ) : (
                    <Ticket size={20} color={theme.text} />
                  )
                }
                label={
                  adventure?.isBooked
                    ? 'Marquer comme non réservée'
                    : 'Marquer les billets comme achetés'
                }
                onPress={handleToggleBooked}
              />
            )}

            <ItemButton
              icon={<Share2 size={20} color={theme.text} />}
              label="Partager"
              onPress={handleShare}
            />

            <ItemButton
              icon={
                isOffline ? (
                  <Trash2 size={20} color={theme.text} />
                ) : (
                  <Download size={20} color={theme.text} />
                )
              }
              label={isOffline ? 'Supprimer la sauvegarde locale' : 'Télécharger hors connexion'}
              onPress={handleToggleOffline}
            />

            {/* Sujet « trajet » et non « randonnée » : depuis une aventure, ce
                qu'on vient corriger est un horaire ou une correspondance, pas
                la description du sentier. */}
            <ItemButton
              icon={<MessageSquareWarning size={20} color={theme.text} />}
              label="Signaler un horaire faux"
              onPress={handleReportJourney}
            />

            <ItemButton
              icon={<CalendarX2 size={20} color={theme.statusTextError} />}
              label={isPast ? "Retirer de l'historique" : "Annuler l'aventure"}
              color={theme.statusTextError}
              onPress={handleAskCancel}
            />
          </View>
        </BaseBottomSheetModal>

        <CancelAdventureSheet
          ref={confirmRef}
          hikeTitle={pendingCancel?.title ?? title}
          isPast={pendingCancel?.isPast ?? isPast}
          onConfirm={handleConfirmCancel}
          onCancel={() => confirmRef.current?.dismiss()}
        />
      </>
    );
  }
);

AdventureActionsSheet.displayName = 'AdventureActionsSheet';

export default AdventureActionsSheet;

const styles = StyleSheet.create({
  actionsList: {
    paddingTop: 4,
  },
});
