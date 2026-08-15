import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Route, Star } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/**
 * La rando elle-même, au centre de la frise du résumé (Figma 677:41888).
 *
 * Volontairement distincte de `RandoCard` : celle-ci rend une vignette de carte,
 * un bouton favori et une pile d'images. Ici la rando n'est pas à choisir, elle
 * est déjà choisie — il ne reste qu'à la reconnaître entre deux trajets.
 */
export interface AdventureHikeCardProps {
  title: string;
  imageUrl?: string;
  location?: string;
  distance?: string;
  durationHours?: number;
  /** Note moyenne sur 5. Absente tant que la rando n'a pas été notée. */
  rating?: number | null;
  onPress?: () => void;
}

/** `8.4` → « 8h25 ». Les heures pleines restent « 8h », sans « h00 » inutile. */
export function formatHikeDuration(durationHours?: number): string | null {
  if (!durationHours || durationHours <= 0) return null;
  const totalMinutes = Math.round(durationHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
}

export default function AdventureHikeCard({
  title,
  imageUrl,
  location,
  distance,
  durationHours,
  rating,
  onPress,
}: AdventureHikeCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const duration = formatHikeDuration(durationHours);
  const hasRating = typeof rating === 'number' && rating > 0;

  return (
    /* Style en tableau statique et non en fonction de `pressed` : c'est la forme
       qu'emploie `SearchTransportCard`, la seule carte pressable de l'app qui
       peigne son fond. Le retour au doigt passe par le ripple, comme elle. */
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: theme.ripple, foreground: true } : undefined}
      style={[styles.card, { backgroundColor: theme.card }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.picture} resizeMode="cover" />
      ) : (
        <View style={[styles.picture, { backgroundColor: theme.surfaceSecondary }]} />
      )}

      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          {!!location && (
            <Text style={[styles.location, { color: theme.textMuted }]} numberOfLines={1}>
              {location}
            </Text>
          )}
        </View>

        {/* Le point médian ne sépare que des valeurs présentes : une rando encore
            non notée ne doit pas afficher « · 15 km ». */}
        <View style={styles.facts}>
          {hasRating && (
            <>
              <View style={styles.fact}>
                <Star size={14} color={theme.textMuted} fill={theme.textMuted} />
                <Text style={[styles.factLabel, { color: theme.textMuted }]}>
                  {rating.toFixed(1).replace('.', ',')}
                </Text>
              </View>
              <Text style={[styles.factLabel, { color: theme.textMuted }]}>·</Text>
            </>
          )}

          {!!distance && (
            <View style={styles.fact}>
              <Route size={14} color={theme.textMuted} />
              <Text style={[styles.factLabel, styles.factStrong, { color: theme.textMuted }]}>
                {distance}
              </Text>
            </View>
          )}

          {!!distance && !!duration && (
            <Text style={[styles.factLabel, { color: theme.textMuted }]}>·</Text>
          )}

          {!!duration && (
            <Text style={[styles.factLabel, styles.factStrong, { color: theme.textMuted }]}>
              {duration}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    // La vignette est encadrée et non à fond perdu : 4px tout autour, sauf à
    // droite où le texte garde ses 12px.
    paddingLeft: 4,
    paddingVertical: 4,
    paddingRight: 12,
    borderRadius: 20,
    /*
     * Pas d'`overflow: 'hidden'` ici : la vignette porte son propre rayon, plus
     * rien ne dépasse à rogner. Et sur Android, le rognage combiné à `elevation`
     * escamote le fond de la carte en même temps que ce qu'il devait couper.
     */
    // Figma `shadow-box`.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  picture: {
    width: 100,
    alignSelf: 'stretch',
    /*
     * `alignSelf: 'stretch'` fait suivre la hauteur du texte, mais cette hauteur
     * est celle de la rangée : si elle se résout à zéro, la vignette disparaît
     * sans laisser de place. Ce plancher lui en garantit une — c'est la hauteur
     * qu'occupe un titre d'une seule ligne.
     */
    minHeight: 90,
    borderRadius: 16,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    // Titre en haut, chiffres en bas : la carte respire quand le titre tient sur
    // une seule ligne.
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    gap: 4,
  },
  /* Un cran au-dessus de la maquette : ses 16/11 px tiennent sur un écran de
     design, pas dans la main. La hiérarchie entre les trois niveaux est
     conservée telle quelle. */
  title: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    lineHeight: 21,
  },
  location: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 17,
  },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  factLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 17,
  },
  factStrong: {
    fontFamily: 'Satoshi-Bold',
  },
});
