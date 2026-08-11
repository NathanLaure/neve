import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import {
  AGE_BRACKETS,
  AgeBracketId,
  DEFAULT_AGE_BRACKET,
  Passenger,
  groupByBracket,
} from '@/types/passenger';

export interface PassengersEditorProps {
  passengers: Passenger[];
  onChange: (passengers: Passenger[]) => void;
  /**
   * Bouton de validation final. Affiché dans la feuille (« Valider les randonneurs »),
   * masqué en accordéon où le CTA de l'écran fait déjà office de validation.
   */
  onValidate?: () => void;
  validateLabel?: string;
}

let passengerSeq = 0;
function nextPassengerId(): string {
  passengerSeq += 1;
  return `passenger-${Date.now()}-${passengerSeq}`;
}

/**
 * Contenu de « Qui part à l'aventure ? ».
 *
 * Volontairement sans conteneur : les maquettes le montrent tantôt en bottom
 * sheet (depuis la puce d'en-tête), tantôt en accordéon dans le déroulé de
 * l'écran. Un seul composant, deux hôtes.
 */
export default function PassengersEditor({
  passengers,
  onChange,
  onValidate,
  validateLabel = 'Valider les randonneurs',
}: PassengersEditorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Brouillon du randonneur en cours d'ajout. `null` = formulaire fermé.
  const [draftBracket, setDraftBracket] = useState<AgeBracketId | null>(null);

  const groups = groupByBracket(passengers);

  const changeCount = (bracket: AgeBracketId, delta: number) => {
    if (delta > 0) {
      onChange([...passengers, { id: nextPassengerId(), bracket }]);
      return;
    }
    // On retire le dernier de la tranche. Vider complètement la liste est permis :
    // la ligne « Ajouter un randonneur » reste là pour repartir, et bloquer la
    // dernière suppression rendait la corbeille inerte sans l'expliquer.
    const lastIndex = passengers.map((p) => p.bracket).lastIndexOf(bracket);
    if (lastIndex === -1) return;
    onChange(passengers.filter((_, index) => index !== lastIndex));
  };

  const confirmDraft = () => {
    if (!draftBracket) return;
    onChange([...passengers, { id: nextPassengerId(), bracket: draftBracket }]);
    setDraftBracket(null);
  };

  return (
    <View style={styles.container}>
      {groups.map(({ bracket, count }) => {
        // Au dernier randonneur d'une tranche, décrémenter ne réduit plus un
        // nombre : ça fait disparaître la ligne. La corbeille le dit, le moins
        // le laissait deviner.
        const removesRow = count === 1;
        return (
          <View key={bracket.id} style={styles.bracketRow}>
            <Text style={[styles.bracketLabel, { color: theme.text }]}>{bracket.label}</Text>

            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel={
                  removesRow
                    ? `Supprimer les randonneurs ${bracket.label}`
                    : `Retirer un randonneur ${bracket.label}`
                }
                onPress={() => changeCount(bracket.id, -1)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.cardSecondary || theme.background },
                ]}>
                {removesRow ? (
                  <Trash2 size={16} color={theme.text} />
                ) : (
                  <Minus size={16} color={theme.text} />
                )}
              </Pressable>

              <Text style={[styles.stepperCount, { color: theme.text }]}>{count}</Text>

              <Pressable
                accessibilityLabel={`Ajouter un randonneur ${bracket.label}`}
                onPress={() => changeCount(bracket.id, 1)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.cardSecondary || theme.background },
                ]}>
                <Plus size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>
        );
      })}

      {draftBracket !== null && (
        <View style={[styles.draftCard, { backgroundColor: theme.background }]}>
          <View style={[styles.draftHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.draftTitle, { color: theme.text }]}>Nouveau randonneur</Text>
            <Pressable
              accessibilityLabel="Supprimer ce randonneur"
              hitSlop={8}
              onPress={() => setDraftBracket(null)}>
              <Trash2 size={20} color={theme.tint} />
            </Pressable>
          </View>

          <Select
            label="Age du randonneur"
            placeholder="30 - 59 ans"
            value={draftBracket}
            options={AGE_BRACKETS.map((bracket) => ({
              value: bracket.id,
              label: bracket.label,
            }))}
            onSelect={(value) => setDraftBracket(value as AgeBracketId)}
            // Le badge du label masque la bordure derrière lui : il doit prendre
            // le fond de l'encart, pas celui de la carte blanche qui l'entoure.
            labelBackgroundColor={theme.background}
            containerStyle={styles.draftSelect}
          />
        </View>
      )}

      {/* Masqué pendant la saisie : la carte « Nouveau randonneur » et ses deux
          boutons tiennent déjà le rôle, un « Ajouter » grisé en plus embrouille. */}
      {draftBracket === null && (
        <Pressable
          onPress={() => setDraftBracket(DEFAULT_AGE_BRACKET)}
          style={[
            styles.addRow,
            { backgroundColor: theme.cardSecondary || theme.background },
          ]}>
          <Text style={[styles.addLabel, { color: theme.text }]}>Ajouter un randonneur</Text>
          <View style={[styles.addIcon, { backgroundColor: theme.tint }]}>
            <Plus size={16} color={theme.buttonTextOnBrand} />
          </View>
        </Pressable>
      )}

      {draftBracket !== null ? (
        <View style={styles.actions}>
          <Button title="Ajouter ce randonneur" variant="primary" onPress={confirmDraft} />
          <Button title="Annuler" variant="transparent" onPress={() => setDraftBracket(null)} />
        </View>
      ) : (
        onValidate && (
          <View style={styles.actions}>
            <Button title={validateLabel} variant="primary" onPress={onValidate} />
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  bracketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bracketLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCount: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    minWidth: 16,
    textAlign: 'center',
  },
  draftCard: {
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  draftTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  draftSelect: {
    marginTop: 12,
    marginBottom: 0,
  },
  // Figma : fond `bg/background` sur la carte blanche, radius 8, 8px de padding.
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 8,
    padding: 8,
  },
  addLabel: {
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: 8,
  },
});
