import { useCallback } from 'react';
import * as Location from 'expo-location';

import { useAdventure } from '@/context/AdventureContext';
import { showToast } from '@/utils/toast';

type Coords = { latitude: number; longitude: number };

/**
 * Bouton « me localiser » d'une carte.
 *
 * Recadrer ne suffit pas : sans autorisation, la position suivie vaut le centre
 * de Paris par défaut, et le bouton faisait donc semblant d'avoir trouvé
 * l'utilisateur. Il faut demander, puis viser les coordonnées réellement
 * obtenues — celles-ci ne sont pas encore redescendues en props au moment du
 * recadrage, d'où le passage explicite à `centerOnUser`.
 *
 * Les trois issues sont distinguées, parce qu'elles n'appellent pas la même
 * réponse : jamais demandé, refusé une fois, refusé définitivement.
 */
export function useLocateMe(centerOnUser: (coords?: Coords) => void) {
  const { refreshUserLocation } = useAdventure();

  return useCallback(async () => {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

    /* Refus définitif : le système ne montrera plus sa fenêtre, insister
       n'afficherait rien du tout. Seuls les réglages peuvent le lever. */
    if (status !== 'granted' && !canAskAgain) {
      showToast.info(
        'Localisation désactivée',
        "Autorise-la dans les réglages du téléphone pour te situer sur la carte."
      );
      return;
    }

    const wasGranted = status === 'granted';
    const coords = await refreshUserLocation(!wasGranted);

    if (coords) {
      centerOnUser(coords);
      return;
    }

    /* Pas de message quand l'utilisateur vient de refuser : il sait ce qu'il a
       répondu, le lui répéter serait du harcèlement. On ne parle que de l'échec
       qu'il ne peut pas expliquer — autorisation acquise, mais pas de position. */
    if (wasGranted) {
      showToast.error('Position introuvable', 'Réessaie une fois à ciel ouvert.');
    }
  }, [centerOnUser, refreshUserLocation]);
}
