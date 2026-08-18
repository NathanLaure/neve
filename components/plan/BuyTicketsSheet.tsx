import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Ticket,
  TramFront,
  Users,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, {
  BaseBottomSheetModalRef,
} from '@/components/BaseBottomSheetModal';
import { useScrollFade } from '@/components/ScrollFade';
import { TransitLeg, TransitOption } from '@/services/transitService';
import { BOOKING_PROVIDER_LABELS, BookingProvider, splitBookableLegs } from '@/services/bookingService';
import { Passenger } from '@/types/passenger';
import { TransportLineBadge } from './TransportLineBadge';

export interface BuyTicketsSheetProps {
  outwardJourney: TransitOption | null;
  returnJourney: TransitOption | null;
  passengers?: Passenger[];
  passengersCount?: string;
  /** Dates pleines, « 20 mars 2027 ». */
  outwardDateLabel: string;
  returnDateLabel: string | null;
  onOpenProvider: (provider: BookingProvider) => void;
  onDone: (allHaveNavigo?: boolean) => void;
}

import { IdfmLogo, SncfConnectLogo, TrainlineLogo } from '@/components/icons/ProviderLogos';

function LegRow({ leg }: { leg: TransitLeg }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.legRow}>
      <TramFront size={20} color={theme.text} />
      <TransportLineBadge
        mode={leg.mode}
        lineName={leg.lineName}
        lineColor={leg.lineColor}
        size={20}
        hideModeIcon
      />
      <Text style={[styles.legText, { color: theme.textMuted }]} numberOfLines={2}>
        {leg.fromName} → {leg.toName}
      </Text>
      {!!leg.departureTime && (
        <Text style={[styles.legTime, { color: theme.text }]}>{leg.departureTime}</Text>
      )}
    </View>
  );
}

function ProviderRow({
  provider,
  onPress,
}: {
  provider: BookingProvider;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const itemStyle = [
    styles.provider,
    {
      borderRadius: 8,
      overflow: 'hidden' as const,
      backgroundColor: theme.background,
    },
  ];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={itemStyle}>
      {provider === 'idfm' && <IdfmLogo size={32} />}
      {provider === 'trainline' && <TrainlineLogo size={32} />}
      {provider === 'sncf' && <SncfConnectLogo size={32} />}

      <Text style={[styles.providerLabel, { color: theme.text }]} numberOfLines={1}>
        {BOOKING_PROVIDER_LABELS[provider]}
      </Text>
      <ExternalLink size={20} color={theme.text} />
    </Pressable>
  );
}

/**
 * Où acheter les titres du voyage planifié (Figma 349:13777).
 */
