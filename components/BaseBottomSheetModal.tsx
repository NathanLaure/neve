import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { BackHandler, StyleSheet, Text, View, StyleProp, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';

export interface BaseBottomSheetModalRef {
  present: () => void;
  dismiss: () => void;
}

/** Inset bas effectif, avec repli sur les métriques initiales puis sur une valeur par plateforme. */
function useEffectiveBottomInset() {
  const insets = useSafeAreaInsets();
  const rawBottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;
  return rawBottom > 0 ? rawBottom : Platform.OS === 'android' ? 48 : 24;
}

/**
 * Marge basse à poser dans le `contentContainerStyle` de la zone défilante d'une
 * feuille `scrollableBody`.
 *
 * Contrairement aux écrans, une feuille est rendue dans un portail à la racine de
 * la fenêtre : elle passe donc réellement sous la barre système, et l'inset y est
 * nécessaire. La marge ne borne pas la zone défilante — les items continuent de
 * passer sous la barre pendant le défilement, ce qui reste le signal qu'il y a une
 * suite. Elle garantit seulement qu'en fin de course le dernier item se dégage.
 */
export function useSheetScrollBottomPadding() {
  return Math.max(useEffectiveBottomInset() + 16, 48);
}

export interface BaseBottomSheetModalProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  showHeader?: boolean;
  title?: string;
  subtitle?: ReactNode;
  /** Rendu à droite du titre, sur la même ligne (pastille, badge, valeur). */
  titleAccessory?: ReactNode;
  /** Remplace entièrement la zone titre, en gardant la croix standardisée. */
  headerContent?: ReactNode;
  /**
   * Range la croix sur la même ligne que `headerContent` au lieu de la poser
   * seule au-dessus. Pour un en-tête dont la première ligne est courte (séquence
   * d'icônes, badge) : elle y gagne la largeur laissée libre par la croix.
   */
  inlineCloseButton?: boolean;
  /** Trait de séparation sous l'en-tête, quand le corps défile en dessous. */
  headerDivider?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  enablePanDownToClose?: boolean;
  /**
   * Feuille bloquante : ni glissement vers le bas, ni appui sur le fond, ni
   * retour système ne la referment — seules ses propres actions le peuvent.
   * Pour les impasses où fermer laisserait l'utilisateur devant un écran qui
   * n'a rien à lui montrer.
   */
  blocking?: boolean;
  /** Actif par défaut : la hauteur s'adapte automatiquement au contenu */
  enableDynamicSizing?: boolean;
  backdropOpacity?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Composant optionnel personnalisé affiché en bas de feuille */
  footer?: ReactNode;
  /** Libellé du bouton principal du pied de page (ex: "Valider") */
  primaryButtonTitle?: string;
  /** Action du bouton principal */
  onPrimaryPress?: () => void;
  /** Variante du bouton principal ('primary' par défaut) */
  primaryButtonVariant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'transparent' | 'outlined';
  /** Désactivation du bouton principal */
  primaryButtonDisabled?: boolean;
  /** Libellé du bouton secondaire du pied de page (ex: "Tout effacer") */
  secondaryButtonTitle?: string;
  /** Action du bouton secondaire */
  onSecondaryPress?: () => void;
  /** Variante du bouton secondaire ('text' par défaut) */
  secondaryButtonVariant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'transparent' | 'outlined';
  /** Désactivation du bouton secondaire */
  secondaryButtonDisabled?: boolean;
  /**
   * Comportement quand la feuille s'ouvre au-dessus d'une autre.
   * `replace` (défaut gorhom) ferme la feuille parente ; `push` l'empile et la
   * restitue à la fermeture — indispensable pour une feuille imbriquée.
   */
  stackBehavior?: 'replace' | 'push' | 'switch';
  /**
   * Hauteur réservée en haut de l'écran. Les snapPoints en pourcentage s'y
   * rapportent : `['100%']` avec `topInset={insets.top}` ouvre donc la feuille
   * pleine hauteur, arrêtée juste sous la barre d'état.
   */
  topInset?: number;
  /**
   * À activer quand le corps est une liste défilante.
   *
   * La marge basse par défaut se place SOUS le contenu : elle arrête la liste
   * net avant le bord de l'écran, ce qui la fait lire comme terminée alors
   * qu'elle continue. Ici la zone défilante descend jusqu'au bord et le dernier
   * item se retrouve coupé — le signal qui donne envie de défiler.
   *
   * La contrepartie est à la charge de l'appelant : poser
   * `useSheetScrollBottomPadding()` en `paddingBottom` du `contentContainerStyle`
   * de sa zone défilante, pour que le dernier item se dégage de la barre système
   * une fois la liste défilée à fond. Inutile si la feuille a un pied de page :
   * celui-ci porte déjà sa propre marge et fait écran.
   */
  scrollableBody?: boolean;
  /**
   * Porte une ombre sur l'arête haute du pied de page, pour signaler que du
   * contenu passe dessous.
   *
   * À piloter par l'appelant, qui seul connaît l'état de sa zone défilante :
   * `useScrollFade()` en renvoie déjà le booléen (`hasMore`). Laissée à faux, une
   * fois la liste défilée à fond, l'ombre n'a plus rien à annoncer.
   */
  footerShadow?: boolean;
}

