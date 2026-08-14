import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { ArrowLeft, User } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';

export interface OutwardHeaderProps {
  departureName: string;
  destinationName: string;
  dateFormatted: string;
  timeFormatted: string;
  passengersCountText: string;
  onBack: () => void;
  /** Ouvre la feuille de modification/ajout de randonneur, si fournie. */
  onPressPassengers?: () => void;
  scrollY: SharedValue<number>;
  cardHeight: SharedValue<number>;
}

/**
 * Barre d'actions fixe (Figma 335:6371) : ne défile jamais. La carte
 * d'itinéraire, les pills de dates et les chips de filtre vivent dans le corps
 * défilant de l'écran, et non ici — voir app/plan/outward.tsx & return.tsx.
 * `cardHeight` (mesurée sur ce même bloc défilant) sert seulement à faire
 * apparaître le résumé compact une fois la carte sortie sous cette barre.
 */
export const OutwardHeader: React.FC<OutwardHeaderProps> = ({
  departureName,
  destinationName,
  dateFormatted,
  timeFormatted,
  passengersCountText,
  onBack,
  onPressPassengers,
  scrollY,
  cardHeight,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /** Ratio 0 (carte visible) à 1 (carte sortie sous la barre). */
  const collapse = useDerivedValue(() => {
    if (cardHeight.value <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY.value / cardHeight.value));
  });

  // Le chip passagers laisse sa place au résumé compact une fois la carte
  // repliée : démonté (et non simplement masqué) pour que `titleContainer`,
  // seul flex restant de la ligne, en récupère vraiment la largeur.
  const [showPassengerChip, setShowPassengerChip] = useState(true);
  useAnimatedReaction(
    () => collapse.value > 0.55,
    (isCollapsed, wasCollapsed) => {
      if (isCollapsed !== wasCollapsed) {
        runOnJS(setShowPassengerChip)(!isCollapsed);
      }
    }
  );

  // Relais plutôt que fondu croisé, comme dans app/plan.tsx : le titre statique
  // s'efface sur la première moitié du parcours, le résumé compact n'apparaît
  // que sur la seconde — jamais de vide entre les deux.
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  // Résumé compact en topbar (n'apparaît qu'une fois la carte défilée).
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(collapse.value, [0.55, 1], [8, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.actionBar}>
        <IconButton
          icon={<ArrowLeft size={18} color={theme.text} />}
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: theme.card }]}
        />

        <View style={styles.titleContainer}>
          <Animated.Text
            style={[styles.staticTitleText, { color: theme.text }, titleStyle]}
            numberOfLines={1}
            pointerEvents="none">
            Planification
          </Animated.Text>

          <Animated.View
            style={[styles.compactTitleContainer, compactTitleStyle]}
            pointerEvents="none">
            <Text style={[styles.compactTitleText, { color: theme.text }]} numberOfLines={1}>
              {departureName}
            </Text>
            <Text style={[styles.compactTitleText, { color: theme.text }]} numberOfLines={1}>
              {destinationName}
            </Text>
            <Text style={[styles.compactSubtitleText, { color: theme.textMuted }]} numberOfLines={1}>
              {dateFormatted}, {timeFormatted}, {passengersCountText}
            </Text>
          </Animated.View>
        </View>

        {showPassengerChip && (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
            <Pressable
              onPress={onPressPassengers}
              disabled={!onPressPassengers}
              android_ripple={
                !onPressPassengers
                  ? undefined
                  : {
                      color: theme.ripple,
                      borderless: false,
                      foreground: true,
                    }
              }
              style={[
                styles.passengerPill,
                { backgroundColor: theme.card, overflow: 'hidden' as const },
              ]}>
              <User size={16} color={theme.text} />
              <Text style={[styles.passengerPillText, { color: theme.text }]}>{passengersCountText}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    // Assez haut pour les 3 lignes du résumé compact (2 x 18 + 16) : sans
    // ça, superposé en absolu, il déborderait de cette boîte au lieu de la
    // faire grandir — voir compactTitleContainer.
    minHeight: 54,
  },
  staticTitleText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  compactTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  compactTitleText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 18,
  },
  compactSubtitleText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 16,
  },
  passengerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  passengerPillText: {
    fontFamily: 'BricolageGrotesque-Medium',
    fontSize: 14,
  },
});
