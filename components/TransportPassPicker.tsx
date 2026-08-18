import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import ChoiceChip from '@/components/ChoiceChip';
import { TRANSPORT_PASSES, TransportPassId } from '@/types/passenger';

export interface TransportPassPickerProps {
  value: TransportPassId[];
  onChange: (passes: TransportPassId[]) => void;
  /**
   * Ajoute en tête une ligne « Je n'en ai pas encore », cochée quand la
   * sélection est vide. Utile là où la liste est la seule question posée
   * (inscription, feuille du profil) : sans elle, ne rien cocher se confond
   * avec ne pas avoir répondu. Inutile là où la liste n'est qu'un champ parmi
   * d'autres, le contexte levant déjà l'ambiguïté.
   */
  showNoneOption?: boolean;
  noneLabel?: string;
  /**
   * Masque la précision affichée sous chaque libellé. Pour les espaces
   * contraints — l'éditeur de randonneurs — où l'utilisateur a déjà rencontré
   * ces intitulés à l'inscription.
   */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Liste des abonnements de transport détenus, en sélection multiple : Navigo et
 * Carte Avantage se cumulent chez le même randonneur.
 *
 * Monté tel quel à l'inscription, dans la feuille du profil et dans l'éditeur de
 * randonneurs — un seul endroit à toucher le jour où la liste s'allonge.
 */
export default function TransportPassPicker({
  value,
  onChange,
  showNoneOption = false,
  noneLabel = "Je n'en ai pas encore",
  compact = false,
  style,
}: TransportPassPickerProps) {
  const toggle = (id: TransportPassId) => {
    onChange(value.includes(id) ? value.filter((pass) => pass !== id) : [...value, id]);
  };

  return (
    <View style={[styles.list, style]}>
      {showNoneOption && (
        /* Exclusif par construction : le cocher vide la sélection, et cocher un
           abonnement le décoche de lui-même puisqu'il ne fait que refléter
           `value.length === 0`. Le presser alors qu'il est déjà coché ne change
           rien, plutôt que de rétablir une sélection que l'utilisateur croyait
           avoir abandonnée. */
        <ChoiceChip
          label={noneLabel}
          selected={value.length === 0}
          checkbox
          onPress={() => onChange([])}
        />
      )}

      {TRANSPORT_PASSES.map((pass) => (
        <ChoiceChip
          key={pass.id}
          label={pass.label}
          description={compact ? undefined : pass.hint}
          selected={value.includes(pass.id)}
          checkbox
          onPress={() => toggle(pass.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
});
