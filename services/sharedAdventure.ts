import type { TrainOption } from '@/constants/RandosData';
import { supabase } from '@/utils/supabase';

/**
 * Aventure partagée, telle que la rend `get_shared_adventure`.
 *
 * Volontairement plus étroite que `PlannedAdventure` : la fonction SQL ne
 * expose ni l'identifiant du compte, ni les coordonnées du point de départ, ni
 * la liste des voyageurs. Une feuille de route partagée dit où l'on va, pas d'où
 * précisément part son auteur ni avec qui.
 */
export interface SharedAdventure {
  shareToken: string;
  randoId: string;
  /** Nom d'affichage de l'auteur. Absent si son profil n'en porte pas. */
  authorName?: string;
  outwardDate: string;
  returnDate: string | null;
  outwardTrain: TrainOption;
  returnTrain: TrainOption;
  departureStationName: string;
  returnStationName?: string;
  isOneWay: boolean;
  isReversed: boolean;
  hikeSnapshot?: {
    title: string;
    imageUrl?: string;
    startStation: string;
    endStation?: string;
    distance: string;
    durationHours: number;
    difficulty: 'Facile' | 'Modéré' | 'Difficile';
    elevation?: string;
  };
}

/**
 * Relit une aventure depuis son jeton de partage.
 *
 * Passe par la fonction et non par la table : la politique de lecture publique
 * qui existait auparavant ouvrait toutes les lignes pourvues d'un jeton à
 * quiconque détient la clé anonyme — RLS ne voit pas le `WHERE` d'une requête.
 * La fonction, elle, exige le jeton et ne rend qu'une ligne.
 *
 * Un jeton inconnu n'est pas une erreur mais une absence : le lien a pu être
 * mal recopié, ou l'aventure annulée depuis. L'appelant distingue les deux.
 */
export async function fetchSharedAdventure(
  token: string
): Promise<{ adventure: SharedAdventure | null; error: string | null }> {
  const { data, error } = await supabase
    .rpc('get_shared_adventure', { p_token: token })
    .maybeSingle();

  if (error) {
    console.warn('Could not read the shared adventure:', error);
    return { adventure: null, error: error.message };
  }

  if (!data) return { adventure: null, error: null };

  const row = data as any;
  return {
    adventure: {
      shareToken: String(row.share_token),
      randoId: String(row.rando_id),
      authorName: row.author_name?.trim() || undefined,
      outwardDate: String(row.outward_date),
      returnDate: row.return_date ? String(row.return_date) : null,
      outwardTrain: row.outward_train,
      returnTrain: row.return_train,
      departureStationName: row.departure_station_name ?? '',
      returnStationName: row.return_station_name ?? undefined,
      /* Même règle que `isOneWayAdventure` : le drapeau fait foi, mais les
         aventures d'avant la colonne se reconnaissent à leurs deux trajets
         identiques — le résumé recopiait l'aller faute de retour. */
      isOneWay:
        Boolean(row.is_one_way) ||
        (!!row.outward_train?.id && row.outward_train?.id === row.return_train?.id),
      isReversed: Boolean(row.is_reversed),
      hikeSnapshot: row.hike_snapshot ?? undefined,
    },
    error: null,
  };
}
