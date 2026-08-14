import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AlertTriangle, Info, MessageCircleWarning } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import AnimatedChevron from '@/components/AnimatedChevron';
import Collapsible, { COLLAPSE_DURATION, COLLAPSE_EASING } from '@/components/Collapsible';
import type { Disruption } from '@/services/transitService';
import DisruptionCard from './DisruptionCard';

/** La plus grave l'emporte : une interruption ne doit pas se lire comme une info. */
function worstSeverity(disruptions: Disruption[]): Disruption['severity'] {
  if (disruptions.some((item) => item.severity === 'blocking')) return 'blocking';
  if (disruptions.some((item) => item.severity === 'warning')) return 'warning';
  return disruptions[0]?.severity ?? 'warning';
}

export interface LegDisruptionsProps {
  disruptions: Disruption[];
}

/**
 * Perturbations d'un tronçon, posées sur l'étape qu'elles touchent dans
 * `JourneyTimeline` : « c'est ce RER-là qui est perturbé » se lit au bon endroit,
 * là où un bandeau en tête de feuille n'aurait dit qu'un compte.
 *
 * Un seul bloc, qui grandit : le détail sort dans le cadre coloré du résumé et
 * non dans une carte posée dessous. La couleur et l'icône y disent déjà la
 * gravité, les cartes n'ont donc ni cadre ni pastille (`variant="plain"`).
 */
export const LegDisruptions: React.FC<LegDisruptionsProps> = ({ disruptions }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [expanded, setExpanded] = useState(false);

  const severity = {
    blocking: {
      bg: theme.statusBgErrorSubtle,
      color: theme.statusTextError,
      Icon: AlertTriangle,
    },
    warning: {
      bg: theme.statusBgWarningSubtle,
      color: theme.statusTextWarning,
      Icon: MessageCircleWarning,
    },
    info: { bg: theme.statusBgInfoSubtle, color: theme.statusTextInfo, Icon: Info },
  }[worstSeverity(disruptions)];

  /*
   * Le résumé s'efface à l'ouverture quand il n'y a qu'une perturbation : il
   * reprend alors son titre, affiché juste en dessous une fois déplié. À
   * plusieurs, il annonce leur nombre et ne fait doublon avec rien — il reste.
   *
   * C'est l'opacité qui est animée, et non le texte démonté : sans quoi le
   * chevron, qui le suit, se décalerait.
   */
  const hidesSummary = expanded && disruptions.length === 1;

  const summaryOpacity = useSharedValue(hidesSummary ? 0 : 1);

  useEffect(() => {
    summaryOpacity.value = withTiming(hidesSummary ? 0 : 1, {
      duration: COLLAPSE_DURATION,
      easing: COLLAPSE_EASING,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stables
  }, [hidesSummary]);

  const summaryStyle = useAnimatedStyle(() => ({ opacity: summaryOpacity.value }));

  if (disruptions.length === 0) return null;

  const SeverityIcon = severity.Icon;

  return (
    <View style={[styles.block, { backgroundColor: severity.bg }]}>
      <Pressable
        onPress={() => setExpanded((open) => !open)}
        android_ripple={{
          color: theme.ripple,
          borderless: true,
        }}
        style={styles.header}>
        <SeverityIcon size={14} color={severity.color} />
        <Animated.Text
          numberOfLines={1}
          style={[styles.summaryText, { color: severity.color }, summaryStyle]}>
          {disruptions.length > 1
            ? `${disruptions.length} perturbations`
            : disruptions[0].title}
        </Animated.Text>
        <AnimatedChevron expanded={expanded} size={14} color={severity.color} />
      </Pressable>

      <Collapsible expanded={expanded}>
        <View style={styles.details}>
          {disruptions.map((item, index) => (
            <DisruptionCard
              key={item.id || index}
              disruption={item}
              variant="plain"
              hideLine
            />
          ))}
        </View>
      </Collapsible>
    </View>
  );
};

export default LegDisruptions;

const styles = StyleSheet.create({
  block: {
    borderRadius: 8,
    padding: 8,
    // Compense le `gap` de la colonne, trop large pour rattacher visuellement
    // l'avertissement au cartouche de ligne qui le précède.
    marginTop: -4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  /* Marge portée par la liste et non par le `Collapsible` : celui-ci anime sa
     hauteur jusqu'à zéro, une marge sur lui laisserait un blanc une fois replié. */
  details: {
    gap: 12,
    paddingTop: 8,
  },
});
