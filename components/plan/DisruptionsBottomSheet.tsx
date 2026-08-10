import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { MessageSquareWarning, AlertTriangle, Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import type { Disruption } from '@/services/transitService';
import { TransportLineBadge } from './TransportLineBadge';

/** Perturbation IDFM mise en forme par l'Edge Function `transit-journeys`. */
export type DisruptionItem = Disruption;

export interface DisruptionsBottomSheetProps {
  disruptions?: DisruptionItem[];
  onDismiss?: () => void;
}

export const DisruptionsBottomSheet = forwardRef<
  BaseBottomSheetModalRef,
  DisruptionsBottomSheetProps
>(({ disruptions, onDismiss }, ref) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const items = disruptions ?? [];

  return (
    <BaseBottomSheetModal
      ref={ref}
      showHeader
      title="Info trafic & Perturbations"
      subtitle={
        items.length > 0
          ? `${items.length} perturbation${items.length > 1 ? 's' : ''} sur votre trajet`
          : 'Aucune perturbation signalée sur votre trajet'
      }
      snapPoints={['65%']}
      stackBehavior="push">
      <View style={styles.container}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}>
          {items.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Île-de-France Mobilités ne signale aucune perturbation sur les lignes de
              cet itinéraire.
            </Text>
          )}

          {items.map((item, index) => {
            // Trois états lisibles à l'icône autant qu'à la couleur : interruption,
            // perturbation, information. Les teintes viennent du thème, sans quoi
            // le mode sombre garde des fonds clairs.
            const severityStyles = {
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
            }[item.severity ?? 'warning'];

            const {
              bg: badgeBg,
              border: badgeBorder,
              icon: iconColor,
              Icon: SeverityIcon,
              label: severityLabel,
            } = severityStyles;

            return (
              <View
                key={item.id || index}
                style={[
                  styles.disruptionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}>
                {/* Header row: Badge line + Severity tag */}
                <View style={styles.cardHeader}>
                  {item.mode && (
                    <TransportLineBadge
                      mode={item.mode}
                      lineName={item.lineName}
                      size={20}
                    />
                  )}

                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: badgeBg, borderColor: badgeBorder },
                    ]}>
                    <SeverityIcon size={13} color={iconColor} />
                    <Text style={[styles.severityText, { color: iconColor }]}>
                      {severityLabel}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.disruptionTitle, { color: theme.text }]}>
                  {item.title}
                </Text>

                {/* Message — absent quand IDFM ne publie qu'un titre */}
                {!!item.message && (
                  <Text style={[styles.disruptionMessage, { color: theme.textMuted }]}>
                    {item.message}
                  </Text>
                )}

                {/* Period */}
                {item.period && (
                  <View style={styles.periodRow}>
                    <Info size={13} color={theme.textMuted} />
                    <Text style={[styles.periodText, { color: theme.textMuted }]}>
                      {item.period}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </BottomSheetScrollView>

        {/* Action Button */}
        <Button
          title="J'ai compris"
          variant="primary"
          onPress={onDismiss}
          style={styles.ctaButton}
        />
      </View>
    </BaseBottomSheetModal>
  );
});

DisruptionsBottomSheet.displayName = 'DisruptionsBottomSheet';

export default DisruptionsBottomSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  scrollList: {
    gap: 12,
    paddingBottom: 16,
  },
  emptyText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  disruptionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
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
  },
  severityText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 12,
  },
  disruptionTitle: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  disruptionMessage: {
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
  ctaButton: {
    marginTop: 8,
  },
});