export const BuyTicketsSheet = forwardRef<BaseBottomSheetModalRef, BuyTicketsSheetProps>(
  (
    {
      outwardJourney,
      returnJourney,
      passengers = [],
      passengersCount = '1 pers.',
      outwardDateLabel,
      returnDateLabel,
      onOpenProvider,
      onDone,
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { hasMore, scrollProps } = useScrollFade();

    const outwardLegs = splitBookableLegs(outwardJourney);
    const returnLegs = splitBookableLegs(returnJourney);

    const networkLegs = [...outwardLegs.network, ...returnLegs.network];
    const networkFrom = networkLegs[0]?.fromName;
    const networkTo = networkLegs[networkLegs.length - 1]?.toName;

    /* Détermine les randonneurs avec/sans Navigo. Seul cet abonnement dispense
       d'un titre sur le réseau francilien ; les cartes SNCF, qui réduisent sans
       couvrir, restent sans effet ici et un randonneur peut cumuler les deux. */
    const navigoHikers = passengers.filter((p) => p.passes.includes('navigo'));
    const hasNavigoHikers = navigoHikers.length > 0;
    const allNavigo =
      passengers.length > 0 && passengers.every((p) => p.passes.includes('navigo'));
    const nonNavigoHikers = passengers.filter((p) => !p.passes.includes('navigo'));
    const nonNavigoCount =
      nonNavigoHikers.length > 0
        ? nonNavigoHikers.length
        : allNavigo
        ? 0
        : passengers.length || 1;

    // Analyse précise des modes (Rail vs Bus/Tram surface)
    const hasOutwardRail =
      outwardJourney?.legs.some((l) => ['metro', 'rer', 'train'].includes(l.mode)) ?? false;
    const hasReturnRail =
      returnJourney?.legs.some((l) => ['metro', 'rer', 'train'].includes(l.mode)) ?? false;
    const railTicketsPerPerson = (hasOutwardRail ? 1 : 0) + (hasReturnRail ? 1 : 0);
    const totalRailTickets = railTicketsPerPerson * nonNavigoCount;

    const hasOutwardSurface =
      outwardJourney?.legs.some((l) => ['bus', 'tram'].includes(l.mode)) ?? false;
    const hasReturnSurface =
      returnJourney?.legs.some((l) => ['bus', 'tram'].includes(l.mode)) ?? false;
    const surfaceTicketsPerPerson = (hasOutwardSurface ? 1 : 0) + (hasReturnSurface ? 1 : 0);
    const totalSurfaceTickets = surfaceTicketsPerPerson * nonNavigoCount;
    const totalRailPrice = totalRailTickets * 2.55;
    const totalSurfacePrice = totalSurfaceTickets * 2.05;
    const totalEstimatedPrice = totalRailPrice + totalSurfacePrice;

    // Trains grandes lignes (TGV/TER) nécessitant un billet nominatif
    const hasMainLines = outwardLegs.mainLine.length > 0 || returnLegs.mainLine.length > 0;
    const isFullNavigo = !hasMainLines && (networkLegs.length > 0 || outwardJourney !== null);

    const sections: {
      key: string;
      title: string;
      date?: string;
      priceEstimate?: number;
      legs: TransitLeg[];
    }[] = [];
    if (outwardLegs.mainLine.length > 0) {
      sections.push({
        key: 'outward',
        title: "Billets pour l'ALLER",
        date: outwardDateLabel,
        priceEstimate: outwardJourney?.priceEstimate,
        legs: outwardLegs.mainLine,
      });
    }
    if (returnLegs.mainLine.length > 0) {
      sections.push({
        key: 'return',
        title: 'Billets pour le RETOUR',
        date: returnDateLabel ?? undefined,
        priceEstimate: returnJourney?.priceEstimate,
        legs: returnLegs.mainLine,
      });
    }

    const handleConfirm = () => {
      onDone(allNavigo);
    };

    return (
      <BaseBottomSheetModal
        ref={ref}
        title={hasMainLines ? 'Acheter des billets' : 'Titres de transport'}
        snapPoints={['88%']}
        stackBehavior="push"
        scrollableBody
        footerShadow={hasMore}
        primaryButtonTitle={allNavigo ? "C'est tout bon !" : 'Fermer'}
        onPrimaryPress={handleConfirm}>
        <BottomSheetScrollView
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          {...scrollProps}>
          {/* Bannière Pass Navigo : affichée uniquement si les passagers ont un Pass Navigo */}
          {hasNavigoHikers && isFullNavigo && (
            <View
              style={[
                styles.navigoBanner,
                {
                  backgroundColor: theme.blueBadge,
                  borderColor: theme.secondary,
                },
              ]}>
              <View style={styles.navigoHeader}>
                <CheckCircle2 size={22} color={theme.secondary} />
                <Text style={[styles.navigoTitle, { color: theme.text }]}>
                  {allNavigo
                    ? 'Inclus avec le Pass Navigo'
                    : `Inclus pour ${navigoHikers.length} passager${navigoHikers.length > 1 ? 's' : ''} (Pass Navigo)`}
                </Text>
              </View>
              <Text style={[styles.navigoBody, { color: theme.textMuted }]}>
                {allNavigo
                  ? 'Tous les trajets de cette aventure sont 100% inclus dans les forfaits Navigo des randonneurs (0,00 €). Aucun ticket à acheter !'
                  : `Les trajets sont inclus (0,00 €) pour ${navigoHikers.length} randonneur${navigoHikers.length > 1 ? 's' : ''} avec Pass Navigo. Les ${nonNavigoCount} autre${nonNavigoCount > 1 ? 's' : ''} doiv${nonNavigoCount > 1 ? 'ent' : 't'} acheter les tickets ci-dessous.`}
              </Text>
            </View>
          )}

          {/* Récapitulatif ultra clair des tickets à acheter & prix pour les voyageurs sans Pass */}
          {!allNavigo && networkLegs.length > 0 && (
            <View
              style={[
                styles.ticketCountCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={styles.ticketCountHeader}>
                <Ticket size={20} color={theme.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ticketCountTitle, { color: theme.text }]}>
                    Titres de transport à acheter
                  </Text>
                  <Text style={[styles.ticketCountSub, { color: theme.textMuted }]}>
                    Pour {nonNavigoCount} voyageur{nonNavigoCount > 1 ? 's' : ''} sans pass Navigo
                  </Text>
                </View>
                {totalEstimatedPrice > 0 && (
                  <View style={[styles.totalPriceBadge, { backgroundColor: theme.tint }]}>
                    <Text style={[styles.totalPriceText, { color: theme.buttonTextOnBrand }]}>
                      Total : {totalEstimatedPrice.toFixed(2).replace('.', ',')} €
                    </Text>
                  </View>
                )}
              </View>

              {totalRailTickets > 0 && (
                <View
                  style={[
                    styles.ticketBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <View style={styles.ticketBoxTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ticketBoxTitle, { color: theme.text }]}>
                        Ticket Métro • Train • RER
                      </Text>
                      <Text style={[styles.ticketBoxDetail, { color: theme.textMuted }]}>
                        {nonNavigoCount > 1
                          ? `${railTicketsPerPerson} ticket${railTicketsPerPerson > 1 ? 's' : ''} / pers. (Aller + Retour)`
                          : hasOutwardRail && hasReturnRail
                          ? '1 ticket Aller + 1 ticket Retour'
                          : '1 ticket'}{' '}
                        • 2,55 € / u.
                      </Text>
                    </View>
                    <View style={styles.ticketBoxCount}>
                      <Text style={[styles.ticketBoxCountNumber, { color: theme.tint }]}>
                        {totalRailTickets}
                      </Text>
                      <Text style={[styles.ticketBoxCountUnit, { color: theme.textMuted }]}>
                        ticket{totalRailTickets > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ticketBoxHint, { color: theme.textMuted }]}>
                    ✓ Valable sur tout le trajet (correspondances Métro, RER et trains Transilien incluses).
                  </Text>
                </View>
              )}

              {totalSurfaceTickets > 0 && (
                <View
                  style={[
                    styles.ticketBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <View style={styles.ticketBoxTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ticketBoxTitle, { color: theme.text }]}>
                        Ticket Bus • Tramway
                      </Text>
                      <Text style={[styles.ticketBoxDetail, { color: theme.textMuted }]}>
                        {nonNavigoCount > 1
                          ? `${surfaceTicketsPerPerson} ticket${surfaceTicketsPerPerson > 1 ? 's' : ''} / pers.`
                          : '1 ticket'}{' '}
                        • 2,05 € / u.
                      </Text>
                    </View>
                    <View style={styles.ticketBoxCount}>
                      <Text style={[styles.ticketBoxCountNumber, { color: theme.secondary }]}>
                        {totalSurfaceTickets}
                      </Text>
                      <Text style={[styles.ticketBoxCountUnit, { color: theme.textMuted }]}>
                        ticket{totalSurfaceTickets > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ticketBoxHint, { color: theme.textMuted }]}>
                    ✓ Valable 1h30 sur les lignes de bus et tramways.
                  </Text>
                </View>
              )}

              {/* Règle importante de validité */}
              <View style={[styles.warningBox, { backgroundColor: theme.background }]}>
                <Info size={16} color={theme.tint} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.warningTitle, { color: theme.text }]}>
                    Bon à savoir pour votre voyage :
                  </Text>
                  <Text style={[styles.warningText, { color: theme.textMuted }]}>
                    • Les tickets Métro/Train et Bus/Tramway sont distincts et ne sont pas interchangeables.{'\n'}
                    • Ne validez vos tickets qu'au moment d'entrer dans la gare ou de monter à bord (durée de validité limitée à 1h30 après validation).
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Si besoin de tickets pour des personnes sans Pass Navigo (IDFM) */}
          {networkLegs.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {isFullNavigo
                  ? 'Pour les randonneurs sans Pass Navigo'
                  : 'Titres réseau Île-de-France'}
              </Text>
              <View style={styles.networkRow}>
                {networkLegs.map((leg, index) => (
                  <TransportLineBadge
                    key={`${leg.lineName ?? leg.mode}-${index}`}
                    mode={leg.mode}
                    lineName={leg.lineName}
                    lineColor={leg.lineColor}
                    size={20}
                  />
                ))}
                {networkFrom && (
                  <Text style={[styles.networkLabel, { color: theme.text }]} numberOfLines={2}>
                    {networkFrom}
                  </Text>
                )}
                {networkFrom && networkTo && (
                  <ArrowLeftRight size={14} color={theme.textMuted} />
                )}
                {networkTo && (
                  <Text style={[styles.networkLabel, { color: theme.text }]} numberOfLines={2}>
                    {networkTo}
                  </Text>
                )}
              </View>
              <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                Acheter ou recharger un titre sur smartphone ou passe Navigo Easy :
              </Text>
              <ProviderRow provider="idfm" onPress={() => onOpenProvider('idfm')} />
            </View>
          )}

          {/* Cas 2 : Sections Trains Grandes Lignes (TGV / TER nécessitant un achat ferme) */}
          {sections.map((section, index) => (
            <View key={section.key} style={styles.section}>
              {(index > 0 || isFullNavigo || networkLegs.length > 0) && (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title}
                  {section.date ? (
                    <Text style={[styles.sectionDate, { color: theme.textMuted }]}>
                      {' '}
                      ({section.date})
                    </Text>
                  ) : null}
                </Text>
                {typeof section.priceEstimate === 'number' && section.priceEstimate > 0 ? (
                  <View style={[styles.priceBadge, { backgroundColor: theme.background }]}>
                    <Text style={[styles.priceBadgeText, { color: theme.text }]}>
                      dès {section.priceEstimate.toFixed(0)} €
                    </Text>
                  </View>
                ) : null}
              </View>
              {section.legs.map((leg, legIndex) => (
                <LegRow key={`${section.key}-${legIndex}`} leg={leg} />
              ))}
              <ProviderRow provider="trainline" onPress={() => onOpenProvider('trainline')} />
              <ProviderRow provider="sncf" onPress={() => onOpenProvider('sncf')} />
            </View>
          ))}
        </BottomSheetScrollView>
      </BaseBottomSheetModal>
    );
  }
);

BuyTicketsSheet.displayName = 'BuyTicketsSheet';

export default BuyTicketsSheet;

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  divider: {
    height: 1,
    borderRadius: 100,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceBadgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  sectionDate: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  sectionHint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    minWidth: 0,
  },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legText: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  legTime: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  navigoBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  navigoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navigoTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  navigoBody: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 19,
  },
  navigoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  navigoPillText: {
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  ticketCountCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  ticketCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ticketCountTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  ticketCountSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    marginTop: 2,
  },
  totalPriceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  totalPriceText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  ticketBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  ticketBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ticketBoxTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  ticketBoxDetail: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    marginTop: 2,
  },
  ticketBoxCount: {
    alignItems: 'center',
    minWidth: 50,
  },
  ticketBoxCountNumber: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 22,
    lineHeight: 26,
  },
  ticketBoxCountUnit: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  ticketBoxHint: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginTop: 2,
  },
  warningTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  warningText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 8,
  },
  providerMark: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 22,
  },
});
