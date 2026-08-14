import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Info, MessageSquareWarning } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Disruption } from '@/services/transitService';
import { TransportLineBadge } from './TransportLineBadge';

export interface DisruptionCardProps {
  disruption: Disruption;
  /**
   * Masque la ligne concernée, quand la carte est déjà rendue au niveau de
   * l'étape qu'elle perturbe et que le badge ferait redite.
   */
  hideLine?: boolean;
  /**
   * `plain` : ni cadre ni pastille de gravité, pour un contenu déjà porté par un
   * bloc coloré qui les dit tous les deux (accordéon d'étape de la timeline).
   */
  variant?: 'card' | 'plain';
}

/**
 * Une perturbation IDFM : sa gravité, son titre, son message et sa période.
 * Partagée entre la feuille de liste (`DisruptionsBottomSheet`, ouverte depuis
 * les résultats) et le dépliage en place de la feuille de détail.
 */
export const DisruptionCard: React.FC<DisruptionCardProps> = ({
  disruption,
  hideLine = false,
  variant = 'card',
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Trois états lisibles à l'icône autant qu'à la couleur : interruption,
  // perturbation, information. Les teintes viennent du thème, sans quoi le mode
  // sombre garde des fonds clairs.
  const {
    bg: badgeBg,
    border: badgeBorder,
    icon: iconColor,
    Icon: SeverityIcon,
    label: severityLabel,
  } = {
    blocking: {
      bg: theme.statusBgErrorSubtle,
      border: theme.statusBgError,
      icon: theme.statusTextError,
      Icon: AlertTriangle,
      label: 'Interruption',
    },
    warning: {
      bg: theme.statusBgWarningSubtle,
      border: theme.statusBgWarning,
      icon: theme.statusTextWarning,
      Icon: MessageSquareWarning,
      label: 'Perturbation',
    },
    info: {
      bg: theme.statusBgInfoSubtle,
      border: theme.statusBgInfo,
      icon: theme.statusTextInfo,
      Icon: Info,
      label: 'Information',
    },
  }[disruption.severity ?? 'warning'];

  const isPlain = variant === 'plain';
  // En variante `plain`, le bloc qui porte la carte dit déjà la gravité par sa
  // couleur : le texte reprend la sienne au lieu des teintes neutres du thème.
  const titleColor = isPlain ? iconColor : theme.text;
  const bodyColor = isPlain ? iconColor : theme.textMuted;

  const header = hideLine || !disruption.mode ? null : (
    <TransportLineBadge mode={disruption.mode} lineName={disruption.lineName} size={20} />
  );

  return (
    <View
      style={
        isPlain
          ? styles.plain
          : [styles.card, { backgroundColor: theme.card, borderColor: theme.border }]
      }>
      {(header || !isPlain) && (
        <View style={styles.header}>
          {header}

          {!isPlain && (
            <View
              style={[styles.severityBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <SeverityIcon size={13} color={iconColor} />
              <Text style={[styles.severityText, { color: iconColor }]}>{severityLabel}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.title, { color: titleColor }]}>{disruption.title}</Text>

      {/* Message — absent quand IDFM ne publie qu'un titre */}
      {!!disruption.message && (
        <Text style={[styles.message, { color: bodyColor }]}>{disruption.message}</Text>
      )}

      {disruption.period && (
        <View style={styles.periodRow}>
          <Info size={13} color={bodyColor} />
          <Text style={[styles.periodText, { color: bodyColor }]}>{disruption.period}</Text>
        </View>
      )}
    </View>
  );
};

export default DisruptionCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  /* Ni fond ni cadre : le contenu se fond dans le bloc qui l'accueille. */
  plain: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    // Sans la ligne à sa gauche, la pastille reste sur le bord droit plutôt que
    // de s'étirer sur toute la largeur.
    marginLeft: 'auto',
  },
  severityText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  message: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  periodText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
  },
});
