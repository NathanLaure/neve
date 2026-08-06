/**
 * Libellé d'affichage d'une gare, avec la contraction française correcte.
 *
 * Sur les 478 gares du jeu de données, la concaténation naïve `Gare de ${nom}`
 * fautait sur 113 d'entre elles : 66 commencent par une voyelle ou un h muet
 * (« Gare de Igny ») et 47 par un article (« Gare de Le Plessis Chenet »).
 *
 * Les 5 gares en h du jeu de données — Héricy, Haussmann, Herblay, Houilles,
 * Houdan — ont toutes un h muet, d'où l'élision. Un h aspiré demanderait « de ».
 *
 * Ce module ne dépend de rien : il est utilisé aussi bien par l'app (via
 * services/transitService) que par les scripts d'ingestion, qui tournent sous
 * Node et ne peuvent pas charger les modules React Native.
 */
export function formatStationLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Gare Île-de-France';

  const article = trimmed.match(/^(Les|Le|La|L')\s*(.+)$/i);
  if (article) {
    const [, determiner, rest] = article;
    switch (determiner.toLowerCase()) {
      case 'les':
        return `Gare des ${rest}`;
      case 'le':
        return `Gare du ${rest}`;
      case 'la':
        return `Gare de la ${rest}`;
      default:
        return `Gare de l'${rest}`;
    }
  }

  if (/^[aeiouyàâäéèêëiîïoôöuùûüh]/i.test(trimmed)) {
    return `Gare d'${trimmed}`;
  }
  return `Gare de ${trimmed}`;
}
