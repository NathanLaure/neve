import React, { forwardRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { useScrollFade } from '@/components/ScrollFade';
import type { Disruption } from '@/services/transitService';
import DisruptionCard from './DisruptionCard';

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

  // Le pied de page ne porte son ombre que tant qu'il reste du contenu dessous.
  const { hasMore, scrollProps } = useScrollFade();

  return (
    <BaseBottomSheetModal
      ref={ref}
      title="Info trafic & Perturbations"
      subtitle={
        items.length > 0
          ? `${items.length} perturbation${items.length > 1 ? 's' : ''} sur votre trajet`
          : 'Aucune perturbation signalée sur votre trajet'
      }
      snapPoints={['65%']}
      stackBehavior="push"
      scrollableBody
      footerShadow={hasMore}
      primaryButtonTitle="J'ai compris"
      onPrimaryPress={onDismiss}>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        {...scrollProps}>
          {items.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Île-de-France Mobilités ne signale aucune perturbation sur les lignes de
              cet itinéraire.
            </Text>
          )}

          {items.map((item, index) => (
            <DisruptionCard key={item.id || index} disruption={item} />
          ))}
        </BottomSheetScrollView>
    </BaseBottomSheetModal>
  );
});

DisruptionsBottomSheet.displayName = 'DisruptionsBottomSheet';

export default DisruptionsBottomSheet;

const styles = StyleSheet.create({
  scrollList: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
});
