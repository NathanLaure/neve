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
import { BackHandler, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';

export interface BaseBottomSheetModalRef {
  present: () => void;
  dismiss: () => void;
}

export interface BaseBottomSheetModalProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  enablePanDownToClose?: boolean;
  /** Actif par défaut : la hauteur s'adapte automatiquement au contenu */
  enableDynamicSizing?: boolean;
  backdropOpacity?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Composant optionnel affiché en bas de feuille (ex: bouton de validation fixe) */
  footer?: ReactNode;
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
}

const BaseBottomSheetModalRender: React.ForwardRefRenderFunction<
  BaseBottomSheetModalRef,
  BaseBottomSheetModalProps
> = (
  {
    children,
    snapPoints,
    showHeader = false,
    title,
    subtitle,
    showCloseButton = true,
    onClose,
    enablePanDownToClose = true,
    enableDynamicSizing = true, // 👈 Redimensionnement dynamique actif par défaut
    backdropOpacity = 0.35,
    contentContainerStyle,
    style,
    footer,
    stackBehavior = 'replace',
    topInset = 0,
  },
  ref
) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
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

  const memoizedSnapPoints = useMemo(() => {
    if (hasExplicitSnapPoints) return snapPoints as (string | number)[];
    // Tableau vide : c'est ainsi que gorhom sait qu'il doit mesurer le contenu.
    return isDynamicSizing ? [] : ['30%'];
  }, [snapPoints, hasExplicitSnapPoints, isDynamicSizing]);

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
      modalRef.current?.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        pressBehavior="close"
      />
    ),
    [backdropOpacity]
  );

  const isZeroPaddingHoriz =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingHorizontal === 0;

  const isZeroPaddingBottom =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingBottom === 0;

  // 👈 MARGE BASSE GLOBALE DE TOUS LES BOTTOMSHEETS :
  // Modifie la constante 34 (ou le calcul) pour ajuster la hauteur du bas de TOUS les Bottom Sheets !
  const dynamicPaddingBottom = isZeroPaddingBottom ? 0 : Math.max(insets.bottom + 16, 48);

  const Container = isDynamicSizing ? BottomSheetView : View;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={memoizedSnapPoints}
      enablePanDownToClose={enablePanDownToClose}
      enableDynamicSizing={isDynamicSizing}
      stackBehavior={stackBehavior}
      topInset={topInset}
      onChange={handleChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, { backgroundColor: theme.borderStrong || '#525252' }]}
      backgroundStyle={{
        backgroundColor: theme.background,
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
        <View style={[{ paddingBottom: dynamicPaddingBottom }, !isDynamicSizing && styles.fill]}>
          {/* EN-TÊTE STANDARDISÉ */}
          {showHeader && (
            <View
              style={[
                styles.headingRow,
                isZeroPaddingHoriz && { paddingHorizontal: 24 },
              ]}>
              <View style={styles.titleColumn}>
                {title ? (
                  <Text style={[styles.heading, { color: theme.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              {showCloseButton && (
                <IconButton
                  variant="circle"
                  icon={<X size={16} color={theme.text} />}
                  style={[styles.closeButtonCircle, { backgroundColor: theme.background }]}
                  onPress={() => modalRef.current?.dismiss()}
                  accessibilityLabel="Fermer le menu"
                />
              )}
            </View>
          )}

          {/* CORPS DE LA FEUILLE */}
          <View style={[styles.childWrapper, !isDynamicSizing && styles.fill]}>{children}</View>

          {/* PIED DE PAGE OPTIONNEL */}
          {footer ? <View style={styles.footerContainer}>{footer}</View> : null}
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  heading: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 100,
  },
  footerContainer: {
    paddingTop: 12,
  },
});