const BaseBottomSheetModalRender: React.ForwardRefRenderFunction<
  BaseBottomSheetModalRef,
  BaseBottomSheetModalProps
> = (
  {
    children,
    snapPoints,
    showHeader,
    title,
    subtitle,
    titleAccessory,
    headerContent,
    inlineCloseButton = false,
    headerDivider = false,
    showCloseButton = true,
    onClose,
    enablePanDownToClose = true,
    blocking = false,
    enableDynamicSizing = true, // 👈 Redimensionnement dynamique actif par défaut
    backdropOpacity = 0.35,
    contentContainerStyle,
    style,
    footer,
    primaryButtonTitle,
    onPrimaryPress,
    /* Une feuille valide ce qu'on vient d'y régler et se referme sur place :
       elle ne fait pas avancer un parcours, elle le confirme. L'orange est
       réservé à ce qui convertit — à repasser explicitement en `primary` sur la
       rare feuille dont le bouton emmène vers un autre écran. */
    primaryButtonVariant = 'secondary',
    primaryButtonDisabled = false,
    secondaryButtonTitle,
    onSecondaryPress,
    secondaryButtonVariant = 'transparent',
    secondaryButtonDisabled = false,
    stackBehavior = 'replace',
    topInset = 0,
    scrollableBody = false,
    footerShadow = false,
  },
  ref
) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const effectiveTopInset = topInset || insets.top || initialWindowMetrics?.insets.top || 0;
  const modalRef = useRef<BottomSheetModal>(null);
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  // Une feuille se dimensionne d'UNE seule façon : soit des snapPoints explicites,
  // soit la mesure de son contenu. gorhom donne la priorité au contenu dès que
  // `enableDynamicSizing` est actif — une hauteur demandée était donc ignorée, et
  // la feuille s'ouvrait à la taille de son contenu, minuscule tant qu'une liste
  // de résultats est vide. Des snapPoints explicites l'emportent désormais.
  const hasExplicitSnapPoints = !!snapPoints && snapPoints.length > 0;
  const isDynamicSizing = enableDynamicSizing && !hasExplicitSnapPoints;

  /*
   * Mémoïsé sur le CONTENU des snapPoints et non sur l'identité du tableau.
   * Les appelants les écrivent en littéral (`snapPoints={['65%']}`,
   * `snapPoints={[]}`), donc un nouveau tableau à chaque rendu du parent : la
   * mémoïsation ne tenait pas, gorhom recevait des snapPoints « neufs » et
   * recalculait sa position — la feuille se recalait sous les yeux.
   */
  const snapPointsKey = snapPoints ? snapPoints.join('|') : '';

  const memoizedSnapPoints = useMemo(() => {
    if (hasExplicitSnapPoints) return snapPoints as (string | number)[];
    // Tableau vide : c'est ainsi que gorhom sait qu'il doit mesurer le contenu.
    return isDynamicSizing ? [] : ['30%'];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `snapPointsKey` représente `snapPoints`
  }, [snapPointsKey, hasExplicitSnapPoints, isDynamicSizing]);

  const handleChange = useCallback((index: number) => {
    setIsOpen(index >= 0);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Gestion du retour système Android
  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // En mode bloquant, le geste est consommé sans refermer : le retour ne
      // doit pas être la porte de sortie que les autres voies interdisent.
      if (!blocking) modalRef.current?.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, blocking]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        pressBehavior={blocking ? 'none' : 'close'}
      />
    ),
    [backdropOpacity, blocking]
  );

  // L'en-tête s'affiche si `showHeader` est explicitement vrai, ou s'il n'est pas
  // explicitement faux et qu'au moins un élément de titre / contenu est fourni.
  const shouldShowHeader =
    showHeader !== undefined
      ? showHeader
      : !!(title || subtitle || titleAccessory || headerContent);

  /*
   * Croix et poignée font double emploi : là où la croix est rendue, la poignée
   * disparaît (`handleComponent={null}`).
   *
   * La condition inclut `shouldShowHeader` parce que la croix ne vit que dans
   * l'en-tête : une feuille sans en-tête doit garder sa poignée, sinon elle
   * n'aurait plus aucune affordance de fermeture.
   *
   * `handleComponent === null` est un cas prévu par gorhom, qui le passe alors en
   * `shouldOverrideHandleHeight` et initialise `handleHeight` à 0 au lieu de le
   * laisser à sa sentinelle. Le calcul de position du pied de page, qui soustrait
   * cette hauteur, reste donc valide. Et le glisser-pour-fermer subsiste via le
   * geste du contenu, actif par défaut.
   */
  const hasCloseButton = shouldShowHeader && showCloseButton;

  // La mise en ligne n'a de sens qu'avec un en-tête sur mesure : la variante
  // titre/sous-titre a déjà sa propre colonne.
  const isInlineHeader = inlineCloseButton && !!headerContent;

  const hasFooter = !!(footer || primaryButtonTitle || secondaryButtonTitle);

  const isZeroPaddingHoriz =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingHorizontal === 0;

  const isZeroPaddingBottom =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingBottom === 0;

  // 👈 MARGE BASSE GLOBALE DE TOUS LES BOTTOMSHEETS :
  // Modifie `useSheetScrollBottomPadding` pour ajuster le bas de TOUS les Bottom Sheets !
  // `scrollableBody` ou la présence d'un `footer` la neutralise : la liste doit descendre jusqu'au footer/bord.
  const sheetBottomPadding = useSheetScrollBottomPadding();
  const dynamicPaddingBottom =
    isZeroPaddingBottom || scrollableBody || hasFooter ? 0 : sheetBottomPadding;

  const Container = isDynamicSizing ? BottomSheetView : View;

  /*
   * Le pied de page passe par `footerComponent` et non par le flux du contenu.
   *
   * Rendu dans le contenu, sa position n'était qu'une conséquence de la mise en
   * page, calculée sur le fil JS et arrêtée seulement après le `onLayout` qui fixe
   * la hauteur de la feuille : les premières frames de l'ouverture le posaient à
   * une place, la mesure le déplaçait ensuite — le décalage visible.
   *
   * `BottomSheetFooter` est au contraire une vue absolue translatée par
   * `animatedFooterPosition`, dérivée de `animatedPosition` sur le fil UI. Le pied
   * colle donc à la feuille dès la première frame, et son `Math.max(0, ...)` le
   * retient à l'écran en fin de fermeture au lieu de le laisser filer avec le
   * contenu.
   */
  const [footerHeight, setFooterHeight] = useState(0);

  /*
   * `BottomSheetFooter` épingle le pied au bas de l'écran, pas à la feuille : sa
   * position absolue se simplifie en `containerHeight - footerHeight`, constante.
   * Seul son écrêtage à 0 le fait suivre la feuille, et sur les premiers
   * `footerHeight + handleHeight` pixels de course seulement — quelques
   * millisecondes avec l'ease-out exponentiel de gorhom. Le pied se posait donc
   * d'un coup, au-dessus du vide, pendant que la feuille montait encore.
   *
   * On lui redonne la course complète en l'indexant sur l'avancement de la
   * feuille : `animatedIndex` va de -1 (fermée) à 0 (premier point d'accroche).
   */
  const animatedIndex = useSharedValue(-1);

  const footerAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, animatedIndex.get() + 1));
    return {
      transform: [{ translateY: (1 - progress) * footerHeight }],
    };
  }, [footerHeight]);

  /*
   * L'ombre du pied de page s'annonce en fondu plutôt qu'en tout ou rien.
   * `footerShadow` bascule sur un seuil de défilement : monté et démonté sec, le
   * dégradé clignotait à chaque passage près de la fin de liste.
   *
   * Le dégradé est donc toujours rendu, et c'est son opacité qui bouge — sur le
   * fil UI, sans re-rendu.
   */
  const footerShadowOpacity = useSharedValue(footerShadow ? 1 : 0);

  useEffect(() => {
    footerShadowOpacity.value = withTiming(footerShadow ? 1 : 0, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value stable
  }, [footerShadow]);

  const footerShadowStyle = useAnimatedStyle(() => ({
    opacity: footerShadowOpacity.value,
  }));

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <Animated.View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[
            styles.footerContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: footerShadow ? theme.borderLight : 'transparent',
              paddingBottom: sheetBottomPadding,
            },
            footerAnimatedStyle,
          ]}>
          {/* Dégradé posé au-dessus de l'arête haute, et non `elevation` : sur
              Android la source lumineuse est virtuellement au-dessus de la vue,
              l'ombre part donc vers le BAS — sous la barre système, invisible.
              Toujours monté, il n'est que masqué : voir `footerShadowOpacity`. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.footerShadow, footerShadowStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.10)']}
              style={styles.fill}
            />
          </Animated.View>
          {footer ? (
            footer
          ) : (
            <View style={styles.footerRow}>
              {secondaryButtonTitle ? (
                <Button
                  variant={secondaryButtonVariant}
                  title={secondaryButtonTitle}
                  onPress={onSecondaryPress}
                  disabled={secondaryButtonDisabled}
                  style={styles.secondaryFooterButton}
                />
              ) : null}
              {primaryButtonTitle ? (
                <Button
                  variant={primaryButtonVariant}
                  title={primaryButtonTitle}
                  onPress={onPrimaryPress}
                  disabled={primaryButtonDisabled}
                  style={styles.primaryFooterButton}
                />
              ) : null}
            </View>
          )}
        </Animated.View>
      </BottomSheetFooter>
    ),
    [
      footerAnimatedStyle,
      footerShadowStyle,
      theme.background,
      theme.border,
      sheetBottomPadding,
      footer,
      secondaryButtonTitle,
      secondaryButtonVariant,
      onSecondaryPress,
      secondaryButtonDisabled,
      primaryButtonTitle,
      primaryButtonVariant,
      onPrimaryPress,
      primaryButtonDisabled,
    ]
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      animatedIndex={animatedIndex}
      snapPoints={memoizedSnapPoints}
      enablePanDownToClose={blocking ? false : enablePanDownToClose}
      enableDynamicSizing={isDynamicSizing}
      stackBehavior={stackBehavior}
      topInset={effectiveTopInset}
      android_keyboardInputMode="adjustPan"
      onChange={handleChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      footerComponent={hasFooter ? renderFooter : undefined}
      handleComponent={hasCloseButton ? null : undefined}
      handleIndicatorStyle={[styles.handle, { backgroundColor: theme.borderStrong || '#525252' }]}
      backgroundStyle={{
        backgroundColor: theme.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      style={[styles.sheetShadow, style]}>
      {/* À hauteur fixe, la chaîne de `flex: 1` doit descendre jusqu'au contenu :
          sans elle, une liste ne remplit pas la feuille et se tasse en haut.
          En dimensionnement dynamique c'est l'inverse — tout doit rester à la
          taille du contenu pour que gorhom puisse le mesurer. */}
      <Container
        style={[
          styles.contentContainer,
          !isDynamicSizing && styles.fill,
          contentContainerStyle,
        ]}>
        {/* Le pied de page étant désormais superposé, le contenu réserve sa hauteur
            ici — sinon les derniers éléments finiraient dessous. */}
        <View
          style={[
            { paddingBottom: hasFooter ? footerHeight : dynamicPaddingBottom },
            !isDynamicSizing && styles.fill,
          ]}>
          {/* EN-TÊTE STANDARDISÉ */}
          {shouldShowHeader && (
            <View
              style={[
                styles.headingBlock,
                // Sans poignée, plus rien ne dégage le haut de la feuille : la croix
                // se collerait à l'angle arrondi. L'en-tête reprend cet espace.
                hasCloseButton && styles.headingBlockWithoutHandle,
                headerDivider && [
                  styles.headingBlockDivider,
                  { borderBottomColor: theme.borderLight || theme.border },
                  // Inutile quand l'appelant a lui-même mis la marge du conteneur
                  // à zéro : le bloc porte déjà la sienne et occupe toute la
                  // largeur — la déborder le ferait sortir de la feuille.
                  !isZeroPaddingHoriz && styles.headingBlockDividerBleed,
                ],
                isZeroPaddingHoriz && { paddingHorizontal: 24 },
              ]}>
              {/* La croix occupe sa propre ligne, dans l'angle, et le titre prend
                  toute la largeur en dessous — au lieu de se partager la ligne.
                  `inlineCloseButton` les remet sur la même ligne. */}
              {showCloseButton && !isInlineHeader && (
                <IconButton
                  variant="circle"
                  icon={<X size={24} color={theme.text} />}
                  style={[styles.closeButtonCircle, { backgroundColor: theme.card }]}
                  onPress={() => modalRef.current?.dismiss()}
                  accessibilityLabel="Fermer le menu"
                />
              )}

              {isInlineHeader ? (
                <View style={styles.headingRow}>
                  <View style={styles.headingRowContent}>{headerContent}</View>
                  {showCloseButton && (
                    <IconButton
                      variant="circle"
                      icon={<X size={24} color={theme.text} />}
                      style={[styles.closeButtonInline, { backgroundColor: theme.card }]}
                      onPress={() => modalRef.current?.dismiss()}
                      accessibilityLabel="Fermer le menu"
                    />
                  )}
                </View>
              ) : headerContent ? (
                <View style={styles.titleColumn}>{headerContent}</View>
              ) : (
                <View style={styles.titleColumn}>
                  <View style={styles.titleRow}>
                    {title ? (
                      <Text style={[styles.heading, { color: theme.text }]} numberOfLines={1}>
                        {title}
                      </Text>
                    ) : null}
                    {titleAccessory}
                  </View>
                  {subtitle ? (
                    typeof subtitle === 'string' ? (
                      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {subtitle}
                      </Text>
                    ) : (
                      subtitle
                    )
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* CORPS DE LA FEUILLE */}
          <View style={[styles.childWrapper, !isDynamicSizing && styles.fill]}>{children}</View>

          {/* PIED DE PAGE : voir `renderFooter`, il est superposé et non dans ce flux. */}
        </View>
      </Container>
    </BottomSheetModal>
  );
};

const BaseBottomSheetModal = forwardRef(BaseBottomSheetModalRender);
BaseBottomSheetModal.displayName = 'BaseBottomSheetModal';

export default BaseBottomSheetModal;

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 100,
    marginTop: 6,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  /** Chaîne d'étirement des feuilles à hauteur fixe — voir le rendu. */
  fill: {
    flex: 1,
  },
  childWrapper: {
    paddingTop: 0,
  },
  headingBlock: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  headingBlockWithoutHandle: {
    paddingTop: 16,
  },
  /* Le trait remplace l'essentiel de la marge basse : posé 24px sous l'en-tête,
     il flotterait entre les deux blocs au lieu de fermer celui du haut. */
  headingBlockDivider: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /* Le trait court d'un bord à l'autre de la feuille : arrêté sur les marges du
     contenu, il se lirait comme un soulignement de l'en-tête. La marge négative
     annule celle du conteneur, le `paddingHorizontal` rend au contenu de
     l'en-tête son alignement sur le reste de la feuille. */
  headingBlockDividerBleed: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  /* Pas de `flex: 1` : dans ce bloc en colonne à hauteur automatique, il vaudrait
     `flexBasis: 0` et ferait s'effondrer la colonne de titre. */
  titleColumn: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    gap: 8,
  },
  heading: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 18,
  },
  closeButtonCircle: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 100,
    /* L'ombre par défaut d'`IconButton` se voit sur le fond de la feuille :
       on la neutralise sur les deux plateformes. */
    shadowOpacity: 0,
    elevation: 0,
  },
  /* Centré et non aligné en haut : le contenu d'en-tête est plus haut que la
     croix dès qu'un badge dépasse 32px, et celle-ci décrochait vers le haut. */
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /* `flex: 1` et non `flexShrink` : l'en-tête doit prendre toute la largeur
     restante, sans quoi une séquence d'icônes courte laisserait la croix
     flotter au milieu de la ligne. */
  headingRowContent: {
    flex: 1,
    gap: 2,
  },
  /* Même bouton que `closeButtonCircle`, sans l'`alignSelf` : dans une rangée
     il commanderait l'alignement vertical et collerait la croix au bas de
     l'en-tête. */
  closeButtonInline: {
    width: 32,
    height: 32,
    borderRadius: 100,
    shadowOpacity: 0,
    elevation: 0,
  },
  /* Plus de `marginHorizontal: -24` : le pied de page est rendu par
     `footerComponent`, donc hors du conteneur de contenu et de ses marges. */
  footerContainer: {
    paddingTop: 14,
    paddingHorizontal: 24,
    borderTopWidth: 0,
  },
  /* Débord au-dessus du pied de page : c'est le contenu qui défile dessous qui
     doit être assombri, pas le pied lui-même. */
  footerShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -12,
    height: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryFooterButton: {
    paddingHorizontal: 12,
  },
  primaryFooterButton: {
    flex: 1,
  },
});
