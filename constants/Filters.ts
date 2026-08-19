/**
 * Shared filter vocabularies. Kept out of the components so the full filters
 * form and the map's quick-pick chips always offer the same options.
 */
export const POINTS_OF_INTEREST = [
  'Vue panoramique',
  'Forêt',
  'Fleurs',
  'Lac',
  'Rivière',
  'Cascade',
  'Faune sauvage',
  'Plage',
  'Grotte',
  'Sources chaudes',
  'Site historique',
  'Voies vertes',
  'Balade en ville',
];

export const DIFFICULTIES = ['Facile', 'Modéré', 'Difficile'];

/**
 * The three boxes are checked by default, so a full selection means "no
 * preference" and must not restrict anything — otherwise the hikes stored with
 * a difficulty outside this list (`expert`) would silently vanish from the
 * default results. An empty selection stays permissive too, as before.
 */
export const isDifficultyFilterActive = (selected: string[]) =>
  selected.length > 0 && selected.length < DIFFICULTIES.length;
