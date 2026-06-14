import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type MapStyleType = 'default' | 'satellite';

interface MapLayerSheetProps {
  selectedStyle: MapStyleType;
  onSelectStyle: (style: MapStyleType) => void;
  onClose: () => void;
}

export default function MapLayerSheet({
  selectedStyle,
  onSelectStyle,
  onClose,
}: MapLayerSheetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  const mapTypes = useMemo(() => {
    const defaultPreviewStyle =
      colorScheme === 'dark' ? 'nlaure/cmqeb16wa001u01qn7zxmgncl' : 'mapbox/outdoors-v12';

    return [
      {
        key: 'default' as MapStyleType,
        label: 'Par défaut',
        previewUri: `https://api.mapbox.com/styles/v1/${defaultPreviewStyle}/static/2.35,48.86,10,0/200x200@2x?access_token=`,
      },
      {
        key: 'satellite' as MapStyleType,
        label: 'Satellite',
        previewUri:
          'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/2.35,48.86,10,0/200x200@2x?access_token=',
      },
    ];
  }, [colorScheme]);

  const snapPoints = useMemo(() => ['30%'], []);

  // Present the modal when the component mounts
  useEffect(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, { backgroundColor: theme.tabIconDefault }]}
      backgroundStyle={{
        backgroundColor: theme.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      style={styles.sheetShadow}>
      <BottomSheetView style={styles.contentContainer}>
        {/* Heading row with close button */}
        <View style={styles.headingRow}>
          <Text style={[styles.heading, { color: theme.text }]}>Type de carte</Text>
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.dismiss();
            }}
            hitSlop={8}>
            <X size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Map type options */}
        <View style={styles.optionsList}>
          {mapTypes.map((mapType) => {
            const isSelected = selectedStyle === mapType.key;
            return (
              <Pressable
                key={mapType.key}
                onPress={() => onSelectStyle(mapType.key)}
                style={styles.optionItem}>
                <View
                  style={[
                    styles.previewContainer,
                    isSelected && {
                      borderColor: theme.tint,
                      borderWidth: 2,
                    },
                    !isSelected && {
                      borderColor: theme.border,
                      borderWidth: 1,
                    },
                  ]}>
                  <Image
                    source={{ uri: mapType.previewUri + mapboxToken }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? theme.text : theme.textMuted },
                  ]}>
                  {mapType.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

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
    paddingBottom: 48,
    gap: 20,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    lineHeight: 30,
  },
  optionsList: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
  },
  optionItem: {
    alignItems: 'center',
    gap: 8,
  },
  previewContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  optionLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
});
