import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ArrowRight, Check, ChevronRight } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { Button } from '@/components/Button';
import { useScrollFade } from '@/components/ScrollFade';
import { TransitOption } from '@/services/transitService';
import { TransportLineBadge } from './TransportLineBadge';
import JourneyTimeline from './JourneyTimeline';

export interface JourneyDetailSheetProps {
  /** Itinéraire dont on montre le détail. Nul tant qu'aucune carte n'a été tapée. */
  option: TransitOption | null;
  departureName?: string;
  destinationName?: string;
  showNavigoBadge?: boolean;
  /**
   * Libellé du bouton d'engagement : « Choisir cet ALLER » / « … ce RETOUR ».
   * Sans `onConfirm`, aucun bouton n'est rendu — la feuille se contente alors de
   * montrer le trajet, cas d'une aventure passée.
   */
  primaryLabel?: string;
  onConfirm?: () => void;
  /** Appelé quelle que soit la façon dont la feuille s'est refermée. */
  onClose?: () => void;
}

/**
 * Détail complet d'un itinéraire, ouvert à la tape sur une carte de résultat
 * (Figma 336:8313). C'est ici, et non sur la carte, que le trajet s'engage :
 * `SearchTransportCard` ne se déplie plus.
 */
export const JourneyDetailSheet = forwardRef<BaseBottomSheetModalRef, JourneyDetailSheetProps>(
  (
    {
      option,
      departureName,
      destinationName,
      showNavigoBadge = false,
      primaryLabel,
      onConfirm,
      onClose,
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Le pied de page ne porte son ombre que tant qu'il reste du contenu dessous.
    const { hasMore, scrollProps } = useScrollFade();

    /*
     * Pas de bandeau récapitulatif ici : les perturbations sont rendues par
     * `JourneyTimeline`, sur l'étape que chacune touche. Un compte global en tête
     * n'aurait dit que « ce trajet a 2 perturbations », là où le trajet lui-même
     * peut dire laquelle de ses lignes est concernée.
     *
     * C'est aussi ce qui évite d'empiler une feuille sur une feuille déjà pleine
     * hauteur. `DisruptionsBottomSheet` garde son rôle depuis la liste de
     * résultats, où elle s'ouvre au-dessus d'un écran.
     */

    return (
      <BaseBottomSheetModal
        ref={ref}
        snapPoints={['100%']}
        stackBehavior="push"
        onClose={onClose}
        scrollableBody
        footerShadow={hasMore}
        inlineCloseButton
        headerDivider
        headerContent={
          option ? (
            /* Seule la séquence des lignes reste épinglée : le reste défile. */
            <View style={styles.legSequenceRow}>
              {option.legs.map((leg, index) => {
                const isSameModeAsPrevious =
                  index > 0 && option.legs[index - 1].mode === leg.mode;
                return (
                  <React.Fragment key={index}>
                    {index > 0 && !isSameModeAsPrevious && (
                      <ChevronRight size={16} color={theme.textMuted} />
                    )}
                    <TransportLineBadge
                      mode={leg.mode}
                      lineName={leg.lineName}
                      lineColor={leg.lineColor}
                      durationMinutes={leg.durationMinutes}
                      size={22}
                      hideModeIcon={isSameModeAsPrevious}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          ) : null
        }
        footer={
          option ? (
            <View style={styles.footerRow}>
              {onConfirm ? (
                <Button
                  title={primaryLabel}
                  variant="secondary"
                  onPress={onConfirm}
                  style={styles.footerButton}
                />
              ) : (
                /* Sans engagement possible, le rappel de durée occupe seul la
                   ligne : il reste ce que la feuille a à dire. */
                <View style={styles.footerButton} />
              )}
              {/* Rappel de ce à quoi l'utilisateur s'engage : durée du trajet et
                  heure à laquelle il arrive. */}
              <View style={styles.footerRecap}>
                <Text style={[styles.footerDuration, { color: theme.text }]}>
                  {option.durationFormatted}
                </Text>
                <Text style={[styles.footerArrival, { color: theme.textMuted }]}>
                  {option.arrivalTime}
                </Text>
              </View>
            </View>
          ) : undefined
        }>
        {/* `overScrollMode` : gorhom le fige à « never », ce qui prive Android de
            l'étirement élastique en bout de course (natif depuis Android 12).
            Ici la feuille est à 100 % et ne se referme pas en tirant le contenu :
            rien ne se dispute le geste, l'étirement peut reprendre sa place. */}
        <BottomSheetScrollView
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          {...scrollProps}>
          {option && (
            <>
              <View style={styles.timesRow}>
                <View style={styles.times}>
                  <Text style={[styles.departureTimeText, { color: theme.text }]}>
                    {option.departureTime}
                  </Text>
                  <ArrowRight size={16} color={theme.textMuted} />
                  <Text style={[styles.arrivalTimeText, { color: theme.text }]}>
                    {option.arrivalTime}
                  </Text>
                </View>

                {showNavigoBadge ? (
                  <View
                    style={[
                      styles.priceBadgeContainer,
                      { backgroundColor: theme.statusBgSuccessSubtle },
                    ]}>
                    <Check size={12} color={theme.statusTextSuccess} />
                    <Text style={[styles.priceText, { color: theme.statusTextSuccess }]}>
                      Pass' Navigo
                    </Text>
                  </View>
                ) : option.priceEstimate !== undefined ? (
                  <View
                    style={[
                      styles.priceBadgeContainer,
                      { backgroundColor: theme.statusBgInfoSubtle },
                    ]}>
                    <Text style={[styles.priceText, { color: theme.statusTextInfo }]}>
                      {option.priceEstimate > 0
                        ? `${option.priceEstimate.toFixed(2).replace('.', ',')} €`
                        : 'Inclus'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <JourneyTimeline
                option={option}
                departureName={departureName}
                destinationName={destinationName}
              />
            </>
          )}
        </BottomSheetScrollView>
      </BaseBottomSheetModal>
    );
  }
);

JourneyDetailSheet.displayName = 'JourneyDetailSheet';

export default JourneyDetailSheet;

const styles = StyleSheet.create({
  legSequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  departureTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 28,
  },
  arrivalTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 24,
  },
  priceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 12,
    fontStyle: 'italic',
  },
  /* La marge haute est portée par la liste et non par le `Collapsible` : celui-ci
     anime sa hauteur jusqu'à zéro, une marge sur lui laisserait un blanc replié. */
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerButton: {
    flex: 1,
  },
  footerRecap: {
    alignItems: 'flex-end',
  },
  footerDuration: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 24,
  },
  footerArrival: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 14,
  },
});
