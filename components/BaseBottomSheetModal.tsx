import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { StyleSheet, Text, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface BaseBottomSheetModalRef {
  present: () => void;
  dismiss: () => void;
}

export interface BaseBottomSheetModalProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  showHeader?: boolean;
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  enablePanDownToClose?: boolean;
  enableDynamicSizing?: boolean;
  backdropOpacity?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

const BaseBottomSheetModalRender: React.ForwardRefRenderFunction<
  BaseBottomSheetModalRef,
  BaseBottomSheetModalProps
> = (
  {
    children,
    snapPoints = ['30%'],
    showHeader = false,
    title,
    showCloseButton = true,
    onClose,
    enablePanDownToClose = true,
    enableDynamicSizing = false,
    backdropOpacity = 0.35,
    contentContainerStyle,
    style,
  },
  ref
) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  const handleDismiss = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

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

  // Check if contentContainerStyle resets paddingHorizontal or paddingBottom
  const isZeroPaddingHoriz =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingHorizontal === 0;

  const isZeroPaddingBottom =
    contentContainerStyle &&
    typeof contentContainerStyle === 'object' &&
    (contentContainerStyle as any).paddingBottom === 0;

  const dynamicPaddingBottom = isZeroPaddingBottom ? 0 : Math.max(insets.bottom + 12, 34);

  const Container = enableDynamicSizing ? BottomSheetView : View;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={memoizedSnapPoints}
      enablePanDownToClose={enablePanDownToClose}
      enableDynamicSizing={enableDynamicSizing}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, { backgroundColor: theme.tabIconDefault }]}
      backgroundStyle={{
        backgroundColor: theme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      style={[styles.sheetShadow, style]}>
      <Container
        style={[
          { flex: 1 },
          styles.contentContainer,
          { paddingBottom: dynamicPaddingBottom },
          contentContainerStyle,
        ]}>
        {showHeader && (
          <View
            style={[
              styles.headingRow,
              { borderBottomColor: theme.border },
              isZeroPaddingHoriz && { paddingHorizontal: 24 },
            ]}>
            {title ? (
              <Text style={[styles.heading, { color: theme.text }]}>{title}</Text>
            ) : (
              <View />
            )}

            {showCloseButton && (
              <Pressable
                onPress={() => modalRef.current?.dismiss()}
                hitSlop={8}>
                <X size={24} color={theme.text} />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.childWrapper}>{children}</View>
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
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 12,
  },
  handle: {
    width: 33,
    height: 4,
    borderRadius: 16777200,
  },
  contentContainer: {
    paddingHorizontal: 24,
    flex: 1,
  },
  childWrapper: {
    flex: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 30,
  },
});
