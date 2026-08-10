import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';

export interface OutwardHeaderProps {
  departureName: string;
  destinationName: string;
  dateFormatted: string;
  passengersCountText: string;
  onBack: () => void;
  scrollY: SharedValue<number>;
  cardHeight: SharedValue<number>;
}

export const OutwardHeader: React.FC<OutwardHeaderProps> = ({
  departureName,
  destinationName,
  dateFormatted,
  passengersCountText,
  onBack,
  scrollY,
  cardHeight,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  /** Ratio 0 (déplié) à 1 (replié) */
  const collapse = useDerivedValue(() => {
    if (cardHeight.value <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY.value / cardHeight.value));
  });

  // Titre compact en topbar (apparaît quand collapse tend vers 1)
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(collapse.value, [0.5, 1], [8, 0], Extrapolation.CLAMP) }],
  }));

  // Résumé déplié (s'efface quand collapse tend vers 1)
  const expandedSummaryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(collapse.value, [0, 0.5], [0, -8], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <IconButton
          icon={<ArrowLeft size={18} color={theme.text} />}
          onPress={onBack}
          style={styles.backButton}
        />

        <Animated.View style={[styles.compactTitleContainer, compactTitleStyle]} pointerEvents="none">
          <Text style={[styles.compactTitleText, { color: theme.text }]} numberOfLines={1}>
            Aller : {departureName} → {destinationName}
          </Text>
          <Text style={[styles.compactSubtitleText, { color: theme.textMuted }]} numberOfLines={1}>
            {dateFormatted}, {passengersCountText}
          </Text>
        </Animated.View>
      </View>

      {/* Expanded Header Info (Avant scroll) */}
      <Animated.View style={[styles.expandedContainer, expandedSummaryStyle]}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Aller : {departureName} → {destinationName}
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          {dateFormatted}, {passengersCountText}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  compactTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitleText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 15,
  },
  compactSubtitleText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
  },
  expandedContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  headingTitle: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
  },
  headingSubtitle: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 13,
    marginTop: 2,
  },
});
