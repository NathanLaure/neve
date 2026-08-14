import React, { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import {
  CircleDot,
  MapPin,
  Footprints,
  ArrowUpDown,
  EllipsisVertical,
  X,
} from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { IconButton } from '@/components/IconButton';

/**
 * Durée d'une demi-inversion. L'animation se joue en deux temps — aller jusqu'au
 * croisement, bascule des données, puis retour — voir handleSwap.
 */
const SWAP_HALF = 160;

/** Durée de la rotation du bouton, décorative et indépendante des deux temps. */
const SWAP_SPIN = 420;

export interface DeparturePoint {
  name: string;
  latitude: number;
  longitude: number;
}

export interface StationPoint {
  name: string;
  coords?: { latitude: number; longitude: number };
}

export interface ItineraryCardProps {
  isTraverse: boolean;
  departurePoint: DeparturePoint;
  returnPoint?: DeparturePoint | null;
  arrivalStation: StationPoint;
  departBackStation: StationPoint;
  onPressDeparture: () => void;
  onPressReturnPoint?: () => void;
  onClearReturnPoint?: () => void;
  onPressOptions: () => void;
  onSwapStations: () => void;
}

/**
 * Ligne pointillée composée de véritables puces rondes distinctes.
 * Garantit de ne JAMAIS avoir de demi-point coupé en bout de ligne.
 */
const FlexDottedLine: React.FC<{ color: string; dotSize?: number; spacingStep?: number; style?: any }> = ({
  color,
  dotSize = 2,
  spacingStep = 8,
  style,
}) => {
  const [layoutHeight, setLayoutHeight] = useState<number>(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0 && height !== layoutHeight) {
      setLayoutHeight(height);
    }
  };

  const dotsCount = layoutHeight > 0 ? Math.max(2, Math.floor(layoutHeight / spacingStep)) : 3;

  return (
    <View
      style={[styles.flexDottedLineWrapper, style]}
      onLayout={handleLayout}
      pointerEvents="none">
      <View style={styles.dotsContainer}>
        {Array.from({ length: dotsCount }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.singleDot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Carte d'itinéraire unifiée avec Timeline en Flexbox chevauchant le fond des encarts.
 * Conforme aux 4 variantes Figma (Nodes 591:17596, 591:17440, 588:17244 & 598:17819).
 */
export const ItineraryCard: React.FC<ItineraryCardProps> = ({
  isTraverse,
  departurePoint,
  returnPoint,
  arrivalStation,
  departBackStation,
  onPressDeparture,
  onPressReturnPoint,
  onClearReturnPoint,
  onPressOptions,
  onSwapStations,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const hasReturnPoint = !!returnPoint;
  const lineColor = theme.borderStrong || '#525252';

  const DOT_SPACING = 6;
  const DOT_SIZE = 3;

  /* --- Inversion animée des deux gares ----------------------------------
   *
   * `react-hooks/immutability` gèle les valeurs partagées dès qu'un hook les
   * capture, et interdit alors de les écrire ailleurs. Faux positif : une shared
   * value Reanimated vit hors du modèle de données React, sa mutation depuis un
   * gestionnaire d'évènement est le mode d'emploi normal de la bibliothèque.
   */
  /* eslint-disable react-hooks/immutability */

  // Décalage vertical courant du nom du haut (celui du bas prend l'opposé).
  // Il va de 0 à la moitié du chemin, puis revient à 0 — voir handleSwap.
  const swapSlide = useSharedValue(0);
  const swapFade = useSharedValue(1);
  const swapRotation = useSharedValue(0);
  // Écart vertical entre les deux blocs. Mesuré plutôt que codé en dur : il
  // dépend de la taille de police système, qui peut doubler en accessibilité.
  const startTop = useSharedValue(-1);
  const endTop = useSharedValue(-1);
  const swapDistance = useDerivedValue(() =>
    startTop.value < 0 || endTop.value < 0 ? 0 : endTop.value - startTop.value
  );
  const isSwapping = useRef(false);

  const handleStartLayout = (event: LayoutChangeEvent) => {
    startTop.value = event.nativeEvent.layout.y;
  };

  const handleEndLayout = (event: LayoutChangeEvent) => {
    endTop.value = event.nativeEvent.layout.y;
  };

  const [swapCommit, setSwapCommit] = useState(0);

  /**
   * Fin de l'aller. `setSwapCommit` est batché avec le `setState` du parent, donc
   * l'effet ci-dessous ne se déclenchera qu'une fois les nouveaux noms rendus —
   * on attend le vrai signal plutôt qu'une durée devinée, qui serait tantôt trop
   * courte (build debug, thread JS chargé) tantôt inutilement longue.
   */
  const requestCommit = (finished: boolean) => {
    if (!finished) {
      // Animation interrompue : on rembobine sans rien inverser.
      isSwapping.current = false;
      swapSlide.value = withTiming(0, { duration: SWAP_HALF });
      swapFade.value = withTiming(1, { duration: SWAP_HALF });
      return;
    }
    onSwapStations();
    setSwapCommit((count) => count + 1);
  };

  const endSwap = () => {
    isSwapping.current = false;
  };

  /**
   * Retour : les noms terminent leur trajectoire et réapparaissent, une fois les
   * nouvelles props effectivement commitées.
   *
   * `swapSlide` n'est jamais remis à zéro d'un coup : arrivé à mi-chemin, il est
   * déjà la bonne position de départ pour le nom qui vient d'atterrir dans cette
   * ligne. La seconde moitié n'est donc que la suite du même mouvement — il n'y a
   * aucun saut à masquer, seulement la propagation React, que le fondu couvre.
   */
  useLayoutEffect(() => {
    if (swapCommit === 0) return;
    swapFade.value = withTiming(1, { duration: SWAP_HALF, easing: Easing.out(Easing.quad) });
    swapSlide.value = withTiming(
      0,
      { duration: SWAP_HALF, easing: Easing.out(Easing.cubic) },
      () => {
        runOnJS(endSwap)();
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stables
  }, [swapCommit]);

  /**
   * Aller : les deux noms parcourent la MOITIÉ du chemin en s'effaçant. Ils
   * finissent superposés, à opacité nulle, au point exact où ils se croisent —
   * c'est là que les données basculent, donc au moment où il n'y a rien à voir.
   */
  const handleSwap = () => {
    if (isSwapping.current) return;
    // Pas encore mesuré (premier rendu) : on inverse sans animer plutôt que de
    // faire un croisement sur place.
    if (swapDistance.value === 0) {
      onSwapStations();
      return;
    }

    isSwapping.current = true;

    swapRotation.value = withTiming(swapRotation.value + 180, {
      duration: SWAP_SPIN,
      easing: Easing.inOut(Easing.cubic),
    });

    swapFade.value = withTiming(0, { duration: SWAP_HALF, easing: Easing.in(Easing.quad) });
    swapSlide.value = withTiming(
      swapDistance.value / 2,
      { duration: SWAP_HALF, easing: Easing.in(Easing.cubic) },
      (finished) => {
        runOnJS(requestCommit)(!!finished);
      }
    );
  };
  /* eslint-enable react-hooks/immutability */

  // Seuls les noms de gares voyagent : « Début du sentier » / « Fin du sentier »
  // qualifient la ligne, pas la gare, et doivent rester en place.
  const startNameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swapSlide.value }],
    opacity: swapFade.value,
  }));

  const endNameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -swapSlide.value }],
    opacity: swapFade.value,
  }));

  // Le trait s'efface avec les noms, qui le traversent au moment du croisement.
  const dividerStyle = useAnimatedStyle(() => ({
    opacity: swapFade.value,
  }));

  const swapIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swapRotation.value}deg` }],
  }));

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {/* COLONNE GAUCHE : TIMELINE LATÉRALE PURE FIGMA */}
      <View
        style={[
          styles.leftTimelineCol,
          !isTraverse && !hasReturnPoint && styles.leftTimelineColNoReturn,
        ]}>
        {/* 1. Icône Départ */}
        <CircleDot size={16} color={theme.statusBgSuccess || '#34C759'} />

        {!isTraverse ? (
          /* Mode Boucle / Aller-Retour */
          <>
            <FlexDottedLine color={lineColor} dotSize={DOT_SIZE} spacingStep={DOT_SPACING} />
            <Footprints size={16} color={theme.text} />
          </>
        ) : (
          /* Mode Traversée / Point à point (Structure Figma 598:17820) */
          <>
            {/* Segment 1 (58px) : Cale le Badge A au niveau de la ligne du texte Gare A */}
            <View style={styles.dottedSegmentFixed58}>
              <FlexDottedLine color={lineColor} dotSize={DOT_SIZE} spacingStep={DOT_SPACING} />
            </View>

            {/* Badge A */}
            <View style={[styles.stationBadge, { backgroundColor: '#FF2D55' }]}>
              <Text style={styles.stationBadgeText}>A</Text>
            </View>

            {/* Segment 2 (35px) : Cale le Badge B au niveau de la ligne du texte Gare B */}
            <View style={styles.dottedSegmentFixed35}>
              <FlexDottedLine color={lineColor} dotSize={DOT_SIZE} spacingStep={DOT_SPACING} />
            </View>

            {/* Badge B */}
            <View style={[styles.stationBadge, { backgroundColor: '#34C759' }]}>
              <Text style={styles.stationBadgeText}>B</Text>
            </View>
          </>
        )}

        {/* Ligne pointillée vers le Retour + MapPin (si lieu de retour présent) */}
        {hasReturnPoint && (
          <>
            <FlexDottedLine color={lineColor} dotSize={DOT_SIZE} spacingStep={DOT_SPACING} />
            <MapPin size={16} color="#EB490B" />
          </>
        )}
      </View>

      {/* COLONNE DROITE : CONTENU ITINÉRAIRE */}
      <View style={[styles.rightContentCol, { gap: isTraverse ? 0 : 8 }]}>
        {/* 1. ÉTAPE DÉPART */}
        <View style={[styles.journeyInset, { backgroundColor: theme.background }]}>
          <Pressable
            accessibilityLabel="Changer le point de départ"
            hitSlop={{ top: 10, bottom: 10 }}
            onPress={onPressDeparture}
            android_ripple={{
              color: theme.ripple,
              borderless: false,
              foreground: true,
            }}
            style={[
              styles.journeyLabelPress,
              { borderRadius: 8, overflow: 'hidden' as const },
            ]}>
            <Text style={styles.journeyPointText} numberOfLines={1} ellipsizeMode="tail">
              <Text style={{ color: theme.textMuted }}>Départ : </Text>
              <Text style={{ color: theme.text }}>
                {departurePoint.name?.trim() || 'Votre position'}
              </Text>
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Plus d’options d’itinéraire"
            hitSlop={8}
            onPress={onPressOptions}
            android_ripple={{
              color: theme.ripple,
              borderless: true,
            }}
            style={styles.journeyInlineButton}>
            <EllipsisVertical size={16} color={theme.text} />
          </Pressable>
        </View>

        {/* 2. ÉTAPE SENTIER(S) */}
        {!isTraverse ? (
          /* Boucle / Aller-Retour (Designs 1: 591:17596 & 2: 591:17440) */
          <View style={styles.loopSentierContent}>
            <Text style={styles.journeyText} numberOfLines={1} ellipsizeMode="tail">
              <Text style={{ color: theme.textMuted }}>Accès : </Text>
              <Text style={{ color: theme.text }}>{arrivalStation.name}</Text>
            </Text>
          </View>
        ) : (
          /* Traversée / Point à Point (Designs 3: 588:17244 & 4: 598:17819) */
          <View style={[styles.journeyInset, styles.pointToPointBox]}>
            <View style={styles.pointToPointContent}>
              {/* Début du sentier */}
              <View onLayout={handleStartLayout} style={styles.pointToPointBlock}>
                <Text style={[styles.pointToPointLabel, { color: theme.textMuted }]}>
                  Début du sentier
                </Text>
                <Animated.Text
                  style={[styles.journeyText, { color: theme.text }, startNameStyle]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {arrivalStation?.name?.trim() || 'Gare d’arrivée'}
                </Animated.Text>
              </View>

              <Animated.View
                style={[
                  styles.pointToPointDivider,
                  { backgroundColor: theme.borderStrong },
                  dividerStyle,
                ]}
              />

              {/* Fin du sentier */}
              <View onLayout={handleEndLayout} style={styles.pointToPointBlock}>
                <Text style={[styles.pointToPointLabel, { color: theme.textMuted }]}>
                  Fin du sentier
                </Text>
                <Animated.Text
                  style={[styles.journeyText, { color: theme.text }, endNameStyle]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {departBackStation?.name?.trim() || 'Gare de retour'}
                </Animated.Text>
              </View>
            </View>

            {/* Bouton d'inversion des gares A/B */}
            <IconButton
              variant="circle"
              accessibilityLabel="Inverser le début et la fin du sentier"
              icon={
                <Animated.View style={swapIconStyle}>
                  <ArrowUpDown size={16} color={theme.text} />
                </Animated.View>
              }
              style={[styles.swapButtonCircle, { backgroundColor: theme.background }]}
              onPress={handleSwap}
            />
          </View>
        )}

        {/* 3. ÉTAPE RETOUR (Si lieu de retour personnalisé) */}
        {hasReturnPoint && (
          <View style={[styles.journeyInset, { backgroundColor: theme.background }]}>
            <Pressable
              accessibilityLabel="Changer le lieu de retour"
              hitSlop={{ top: 10, bottom: 10 }}
              onPress={onPressReturnPoint}
              android_ripple={{
                color: theme.ripple,
                borderless: false,
                foreground: true,
              }}
              style={[
                styles.journeyLabelPress,
                { borderRadius: 8, overflow: 'hidden' as const },
              ]}>
              <Text style={styles.journeyPointText} numberOfLines={1} ellipsizeMode="tail">
                <Text style={{ color: theme.textMuted }}>Retour : </Text>
                <Text style={{ color: theme.text }}>{returnPoint.name}</Text>
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Revenir au point de départ"
              hitSlop={8}
              onPress={onClearReturnPoint}
              android_ripple={{
                color: theme.ripple,
                borderless: true,
              }}
              style={styles.journeyInlineButton}>
              <X size={16} color={theme.text} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  leftTimelineCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginRight: -40,
    zIndex: 2,
  },
  leftTimelineColNoReturn: {
    paddingBottom: 10, // 👈 Ajuste ce paddingBottom si besoin pour caler l'icône de pas en boucle simple !
  },
  dottedSegmentFixed34: {
    height: 26, // 50px - 8px gap
    width: 16,
    alignItems: 'center',
  },
  dottedSegmentFixed58: {
    height: 48, // 58px - 8px gap
    width: 16,
    alignItems: 'center',
  },
  dottedSegmentFixed35: {
    height: 35,
    width: 16,
    alignItems: 'center',
  },
  flexDottedLineWrapper: {
    flex: 1,
    width: 16,
    alignItems: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
  dotsContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singleDot: {
    flexShrink: 0,
  },
  rightContentCol: {
    flex: 1,
    gap: 0,
    zIndex: 1,
  },
  journeyInset: {
    width: '100%',
    paddingVertical: 12,
    paddingRight: 8,
    paddingLeft: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loopSentierContent: {
    width: '100%',
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 32,
    justifyContent: 'center',
  },
  journeyText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  journeyPointText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  journeyLabelPress: {
    flex: 1,
    justifyContent: 'center',
  },
  journeyInlineButton: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 100,
  },
  pointToPointBox: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointToPointContent: {
    flex: 1,
    gap: 4,
  },
  pointToPointBlock: {
    gap: 4,
    // Les noms passent au-dessus du séparateur pendant le croisement.
    zIndex: 1,
  },
  pointToPointLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 14,
  },
  pointToPointDivider: {
    height: 1,
    borderRadius: 100,
    marginVertical: 2,
  },
  stationBadge: {
    width: 16,
    height: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  swapButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 100,
    marginLeft: 'auto',
  },
});
