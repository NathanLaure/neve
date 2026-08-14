import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity } from 'react-native';
import { Footprints } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Disruption, TransitLeg, TransitOption } from '@/services/transitService';
import AnimatedChevron from '@/components/AnimatedChevron';
import { TransportLineBadge } from './TransportLineBadge';
import LegDisruptions from './LegDisruptions';

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

/**
 * Horaires de chaque tronçon, cumulés depuis le départ quand Navitia ne les
 * fournit pas. Calculé hors du rendu : l'accumulateur se réécrit d'un tronçon au
 * suivant, ce qu'une boucle posée dans le JSX ferait passer pour une mutation
 * d'état entre deux rendus.
 */
function computeLegTimes(
  option: TransitOption,
  legs: TransitLeg[],
  offsetMinutes: number
): { departure: string; arrival: string }[] {
  let cumulative = offsetMinutes;
  return legs.map((leg) => {
    const departure = leg.departureTime || addMinutesToTime(option.departureTime, cumulative);
    cumulative += leg.durationMinutes || 0;
    const arrival = leg.arrivalTime || addMinutesToTime(option.departureTime, cumulative);
    return { departure, arrival };
  });
}

/**
 * Perturbations qui touchent ce tronçon.
 *
 * L'appariement se fait sur le nom de ligne, seul identifiant commun aux deux
 * côtés — IDFM ne renvoie pas d'identifiant de ligne dans ses perturbations. Le
 * mode départage les homonymes : la ligne « 1 » existe en métro comme en tram.
 * Une marche ne peut rien avoir de perturbé.
 */
function disruptionsForLeg(leg: TransitLeg, disruptions: Disruption[]): Disruption[] {
  if (leg.mode === 'walk' || !leg.lineName) return [];
  return disruptions.filter(
    (item) => item.lineName === leg.lineName && (!item.mode || item.mode === leg.mode)
  );
}

export interface JourneyTimelineProps {
  option: TransitOption;
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
}

/**
 * Détail pas-à-pas d'un itinéraire (Figma 336:8313 & 629:21428) : bloc de
 * départ, étapes en transport avec leurs arrêts dépliables, correspondances à
 * pied, bloc d'arrivée. Rendu dans `JourneyDetailSheet`.
 */
