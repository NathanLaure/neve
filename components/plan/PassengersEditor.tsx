import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Plus, Trash2, UserRound } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { DASHED_BOX, DASHED_BOX_ROW_HEIGHT } from '@/constants/DashedBox';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import {
  AGE_BRACKETS,
  AgeBracketId,
  DEFAULT_AGE_BRACKET,
  DEFAULT_TRANSPORT_PASS,
  Passenger,
  TRANSPORT_PASSES,
  TransportPassId,
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
  const [draftPass, setDraftPass] = useState<TransportPassId>(DEFAULT_TRANSPORT_PASS);

  const updatePassenger = (id: string, updates: Partial<Passenger>) => {
    onChange(
      passengers.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const removePassenger = (id: string) => {
    if (passengers.length <= 1) return;
    onChange(passengers.filter((p) => p.id !== id));
  };

  const confirmDraft = () => {
    if (!draftBracket) return;
    onChange([
      ...passengers,
      {
        id: nextPassengerId(),
        bracket: draftBracket,
        discountPass: draftPass,
      },
    ]);
    setDraftBracket(null);
    setDraftPass(DEFAULT_TRANSPORT_PASS);
  };

  return (
    <View style={styles.container}>
      {/* Liste des randonneurs existants */}
      {passengers.map((passenger, index) => {
        const isFirst = index === 0;
        const canDelete = passengers.length > 1;

        return (
          <Animated.View
            key={passenger.id}
            layout={REFLOW}
            entering={ENTER}
            exiting={EXIT}
            style={[
              styles.passengerCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.passengerHeader}>
              <View style={styles.passengerIdentity}>
                <UserRound size={18} color={theme.tint} />
                <Text style={[styles.passengerName, { color: theme.text }]}>
                  {isFirst ? 'Randonneur 1 (Vous)' : `Randonneur ${index + 1}`}
                </Text>
              </View>

              {canDelete && (
                <Pressable
                  accessibilityLabel={`Supprimer le randonneur ${index + 1}`}
                  hitSlop={8}
                  onPress={() => removePassenger(passenger.id)}
                  android_ripple={{ color: theme.ripple, borderless: true }}>
                  <Trash2 size={18} color={theme.tint} />
                </Pressable>
              )}
            </View>

            <View style={styles.passengerFields}>
              <Select
                label="Âge"
                value={passenger.bracket}
                options={AGE_BRACKETS.map((bracket) => ({
                  value: bracket.id,
                  label: bracket.label,
                }))}
                onSelect={(val) => updatePassenger(passenger.id, { bracket: val as AgeBracketId })}
                labelBackgroundColor={theme.card}
                containerStyle={styles.fieldItem}
              />

              <Select
                label="Abonnement"
                value={passenger.discountPass ?? DEFAULT_TRANSPORT_PASS}
                options={TRANSPORT_PASSES.map((pass) => ({
                  value: pass.id,
                  label: pass.label,
                }))}
                onSelect={(val) => updatePassenger(passenger.id, { discountPass: val as TransportPassId })}
                labelBackgroundColor={theme.card}
                containerStyle={styles.fieldItem}
              />
            </View>
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

          <Select
            label="Abonnement de transport"
            placeholder="Sélectionner..."
            value={draftPass}
            options={TRANSPORT_PASSES.map((pass) => ({
              value: pass.id,
              label: pass.label,
            }))}
            onSelect={(value) => setDraftPass(value as TransportPassId)}
            labelBackgroundColor={hostSurface}
            containerStyle={styles.draftSelect}
          />
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
            setDraftPass(DEFAULT_TRANSPORT_PASS);
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
  passengerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerName: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  passengerFields: {
    gap: 10,
  },
  fieldItem: {
    marginVertical: 2,
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
