import React from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity } from 'react-native';
import { ChevronRight, MessageCircleWarning, AlertTriangle, Info, ArrowRight, Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TransitOption } from '@/services/transitService';
import { TransportLineBadge } from './TransportLineBadge';
import Badge, { BadgeVariant } from '@/components/Badge';

export interface SearchTransportCardProps {
  option: TransitOption;
  isSelected?: boolean;
  /**
   * Ouvre le détail de l'itinéraire. C'est là, et non sur cette carte, que le
   * trajet s'engage — voir `JourneyDetailSheet`.
   */
  onSelect?: () => void;
  showNavigoBadge?: boolean;
  hasPerturbations?: boolean;
  perturbationsCount?: number;
  disruptionLabel?: string;
  disruptionSeverity?: 'blocking' | 'error' | 'warning' | 'info' | 'success';
  onPressPerturbations?: () => void;
}

export const SearchTransportCard: React.FC<SearchTransportCardProps> = ({
  option,
  isSelected = false,
  onSelect,
  showNavigoBadge = false,
  hasPerturbations = option.hasPerturbations ?? false,
  perturbationsCount = option.perturbationsCount ?? 0,
  disruptionLabel,
  disruptionSeverity,
  onPressPerturbations,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Sequence of legs (transport and walking steps)
  const legsToDisplay = option.legs;

  // Calcul dynamique du libellé et du statut (info, success, warning, error)
  const effectiveSeverity = disruptionSeverity || option.disruptionSeverity;
  
  const badgeVariant: BadgeVariant =
    effectiveSeverity === 'blocking' || effectiveSeverity === 'error'
      ? 'error'
      : effectiveSeverity === 'info'
      ? 'info'
      : effectiveSeverity === 'success'
      ? 'success'
      : 'warning';

  const getStickerColors = () => {
    switch (badgeVariant) {
      case 'error':
        return {
          bg: theme.statusBgErrorSubtle,
          text: theme.statusTextError || theme.statusBgError,
        };
      case 'info':
        return {
          bg: theme.statusBgInfoSubtle,
          text: theme.statusTextInfo || theme.statusBgInfo,
        };
      case 'success':
        return {
          bg: theme.statusBgSuccessSubtle,
          text: theme.statusTextSuccess || theme.statusBgSuccess,
        };
      case 'warning':
      default:
        return {
          bg: theme.statusBgWarningSubtle,
          text: theme.statusTextWarning || theme.statusBgWarning,
        };
    }
  };

  const { bg: stickerBg, text: stickerColor } = getStickerColors();

  const labelText =
    disruptionLabel ??
    option.disruptionLabel ??
    (badgeVariant === 'error'
      ? 'Trafic interrompu'
      : perturbationsCount > 1
      ? 'Perturbations'
      : 'Perturbation');

  // L'icône double le code couleur : une interruption doit se distinguer d'une
  // simple info même pour qui ne perçoit pas la nuance rouge/orange.
  const SeverityIcon =
    badgeVariant === 'error'
      ? AlertTriangle
      : badgeVariant === 'info' || badgeVariant === 'success'
      ? Info
      : MessageCircleWarning;

  return (
    /* La carte entière ouvre le détail, et non ses seuls blocs : entre eux, le
       padding et les espacements laissaient des trous morts sous le doigt. Le
       bandeau perturbations reste la seule exception — imbriqué, il capte le
       geste pour lui et n'ouvre donc pas le détail. */
    <Pressable
      onPress={onSelect}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: isSelected ? theme.primary : 'rgba(0, 0, 0, 0)',
          overflow: 'hidden' as const,
        },
      ]}>
      {/* 2. Top Header Row: Departure → Arrival at Left | Price or Navigo Tag at Right */}
      <View style={styles.topHeaderRow}>
        <View style={styles.timesRow}>
          <Text style={[styles.departureTimeText, { color: theme.text }]}>{option.departureTime}</Text>
          <ArrowRight size={14} color={theme.textMuted} />
          <Text style={[styles.arrivalTimeText, { color: theme.text }]}>{option.arrivalTime}</Text>
        </View>

        {showNavigoBadge ? (
          <View style={[styles.priceBadgeContainer, { backgroundColor: theme.statusBgSuccessSubtle }]}>
            <Check size={14} color={theme.statusTextSuccess} />
            <Text style={[styles.cardPriceText, { color: theme.statusTextSuccess }]}>
              Pass' Navigo
            </Text>
          </View>
        ) : option.priceEstimate !== undefined ? (
          <View style={[styles.priceBadgeContainer, { backgroundColor: theme.statusBgInfoSubtle }]}>
            <Text style={[styles.cardPriceText, { color: theme.statusTextInfo }]}>
              {option.priceEstimate > 0
                ? `${option.priceEstimate.toFixed(2).replace('.', ',')} €`
                : 'Inclus'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 3. Transport Lines Sequence */}
      <View style={styles.legSequenceRow}>
        {legsToDisplay.map((leg, index) => {
          const isSameModeAsPrevious = index > 0 && legsToDisplay[index - 1].mode === leg.mode;
          return (
            <React.Fragment key={index}>
              {index > 0 && !isSameModeAsPrevious && (
                <ChevronRight size={16} color={theme.textMuted} style={styles.separator} />
              )}
              <TransportLineBadge
                mode={leg.mode}
                lineName={leg.lineName}
                lineColor={leg.lineColor}
                durationMinutes={leg.durationMinutes}
                size={22}
                hideModeIcon={isSameModeAsPrevious}
                style={isSameModeAsPrevious ? styles.sameModeGap : undefined}
              />
            </React.Fragment>
          );
        })}
      </View>

      {/* 4. Bottom Accordion Section (Sticker Perturbation + Accordion Bar) */}
      <View style={styles.accordionSection}>
        {hasPerturbations && (
          <Pressable
            onPress={onPressPerturbations}
            android_ripple={{
              color: theme.ripple,
              borderless: false,
              foreground: true,
            }}
            style={[
              styles.perturbationSticker,
              { backgroundColor: stickerBg, overflow: 'hidden' as const },
            ]}>
            <View style={styles.perturbationLeft}>
              <SeverityIcon size={16} color={stickerColor} />
              {/* Titre IDFM réel : parfois une phrase entière, tronquée ici, la
                  bottom sheet en donne le détail complet. */}
              <Text
                numberOfLines={1}
                style={[styles.perturbationText, { color: stickerColor }]}>
                {labelText}
              </Text>
            </View>
            <View style={styles.perturbationRight}>
              <Badge
                count={perturbationsCount}
                variant={badgeVariant}
                size="sm"
              />
              <ChevronRight size={14} color={stickerColor} />
            </View>
          </Pressable>
        )}

        <View
          style={[
            styles.accordionBar,
            {
              backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EFEFEF',
            },
          ]}>
          <View style={styles.accordionLeft}>
            <View style={styles.durationBox}>
              {(() => {
                const minutes = option.durationMinutes || 0;
                const textColor = theme.text;
                if (minutes < 60) {
                  return (
                    <>
                      <Text style={[styles.durationNumber, { color: textColor }]}>{minutes}</Text>
                      <Text style={[styles.durationUnit, { color: textColor }]}>min</Text>
                    </>
                  );
                }
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return (
                  <>
                    <Text style={[styles.durationNumber, { color: textColor }]}>{hours}</Text>
                    <Text style={[styles.durationUnit, { color: textColor }]}>h</Text>
                    {mins > 0 && (
                      <Text style={[styles.durationNumber, { color: textColor }]}>
                        {String(mins).padStart(2, '0')}
                      </Text>
                    )}
                  </>
                );
              })()}
            </View>

            <View style={[styles.vDivider, { backgroundColor: '#BDBDBD' }]} />

            <Text style={[styles.transfersText, { color: theme.text }]}>
              Voir le détail (
              {option.transfers === 0
                ? 'direct'
                : `${option.transfers} correspondance${option.transfers > 1 ? 's' : ''}`}
              )
            </Text>
          </View>

          <ChevronRight size={16} color={theme.text} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 8,
    padding: 12,
    gap: 4,
    width: '100%',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardPriceText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 12,
    fontStyle: 'italic',
  },
  departureTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 20,
  },
  arrivalTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 18,
  },
  legSequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  sameModeGap: {
    marginLeft: 2,
  },
  accordionSection: {
    gap: 4,
    width: '100%',
  },
  separator: {
    marginHorizontal: 1,
  },
  perturbationSticker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  perturbationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  perturbationText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 14,
  },
  perturbationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accordionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1, // Espacement entre chiffres et unités (h / min)
  },
  durationNumber: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 20,
  },
  durationUnit: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 11,
  },
  vDivider: {
    width: 1,
    height: 25,
  },
  transfersText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 14,
  },
});
