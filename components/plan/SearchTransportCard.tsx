import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Clock, ChevronRight, ChevronDown, MessageCircleWarning, AlertTriangle, Info, ArrowRight, Check, Footprints, MapPin } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TransitOption } from '@/services/transitService';
import Collapsible, { COLLAPSE_DURATION, COLLAPSE_EASING } from '@/components/Collapsible';
import { TransportLineBadge } from './TransportLineBadge';
import Badge, { BadgeVariant } from '@/components/Badge';

/**
 * Chevron qui pivote au rythme du panneau qu'il commande. Composant à part car
 * il porte un hook et doit pouvoir être rendu dans la boucle des étapes.
 */
const AnimatedChevron: React.FC<{
  expanded: boolean;
  direction: 'down' | 'right';
  size: number;
  color: string;
}> = ({ expanded, direction, size, color }) => {
  // Le chevron « bas » se retourne, le chevron « droite » bascule d'un quart de
  // tour — dans les deux cas il finit en pointant vers le contenu déplié.
  const openAngle = direction === 'down' ? 180 : 90;

  /* eslint-disable react-hooks/immutability */
  // L'animation est pilotée depuis l'effet : un worklet qui lirait `expanded`
  // directement resterait figé sur la valeur du premier rendu.
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: COLLAPSE_DURATION,
      easing: COLLAPSE_EASING,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stables
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * openAngle}deg` }],
  }));

  const Icon = direction === 'down' ? ChevronDown : ChevronRight;

  return (
    <Animated.View style={animatedStyle}>
      <Icon size={size} color={color} />
    </Animated.View>
  );
};

function addMinutesToTime(timeStr?: string, minutesToAdd: number = 0): string {
  if (!timeStr) return '';
  const cleanTime = timeStr.replace('h', ':');
  if (!cleanTime.includes(':')) return timeStr;
  const [h, m] = cleanTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const total = h * 60 + m + Math.round(minutesToAdd);
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export interface SearchTransportCardProps {
  option: TransitOption;
  isSelected?: boolean;
  onSelect?: () => void;
  showNavigoBadge?: boolean;
  /**
   * Libellé choisi par l'utilisateur pour son point de départ (adresse saisie,
   * « Ma position »…). Navitia ne renvoie que l'adresse géocodée la plus proche,
   * qui ne correspond pas à ce que l'utilisateur a demandé.
   */
  departureName?: string;
  /**
   * Libellé de la destination demandée (gare de la rando, nom du lieu…). Le
   * dernier tronçon ne porte que l'adresse géocodée par Navitia au point exact
   * visé — « Route Baudrillard » plutôt que la gare ou le sentier attendu.
   */
  destinationName?: string;
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
  departureName,
  destinationName,
  hasPerturbations = option.hasPerturbations ?? false,
  perturbationsCount = option.perturbationsCount ?? 0,
  disruptionLabel,
  disruptionSeverity,
  onPressPerturbations,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLegStops, setExpandedLegStops] = useState<Record<number, boolean>>({});

  const toggleLegStops = (idx: number) => {
    setExpandedLegStops((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Sequence of legs (transport and walking steps)
  const legsToDisplay = option.legs;

  // Marche d'accès depuis une adresse ou une position GPS : elle a son propre
  // bloc « Départ » en tête de timeline, et sort donc de la boucle des étapes
  // (sinon elle s'y afficherait comme une correspondance, sans point de départ).
  const accessWalk =
    option.legs[0]?.mode === 'walk' && option.legs[0]?.walkType === 'access'
      ? option.legs[0]
      : undefined;
  const timelineLegs = accessWalk ? option.legs.slice(1) : option.legs;

  // Les blocs Départ/Arrivée annoncent le lieu demandé, et le point géocodé par
  // Navitia seulement en second : « Gare de Fontainebleau-Avon » dit où l'on va,
  // « Route Baudrillard » dit seulement où l'itinéraire dépose.
  const departureTitle = departureName || accessWalk?.fromName || 'Votre position';
  const departureDetail =
    accessWalk?.fromName && accessWalk.fromName !== departureTitle
      ? accessWalk.fromName
      : undefined;

  const arrivalPlace = timelineLegs[timelineLegs.length - 1]?.toName;
  const arrivalTitle = destinationName || arrivalPlace || 'Destination';
  const arrivalDetail = arrivalPlace && arrivalPlace !== arrivalTitle ? arrivalPlace : undefined;

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
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: isSelected ? theme.primary :'rgba(0, 0, 0, 0)',
        },
      ]}>
      {/* 2. Top Header Row: Departure → Arrival at Left | Price or Navigo Tag at Right */}
      <Pressable onPress={onSelect} style={styles.topHeaderRow}>
        <View style={styles.timesRow}>
          <Text style={[styles.departureTimeText, { color: theme.text }]}>{option.departureTime}</Text>
          <ArrowRight size={14} color={theme.textMuted} />
          <Text style={[styles.arrivalTimeText, { color: theme.text }]}>{option.arrivalTime}</Text>
        </View>

        {showNavigoBadge ? (
          <View style={[styles.priceBadgeContainer, { backgroundColor: theme.statusBgSuccessSubtle }]}>
            <Check size={12} color={theme.statusTextSuccess} />
            <Text style={[styles.cardPriceText, { color: theme.statusTextSuccess }]}>
              Inclus Navigo
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
      </Pressable>

      {/* 3. Transport Lines Sequence */}
      <Pressable onPress={onSelect} style={styles.legSequenceRow}>
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
      </Pressable>

      {/* 4. Bottom Accordion Section (Sticker Perturbation + Accordion Bar) */}
      <View style={styles.accordionSection}>
        {hasPerturbations && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPressPerturbations}
            style={[
              styles.perturbationSticker,
              { backgroundColor: stickerBg },
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
          </TouchableOpacity>
        )}

        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
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

          <AnimatedChevron expanded={isExpanded} direction="down" size={16} color={theme.text} />
        </Pressable>
      </View>

      {/* 4. Expanded Content Timeline (Maquette Figma node 336:8313) */}
      <Collapsible expanded={isExpanded}>
        <View style={styles.expandedContent}>
          {/* 0. Étape de départ, quand le trajet commence par rejoindre le réseau
                à pied depuis une adresse ou la position de l'utilisateur */}
          {accessWalk && (
            <>
              <View style={styles.departureBlockRow}>
                <View
                  style={[
                    styles.arrivalOrangeBadge,
                    { backgroundColor: theme.primary || '#EB490B' },
                  ]}>
                  <Text style={styles.arrivalBadgeTimeText}>{option.departureTime}</Text>
                  <View style={styles.arrivalWhiteSolidDot} />
                </View>

                <View style={styles.detailsColFlex}>
                  <Text style={[styles.arrivalPrefixText, { color: theme.text }]}>
                    Départ :
                  </Text>
                  <Text
                    style={[styles.arrivalStationNameText, { color: theme.text }]}
                    numberOfLines={1}>
                    {departureTitle}
                  </Text>
                  {!!departureDetail && (
                    <Text
                      style={[styles.pointDetailText, { color: theme.textMuted }]}
                      numberOfLines={1}>
                      {departureDetail}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.transferStepRow}>
                <View style={styles.timesColFlex} />
                <View style={styles.barColFlex}>
                  <View style={styles.dotGroup}>
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                  </View>
                  <Footprints size={14} color={theme.textMuted} style={{ marginVertical: 3 }} />
                  <View style={styles.dotGroup}>
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                    <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                  </View>
                </View>
                <Text style={[styles.transferText, { color: theme.textMuted }]}>
                  {/* Navitia renvoie parfois une durée nulle sur un accès à vol
                      d'oiseau : annoncer « 0 min » ferait plus de bruit que de bien. */}
                  {accessWalk.durationMinutes > 0
                    ? `${accessWalk.durationMinutes} min de marche`
                    : 'Marche'}
                  {accessWalk.toName ? ` jusqu'à ${accessWalk.toName}` : ''}
                </Text>
              </View>
            </>
          )}

          {(() => {
            // La marche d'accès est déjà décomptée par le bloc de départ.
            let cumulativeMinutes = accessWalk?.durationMinutes ?? 0;
            return timelineLegs.map((leg, idx) => {
              const isWalk = leg.mode === 'walk';
              const bgBadge = leg.lineColor || (leg.mode === 'bus' ? '#760C6B' : leg.mode === 'rer' ? '#E3051C' : '#6E6E9D');
              const isStopsExpanded = !!expandedLegStops[idx];

              const departureTimeStr = leg.departureTime || addMinutesToTime(option.departureTime, cumulativeMinutes);
              cumulativeMinutes += leg.durationMinutes || 0;
              const arrivalTimeStr = leg.arrivalTime || addMinutesToTime(option.departureTime, cumulativeMinutes);

              if (isWalk) {
                const isLastLeg = idx === timelineLegs.length - 1;
                return (
                  <View key={idx} style={styles.transferStepRow}>
                    <View style={styles.timesColFlex} />
                    <View style={styles.barColFlex}>
                      <View style={styles.dotGroup}>
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                      </View>
                      <Footprints size={14} color={theme.textMuted} style={{ marginVertical: 3 }} />
                      <View style={styles.dotGroup}>
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                      </View>
                    </View>
                    <Text style={[styles.transferText, { color: theme.textMuted }]}>
                      {isLastLeg
                        ? `Marche vers la destination ${leg.durationMinutes ? `(${leg.durationMinutes} min)` : ''}`
                        : `Correspondance ${leg.durationMinutes ? `: ${leg.durationMinutes} min de marche environ` : ''}`}
                    </Text>
                  </View>
                );
              }

              const directionStr = leg.direction || `Direction ${leg.toName}`;

              const defaultStopsMap: Record<string, string[]> = {
                '14': ['Madeleine', 'Pyramides', 'Châtelet', 'Gare de Lyon', 'Bercy'],
                '13': ['Liège', 'Place de Clichy', 'La Fourche', 'Guy Môquet', 'Porte de Saint-Ouen'],
                '1': ['Concorde', 'Tuileries', 'Palais Royal - Louvre', 'Louvre - Rivoli', 'Châtelet'],
                '4': ['St-Germain-des-Prés', 'Odéon', 'Saint-Michel', 'Cité', 'Châtelet'],
              };

              const fallbackStops = defaultStopsMap[leg.lineName || ''] || [
                `${leg.fromName} (+1)`,
                `${leg.fromName} (+2)`,
                `${leg.fromName} (+3)`,
              ];

              const intermediateStops = (leg.intermediateStops && leg.intermediateStops.length > 0) ? leg.intermediateStops : fallbackStops;
              const stopsCount = leg.intermediateStopsCount || intermediateStops.length;

              return (
                <React.Fragment key={idx}>
                  <View style={styles.stepItineraryRow}>
                  {/* 1. Colonne des Heures (Gauche) */}
                  <View style={styles.timesColFlex}>
                    <Text style={[styles.stepTimeText, { color: theme.text }]}>{departureTimeStr}</Text>
                    <Text style={[styles.stepTimeText, { color: theme.text }]}>{arrivalTimeStr}</Text>
                  </View>

                  {/* 2. Colonne Centrale (Badge Mode + Filet Vertical Continu + Dot Blanc) */}
                  <View style={styles.barColFlex}>
                    <View style={styles.modeIconCircleBox}>
                      <TransportLineBadge mode={leg.mode} size={20} hideModeIcon={false} />
                    </View>
                    <View style={[styles.continuousVerticalLine, { backgroundColor: bgBadge }]}>
                      <View style={styles.whiteInnerDot} />
                    </View>
                  </View>

                  {/* 3. Colonne de Droite (Station Départ, Cartouche, Arrêts, Station Arrivée) */}
                  <View style={styles.detailsColFlex}>
                    {/* Station Départ */}
                    <Text style={[styles.stationTitle, { color: theme.text }]} numberOfLines={1}>
                      {leg.fromName}
                    </Text>

                    {/* Cartouche d'informations de la ligne */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => toggleLegStops(idx)}
                      style={[styles.lineDetailCard, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EFEFEF' }]}>
                      <View style={styles.lineDetailCardHeader}>
                        <TransportLineBadge
                          mode={leg.mode}
                          lineName={leg.lineName}
                          lineColor={leg.lineColor}
                          size={18}
                          hideModeIcon
                        />
                        <AnimatedChevron
                          expanded={isStopsExpanded}
                          direction="right"
                          size={14}
                          color={theme.textMuted}
                        />
                      </View>
                      <Text style={[styles.directionText, { color: theme.textMuted }]} numberOfLines={1}>
                        {directionStr}
                      </Text>
                    </TouchableOpacity>

                    {/* Synthèse ou Accordéon des arrêts */}
                    {stopsCount > 0 && (
                      <Pressable onPress={() => toggleLegStops(idx)} style={styles.stopsToggleButton}>
                        <Text style={[styles.stopsSummaryText, { color: theme.textMuted }]}>
                          {stopsCount} arrêt{stopsCount > 1 ? 's' : ''} ({leg.durationMinutes || 10} min)
                        </Text>
                      </Pressable>
                    )}

                    {/* Liste des arrêts intermédiaires dépliée */}
                    {isStopsExpanded && intermediateStops.length > 0 && (
                      <View style={styles.intermediateStopsContainer}>
                        {intermediateStops.map((stop, stopIdx) => {
                          const stopName = typeof stop === 'string' ? stop : stop.name;
                          const stopTime = typeof stop === 'string' ? undefined : stop.time;
                          return (
                            <View key={stopIdx} style={styles.intermediateStopRow}>
                              <View style={styles.stopDotOnLinePositioned} />
                              <Text style={[styles.intermediateStopText, { color: theme.textMuted }]}>{stopName}</Text>
                              {stopTime && <Text style={[styles.intermediateTimeText, { color: theme.textMuted }]}>{stopTime}</Text>}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Station Arrivée */}
                    <Text style={[styles.stationTitle, { color: theme.text }]} numberOfLines={1}>
                      {leg.toName}
                    </Text>
                  </View>
                </View>

                {/* Si l'étape suivante est un transport sans étape de marche intermédiaire explicite, afficher une correspondance avec pointillés */}
                {idx < timelineLegs.length - 1 && leg.mode !== 'walk' && timelineLegs[idx + 1].mode !== 'walk' && (
                  <View key={`transfer-${idx}`} style={styles.transferStepRow}>
                    <View style={styles.timesColFlex} />
                    <View style={styles.barColFlex}>
                      <View style={styles.dotGroup}>
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                      </View>
                      <Footprints size={14} color={theme.textMuted} style={{ marginVertical: 2 }} />
                      <View style={styles.dotGroup}>
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                        <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                      </View>
                    </View>
                    <Text style={[styles.transferText, { color: theme.textMuted }]}>
                      Correspondance
                    </Text>
                  </View>
                )}
              </React.Fragment>
              );
            });
          })()}

          {/* Ligne de pointillés de correspondance uniquement si la dernière étape N'EST PAS déjà de la marche */}
          {timelineLegs[timelineLegs.length - 1]?.mode !== 'walk' && (
            <View style={styles.transferStepRow}>
              <View style={styles.timesColFlex} />
              <View style={styles.barColFlex}>
                <View style={styles.dotGroup}>
                  <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                  <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                  <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                  <View style={[styles.dotCircle, { backgroundColor: theme.textMuted }]} />
                </View>
              </View>
              <View style={styles.detailsColFlex} />
            </View>
          )}

          {/* 5. Étape d'arrivée finale (Mise à jour Figma node 629:21428) */}
          <View style={styles.finalArrivalBlockRow}>
            {/* Pilule d'arrivée orange unique et continue */}
            <View style={[styles.arrivalOrangeBadge, { backgroundColor: theme.primary || '#EB490B' }]}>
              <Text style={styles.arrivalBadgeTimeText}>
                {option.arrivalTime}
              </Text>
              <View style={styles.arrivalWhiteSolidDot} />
            </View>

            {/* Texte d'arrivée en 2 lignes (Arrivée : / Nom station) */}
            <View style={styles.detailsColFlex}>
              <Text style={[styles.arrivalPrefixText, { color: theme.text }]}>
                Arrivée :
              </Text>
              <Text style={[styles.arrivalStationNameText, { color: theme.text }]} numberOfLines={1}>
                {arrivalTitle}
              </Text>
              {!!arrivalDetail && (
                <Text
                  style={[styles.pointDetailText, { color: theme.textMuted }]}
                  numberOfLines={1}>
                  {arrivalDetail}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Collapsible>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 8,
    borderWidth: 2,
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
  expandedContent: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 0,
    marginTop: 8,
  },
  transferStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 0,
    paddingVertical: 2,
  },
  dotGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 2,
  },
  dotCircle: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  transferText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
    flex: 1,
  },
  stepItineraryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginVertical: 0,
  },
  timesColFlex: {
    minWidth: 42,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 2,
  },
  stepTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 14,
  },
  barColFlex: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modeIconCircleBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  continuousVerticalLine: {
    flex: 1,
    width: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    zIndex: 1,
    marginTop: 0,
  },
  lineIntermediateDotsBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    flex: 1,
  },
  whiteStopDotOnLine: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  whiteInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  detailsColFlex: {
    flex: 1,
    gap: 8,
  },
  stationTitle: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 14,
  },
  lineDetailCard: {
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  lineDetailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineDetailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 6,
  },
  stopsToggleButton: {
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  stopsSummaryText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 11,
    marginTop: 2,
  },
  intermediateStopsContainer: {
    gap: 8,
    marginVertical: 4,
  },
  intermediateStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
    position: 'relative',
  },
  stopDotOnLinePositioned: {
    position: 'absolute',
    left: -27,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    zIndex: 3,
  },
  intermediateStopText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
    flex: 1,
  },
  intermediateTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 11,
  },
  stepArrivalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  finalArrivalBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -6,
    paddingTop: 0,
  },
  // Même bloc que l'arrivée, mais en tête de timeline : rien à remonter puisqu'il
  // n'y a pas de pointillés au-dessus.
  departureBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: -6,
  },
  arrivalOrangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 3,
    borderRadius: 100,
    minHeight: 24,
    marginLeft: 0,
  },
  arrivalBadgeTimeText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 17,
    color: '#FFFFFF',
  },
  arrivalWhiteSolidDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  arrivalPrefixText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 15,
    marginBottom: -8,
  },
  arrivalStationNameText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    fontSize: 18,
    marginTop: 0,
  },
  // Point exact où l'itinéraire commence/dépose, sous le lieu demandé. Le
  // `marginTop` négatif compense le `gap` de la colonne, trop large ici.
  pointDetailText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 13,
    marginTop: -4,
  },
});
