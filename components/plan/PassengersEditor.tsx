import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Minus, Plus, Trash2, UserRound } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { DASHED_BOX, DASHED_BOX_ROW_HEIGHT } from '@/constants/DashedBox';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import TransportPassPicker from '@/components/TransportPassPicker';
import {
  AGE_BRACKETS,
  AgeBracketId,
  DEFAULT_AGE_BRACKET,
  Passenger,
  PassengerGroup,
  TransportPassId,
  formatPassesLabel,
  getAgeBracketLabel,
  groupPassengers,
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
   */
  surfaceColor?: string;
}

const ENTER = FadeIn.duration(180);
const EXIT = FadeOut.duration(140);
const REFLOW = LinearTransition.duration(200);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

let passengerSeq = 0;
function nextPassengerId(): string {
  passengerSeq += 1;
  return `passenger-${Date.now()}-${passengerSeq}`;
}

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
  const [draftPasses, setDraftPasses] = useState<TransportPassId[]>([]);

  /**
   * Ligne dépliée pour modification, repérée par l'un de ses voyageurs et non
   * par la clé du groupe : celle-ci change à chaque modification d'âge ou
   * d'abonnement, ce qui replierait la ligne sous les doigts de l'utilisateur.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = groupPassengers(passengers);
  // Le premier voyageur, c'est l'utilisateur : il ne peut pas se retirer lui-même.
  const selfId = passengers[0]?.id;

  const updateGroup = (group: PassengerGroup, updates: Partial<Passenger>) => {
    onChange(
      passengers.map((p) => (group.ids.includes(p.id) ? { ...p, ...updates } : p))
    );
  };

  const addToGroup = (group: PassengerGroup) => {
    onChange([
      ...passengers,
      { id: nextPassengerId(), bracket: group.bracket, passes: [...group.passes] },
    ]);
  };

  const removeFromGroup = (group: PassengerGroup) => {
    const removable = group.ids.filter((id) => id !== selfId);
    const victim = removable[removable.length - 1];
    if (!victim) return;
    onChange(passengers.filter((p) => p.id !== victim));
  };

  const confirmDraft = () => {
    if (!draftBracket) return;
    onChange([
      ...passengers,
      {
        id: nextPassengerId(),
        bracket: draftBracket,
        passes: draftPasses,
      },
    ]);
    setDraftBracket(null);
    setDraftPasses([]);
  };

  return (
    <View style={styles.container}>
      {/* Une ligne par groupe (tranche + abonnement), dépliable (Figma 650:33984) */}
      {groups.map((group) => {
        const isOpen = expandedId != null && group.ids.includes(expandedId);
        const canRemove = group.ids.some((id) => id !== selfId);
        const passLabel = formatPassesLabel(group.passes);

        return (
          <Animated.View
            key={group.ids[0]}
            layout={REFLOW}
            entering={ENTER}
            exiting={EXIT}
            style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Modifier ${getAgeBracketLabel(group.bracket)}`}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setExpandedId(isOpen ? null : group.ids[0])}
              /* `foreground` : en fond, le ripple remplace le drawable arrondi de
                 RN et retombe carré. En premier plan, il est découpé par
                 l'outline de la vue, donc par le `borderRadius`. */
              android_ripple={{ color: theme.rippleSubtle, borderless: false, foreground: true }}
              style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                  {getAgeBracketLabel(group.bracket)}
                  {group.includesSelf ? ' (Vous)' : ''}
                </Text>
                {passLabel && (
                  <Text style={[styles.rowSubtitle, { color: theme.text }]} numberOfLines={1}>
                    {passLabel}
                  </Text>
                )}
              </View>

              <View style={styles.counter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    group.count > 1
                      ? `Retirer un randonneur ${getAgeBracketLabel(group.bracket)}`
                      : `Supprimer ${getAgeBracketLabel(group.bracket)}`
                  }
                  disabled={!canRemove}
                  onPress={() => removeFromGroup(group)}
                  android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
                  style={[styles.counterButton, { backgroundColor: theme.background }]}>
                  {group.count > 1 ? (
                    <Minus size={16} color={canRemove ? theme.text : theme.textDisabled} />
                  ) : (
                    <Trash2 size={16} color={canRemove ? theme.text : theme.textDisabled} />
                  )}
                </Pressable>

                <Text style={[styles.counterValue, { color: theme.text }]}>{group.count}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter un randonneur ${getAgeBracketLabel(group.bracket)}`}
                  onPress={() => addToGroup(group)}
                  android_ripple={{ color: theme.ripple, borderless: false, foreground: true }}
                  style={[styles.counterButton, { backgroundColor: theme.background }]}>
                  <Plus size={16} color={theme.text} />
                </Pressable>
              </View>
            </Pressable>

            {/* Modification de la ligne : s'applique à tous les randonneurs comptés */}
            {isOpen && (
              <Animated.View
                layout={REFLOW}
                entering={ENTER}
                exiting={EXIT}
                style={[styles.editPanel, { borderColor: theme.borderStrong || '#989898' }]}>
                {group.count > 1 && (
                  <Text style={[styles.editHint, { color: theme.textMuted }]}>
                    S'applique aux {group.count} randonneurs de cette ligne.
                  </Text>
                )}

                <Select
                  label="Âge"
                  value={group.bracket}
                  options={AGE_BRACKETS.map((bracket) => ({
                    value: bracket.id,
                    label: bracket.label,
                  }))}
                  onSelect={(val) => updateGroup(group, { bracket: val as AgeBracketId })}
                  labelBackgroundColor={hostSurface}
                  containerStyle={styles.editSelect}
                />

                <View style={styles.passesField}>
                  <Text style={[styles.passesLabel, { color: theme.textMuted }]}>
                    Abonnements
                  </Text>
                  <TransportPassPicker
                    value={group.passes}
                    onChange={(passes) => updateGroup(group, { passes })}
                    compact
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>
        );
      })}

      {/* Formulaire d'ajout d'un nouveau randonneur */}
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
              accessibilityLabel="Annuler l'ajout"
              hitSlop={8}
              android_ripple={{
                color: theme.ripple,
                borderless: true,
              }}
              onPress={() => setDraftBracket(null)}>
              <Trash2 size={20} color={theme.tint} />
            </Pressable>
          </View>

          <Select
            label="Âge du randonneur"
            placeholder="30 - 59 ans"
            value={draftBracket}
            options={AGE_BRACKETS.map((bracket) => ({
              value: bracket.id,
              label: bracket.label,
            }))}
            onSelect={(value) => setDraftBracket(value as AgeBracketId)}
            labelBackgroundColor={hostSurface}
            containerStyle={styles.draftSelect}
          />

          <View style={styles.passesField}>
            <Text style={[styles.passesLabel, { color: theme.textMuted }]}>
              Abonnements de transport
            </Text>
            <TransportPassPicker value={draftPasses} onChange={setDraftPasses} compact />
          </View>
        </Animated.View>
      )}

      {/* Bouton d'ajout */}
      {draftBracket === null && (
        <AnimatedPressable
          layout={REFLOW}
          entering={ENTER}
          exiting={EXIT}
          onPress={() => {
            setDraftBracket(DEFAULT_AGE_BRACKET);
            setDraftPasses([]);
          }}
          android_ripple={{
            color: theme.ripple,
            borderless: false,
            foreground: true,
          }}
          style={[
            styles.addRow,
            {
              borderRadius: 8,
              borderColor: theme.borderStrong || '#989898',
              overflow: 'hidden' as const,
            },
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
          <Button title="Ajouter ce randonneur" variant="secondary" onPress={confirmDraft} />
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
            <Button title={validateLabel} variant="secondary" onPress={onValidate} />
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
  group: {
    gap: 8,
  },
  /* Figma 650:33984 « Counter row » : pas de fond ni de bordure, seul le rythme
     vertical sépare les lignes.
     Le retrait horizontal reprend celui de l'encart pointillé juste en dessous,
     pour que les libellés s'alignent. Le radius, lui, ne sert qu'au ripple
     Android : sans forme fermée, il baverait jusqu'aux bords de la carte. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowLabel: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  rowSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  counterValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 24,
    minWidth: 16,
    textAlign: 'center',
  },
  /* Même géométrie que l'encart de saisie, en trait plein : la ligne existe
     déjà, on ne demande pas de la remplir, on la retouche. */
  editPanel: {
    ...DASHED_BOX,
    borderStyle: 'solid',
  },
  editHint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  /* La pastille de label déborde de 10px vers le haut : sans cette marge, elle
     viendrait chevaucher le bord de l'encart. */
  editSelect: {
    marginTop: 8,
    marginBottom: 0,
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
  /* Les abonnements se cochent, ils ne se choisissent pas dans une liste
     déroulante : pas de `Select`, donc pas de pastille de label incrustée dans
     la bordure — un intitulé posé au-dessus de la liste, simplement. */
  passesField: {
    marginTop: 12,
    gap: 8,
  },
  passesLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
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