export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  option,
  departureName,
  destinationName,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [expandedLegStops, setExpandedLegStops] = useState<Record<number, boolean>>({});
  const disruptions = option.disruptions ?? [];

  const toggleLegStops = (idx: number) => {
    setExpandedLegStops((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Marche d'accès depuis une adresse ou une position GPS : elle a son propre
  // bloc « Départ » en tête de timeline, et sort donc de la boucle des étapes
  // (sinon elle s'y afficherait comme une correspondance, sans point de départ).
  const accessWalk =
    option.legs[0]?.mode === 'walk' && option.legs[0]?.walkType === 'access'
      ? option.legs[0]
      : undefined;
  const timelineLegs = accessWalk ? option.legs.slice(1) : option.legs;
  // La marche d'accès est déjà décomptée par le bloc de départ.
  const legTimes = computeLegTimes(option, timelineLegs, accessWalk?.durationMinutes ?? 0);

  // Les blocs Départ/Arrivée annoncent le lieu demandé, et le point géocodé par
  // Navitia seulement en second : « Gare de Fontainebleau-Avon » dit où l'on va,
  // « Route Baudrillard » dit seulement où l'itinéraire dépose.
  const departureTitle = departureName || accessWalk?.fromName || 'Votre position';

  const arrivalPlace = timelineLegs[timelineLegs.length - 1]?.toName;
  const arrivalTitle = destinationName || arrivalPlace || 'Destination';

  return (
    <View style={styles.timelineContent}>
      {/* 0. Étape de départ, quand le trajet commence par rejoindre le réseau
            à pied depuis une adresse ou la position de l'utilisateur */}
      {accessWalk && (
        <>
          <View style={styles.departureBlockRow}>
            <View
              style={[styles.arrivalOrangeBadge, { backgroundColor: theme.primary || '#EB490B' }]}>
              <Text style={styles.arrivalBadgeTimeText}>{option.departureTime}</Text>
              <View style={styles.arrivalWhiteSolidDot} />
            </View>

            <View style={styles.detailsColFlex}>
              <Text style={[styles.arrivalPrefixText, { color: theme.text }]}>Départ :</Text>
              <Text
                style={[styles.arrivalStationNameText, { color: theme.text }]}
                numberOfLines={1}>
                {departureTitle}
              </Text>
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
        return timelineLegs.map((leg, idx) => {
          const isWalk = leg.mode === 'walk';
          const bgBadge =
            leg.lineColor ||
            (leg.mode === 'bus' ? '#760C6B' : leg.mode === 'rer' ? '#E3051C' : '#6E6E9D');
          const isStopsExpanded = !!expandedLegStops[idx];

          const { departure: departureTimeStr, arrival: arrivalTimeStr } = legTimes[idx];

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
            '13': [
              'Liège',
              'Place de Clichy',
              'La Fourche',
              'Guy Môquet',
              'Porte de Saint-Ouen',
            ],
            '1': [
              'Concorde',
              'Tuileries',
              'Palais Royal - Louvre',
              'Louvre - Rivoli',
              'Châtelet',
            ],
            '4': ['St-Germain-des-Prés', 'Odéon', 'Saint-Michel', 'Cité', 'Châtelet'],
          };

          const fallbackStops = defaultStopsMap[leg.lineName || ''] || [
            `${leg.fromName} (+1)`,
            `${leg.fromName} (+2)`,
            `${leg.fromName} (+3)`,
          ];

          const intermediateStops =
            leg.intermediateStops && leg.intermediateStops.length > 0
              ? leg.intermediateStops
              : fallbackStops;
          const stopsCount = leg.intermediateStopsCount || intermediateStops.length;
          const legDisruptions = disruptionsForLeg(leg, disruptions);

          return (
            <React.Fragment key={idx}>
              <View style={styles.stepItineraryRow}>
                {/* 1. Colonne des Heures (Gauche) */}
                <View style={styles.timesColFlex}>
                  <Text style={[styles.stepTimeText, { color: theme.text }]}>
                    {departureTimeStr}
                  </Text>
                  <Text style={[styles.stepTimeText, { color: theme.text }]}>
                    {arrivalTimeStr}
                  </Text>
                </View>

                {/* 2. Colonne Centrale (Badge Mode + Filet Vertical Continu + Dot Blanc) */}
                <View style={styles.barColFlex}>
                  <View style={styles.modeIconCircleBox}>
                    <TransportLineBadge mode={leg.mode} size={18} hideModeIcon={false} />
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
                  <Pressable
                    onPress={() => toggleLegStops(idx)}
                    android_ripple={{
                      color: theme.ripple,
                      borderless: false,
                      foreground: true,
                    }}
                    style={[
                      styles.lineDetailCard,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EFEFEF',
                        overflow: 'hidden' as const,
                      },
                    ]}>
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
                    <Text
                      style={[styles.directionText, { color: theme.textMuted }]}
                      numberOfLines={1}>
                      {directionStr}
                    </Text>
                  </Pressable>

                  <LegDisruptions disruptions={legDisruptions} />

                  {/* Synthèse ou Accordéon des arrêts */}
                  {stopsCount > 0 && (
                    <Pressable
                      onPress={() => toggleLegStops(idx)}
                      android_ripple={{
                        color: theme.ripple,
                        borderless: true,
                      }}
                      style={styles.stopsToggleButton}>
                      <Text style={[styles.stopsSummaryText, { color: theme.textMuted }]}>
                        {stopsCount} arrêt{stopsCount > 1 ? 's' : ''} (
                        {leg.durationMinutes || 10} min)
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
                            <Text
                              style={[styles.intermediateStopText, { color: theme.textMuted }]}>
                              {stopName}
                            </Text>
                            {stopTime && (
                              <Text
                                style={[styles.intermediateTimeText, { color: theme.textMuted }]}>
                                {stopTime}
                              </Text>
                            )}
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
              {idx < timelineLegs.length - 1 &&
                leg.mode !== 'walk' &&
                timelineLegs[idx + 1].mode !== 'walk' && (
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
          <Text style={styles.arrivalBadgeTimeText}>{option.arrivalTime}</Text>
          <View style={styles.arrivalWhiteSolidDot} />
        </View>

        {/* Texte d'arrivée en 2 lignes (Arrivée : / Nom station) */}
        <View style={styles.detailsColFlex}>
          <Text style={[styles.arrivalPrefixText, { color: theme.text }]}>Arrivée :</Text>
          <Text style={[styles.arrivalStationNameText, { color: theme.text }]} numberOfLines={1}>
            {arrivalTitle}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default JourneyTimeline;

const styles = StyleSheet.create({
  timelineContent: {
    paddingTop: 8,
    gap: 0,
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
    overflow: 'hidden',
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
  directionText: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 6,
  },
  /* Marge portée par la liste et non par le `Collapsible` : celui-ci anime sa
     hauteur jusqu'à zéro, une marge sur lui laisserait un blanc une fois replié. */
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
});
