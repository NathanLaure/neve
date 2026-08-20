import Mapbox from '@rnmapbox/maps';

/**
 * Jeton du SDK natif Mapbox, posé une fois pour toute l'application.
 *
 * Il vivait au niveau module d'`ExplorerMap`, donc il ne s'exécutait que si ce
 * fichier-là était importé. En production, où les modules ne s'initialisent qu'à
 * la première requête, une carte rendue par un autre chemin s'instanciait sans
 * jeton et faisait tomber l'app — `MapboxConfigurationException`, exception
 * fatale côté natif. C'est arrivé pendant l'inscription : l'étape « adresse du
 * domicile » rend une carte alors que l'explorateur n'a jamais été ouvert.
 *
 * En développement le problème restait invisible : au fil des rechargements,
 * `ExplorerMap` avait presque toujours déjà été évalué.
 *
 * Ce module est donc importé par le layout racine, évalué avant tout écran quel
 * que soit le chemin d'entrée. Les composants qui rendent une carte l'importent
 * aussi — l'import est idempotent, et il rend la dépendance visible là où elle
 * compte.
 */
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

Mapbox.setAccessToken(MAPBOX_TOKEN);

if (!MAPBOX_TOKEN) {
  // Sans jeton, toute carte native fera tomber l'app : mieux vaut le dire au
  // build plutôt que de le découvrir sur l'appareil d'un testeur.
  console.warn(
    'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN est vide : les cartes natives ne pourront pas être créées.'
  );
}

export {};
