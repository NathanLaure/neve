import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Minus, Plus, Trash2, UserRound } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { DASHED_BOX, DASHED_BOX_ROW_HEIGHT } from '@/constants/DashedBox';
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
  /**
   * Fond de l'hôte, derrière l'encart « Nouveau randonneur ».
   *
   * Cet encart n'a pas de fond propre — juste une bordure pointillée — mais la
   * pastille de label du `Select` doit masquer la bordure derrière elle, donc se
   * peindre de la couleur qu'elle recouvre. Or les deux hôtes diffèrent : carte
   * blanche dans l'écran, `background` dans la feuille.
   */
  surfaceColor?: string;
}

// Durées fixes, pas de ressort : un fondu net plutôt qu'un rebond sur des
// éléments qui apparaissent, disparaissent ou poussent leurs voisins.
const ENTER = FadeIn.duration(180);
const EXIT = FadeOut.duration(140);
const REFLOW = LinearTransition.duration(200);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  surfaceColor,
}: PassengersEditorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const hostSurface = surfaceColor ?? theme.background;

  // Brouillon du randonneur en cours d'ajout. `null` = formulaire fermé.
  const [draftBracket, setDraftBracket] = useState<AgeBracketId | null>(null);

  const groups = groupByBracket(passengers);

  const changeCount = (bracket: AgeBracketId, delta: number) => {
    if (delta > 0) {
      onChange([...passengers, { id: nextPassengerId(), bracket }]);
      return;
    }
    // Une rando sans personne n'en est plus une : le bouton est désactivé dans ce
    // cas, mais la garde reste ici aussi au cas où l'appel viendrait d'ailleurs.
    if (passengers.length === 1) return;
    // On retire le dernier de la tranche : la ligne disparaît, la corbeille le dit.
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
        // Une rando sans personne n'en est plus une : le dernier randonneur ne se
        // supprime pas, quelle que soit sa tranche d'âge.
        const isOnlyPassenger = removesRow && passengers.length === 1;
        return (
          <Animated.View
            key={bracket.id}
            layout={REFLOW}
            entering={ENTER}
            exiting={EXIT}
            style={styles.bracketRow}>
            <Text style={[styles.bracketLabel, { color: theme.text }]}>{bracket.label}</Text>

            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel={
                  isOnlyPassenger
                    ? `Retirer un randonneur ${bracket.label} (impossible, il en faut au moins un)`
                    : removesRow
                      ? `Supprimer les randonneurs ${bracket.label}`
                      : `Retirer un randonneur ${bracket.label}`
                }
                accessibilityState={{ disabled: isOnlyPassenger }}
                disabled={isOnlyPassenger}
                onPress={() => changeCount(bracket.id, -1)}
                android_ripple={
                  isOnlyPassenger
                    ? undefined
                    : {
                        color: theme.ripple,
                        borderless: true,
                      }
                }
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.surfaceSecondary || theme.background },
                  isOnlyPassenger && { opacity: 0.4 },
                ]}>
                {/* La bascule moins/corbeille au dernier randonneur d'une tranche
                    change de sens, un fondu évite qu'elle saute aux yeux. Pas de
                    corbeille pour le tout dernier randonneur : elle suggérerait une
                    suppression possible, alors que le bouton est désactivé. */}
                {removesRow && !isOnlyPassenger ? (
                  <Animated.View key="trash" entering={ENTER} exiting={EXIT}>
                    <Trash2 size={16} color={theme.text} />
                  </Animated.View>
                ) : (
                  <Animated.View key="minus" entering={ENTER} exiting={EXIT}>
                    <Minus size={16} color={isOnlyPassenger ? theme.textDisabled : theme.text} />
                  </Animated.View>
                )}
              </Pressable>

              <Text style={[styles.stepperCount, { color: theme.text }]}>{count}</Text>

              <Pressable
                accessibilityLabel={`Ajouter un randonneur ${bracket.label}`}
                onPress={() => changeCount(bracket.id, 1)}
                android_ripple={{
                  color: theme.ripple,
                  borderless: true,
                }}
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.surfaceSecondary || theme.background },
                ]}>
                <Plus size={16} color={theme.text} />
              </Pressable>
            </View>
          </Animated.View>
        );
      })}

      {draftBracket !== null && (
        <Animated.View
          layout={REFLOW}
          entering={ENTER}
          exiting={EXIT}
          style={[styles.draftCard, { borderColor: theme.borderStrong || '#989898' }]}>
          <View
            style={[styles.draftHeader, { borderBottomColor: theme.borderStrong || '#989898' }]}>
            <Text style={[styles.draftTitle, { color: theme.text }]}>Nouveau randonneur</Text>
            <Pressable
              accessibilityLabel="Supprimer ce randonneur"
              hitSlop={8}
              android_ripple={{
                color: theme.ripple,
                borderless: true,
              }}
              onPress={() => setDraftBracket(null)}>
              <Trash2 size={24} color={theme.tint} />
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
            // Le badge du label masque la bordure derrière lui : l'encart n'ayant
            // plus de fond propre, c'est celui de l'hôte qu'il doit reprendre.
            labelBackgroundColor={hostSurface}
            containerStyle={styles.draftSelect}
          />
        </Animated.View>
      )}

      {/* Masqué pendant la saisie : la carte « Nouveau randonneur » et ses deux
          boutons tiennent déjà le rôle, un « Ajouter » grisé en plus embrouille. */}
      {draftBracket === null && (
        <AnimatedPressable
          layout={REFLOW}
          entering={ENTER}
          exiting={EXIT}
          onPress={() => setDraftBracket(DEFAULT_AGE_BRACKET)}
          android_ripple={{
            color: theme.ripple,
            borderless: false,
            foreground: true,
          }}
          style={[
            styles.addRow,
            { borderColor: theme.borderStrong || '#989898', overflow: 'hidden' as const },
          ]}>
          <View style={styles.addRowContent}>
            <UserRound size={20} color={theme.textMuted} />
            <Text style={[styles.addLabel, { color: theme.textMuted }]} numberOfLines={1}>
              Ajouter un randonneur
            </Text>
          </View>
          <View style={[styles.addIcon, { backgroundColor: theme.tint }]}>
            <Plus size={16} color={theme.buttonTextOnBrand} />
          </View>
        </AnimatedPressable>
      )}

      {draftBracket !== null ? (
        <Animated.View key="draft-actions" layout={REFLOW} entering={ENTER} exiting={EXIT} style={styles.actions}>
          <Button title="Ajouter ce randonneur" variant="primary" onPress={confirmDraft} />
          <Button title="Annuler" variant="transparent" onPress={() => setDraftBracket(null)} />
        </Animated.View>
      ) : (
        onValidate && (
          <Animated.View
            key="validate-actions"
            layout={REFLOW}
            entering={ENTER}
            exiting={EXIT}
            style={styles.actions}>
            <Button title={validateLabel} variant="primary" onPress={onValidate} />
          </Animated.View>
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
  /* Figma 653:37139 : encart sans fond, bordure pointillée `border/strong`.
     Géométrie strictement identique au bouton d'ouverture du calendrier et au
     bouton d'ajout — seule la disposition en colonne le distingue. */
  draftCard: {
    ...DASHED_BOX,
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
    lineHeight: 24,
  },
  /* La pastille de label déborde de 10px vers le haut : sans cette marge, elle
     viendrait chevaucher le séparateur. */
  draftSelect: {
    marginTop: 8,
    marginBottom: 0,
  },
  // Figma : fond `bg/background` sur la carte blanche, radius 8, 8px de padding.
  /* Calqué sur le `dashedBox` de l'écran de planification : les deux boutons
     ouvrent une saisie sur le même modèle, ils doivent se lire pareil. */
  addRow: {
    ...DASHED_BOX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: DASHED_BOX_ROW_HEIGHT,
  },
  addRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: 8,
  },
});
