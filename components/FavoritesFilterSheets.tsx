import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpDown, Gauge, Mountain, MapPin, Check } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import BaseBottomSheetModal, { BaseBottomSheetModalRef } from '@/components/BaseBottomSheetModal';
import ChoiceChip from '@/components/ChoiceChip';
import RangeSlider from '@/components/RangeSlider';
import { RandoData } from '@/constants/RandosData';

export type SortCriteria =
  | 'recent'
  | 'distance_asc'
  | 'distance_desc'
  | 'elevation_asc'
  | 'duration_asc'
  | 'train_asc';

export interface FavoritesFilterSheetsRef {
  openSort: () => void;
  openDifficulty: () => void;
  openDistance: () => void;
}

interface FavoritesFilterSheetsProps {
  currentSort: SortCriteria;
  onApplySort: (sort: SortCriteria) => void;
  selectedDifficulties: string[];
  onApplyDifficulties: (difficulties: string[]) => void;
  maxDistance: number | null;
  onApplyDistance: (distance: number | null) => void;
  // Dynamic count calculator based on proposed temporary filters
  getFilteredCount: (override: {
    sort?: SortCriteria;
    difficulties?: string[];
    maxDistance?: number | null;
  }) => number;
}

export const SORT_OPTIONS: { key: SortCriteria; label: string }[] = [
  { key: 'recent', label: "Date d'ajout (plus récent)" },
  { key: 'distance_asc', label: 'Distance (croissante)' },
  { key: 'distance_desc', label: 'Distance (décroissante)' },
  { key: 'elevation_asc', label: 'Dénivelé (croissant)' },
  { key: 'duration_asc', label: 'Durée de marche (croissante)' },
  { key: 'train_asc', label: 'Trajet en train (le plus court)' },
];

export const DIFFICULTY_OPTIONS = ['Facile', 'Modéré', 'Difficile'];
export const MAX_DISTANCE_LIMIT = 35;

export const FavoritesFilterSheets = forwardRef<
  FavoritesFilterSheetsRef,
  FavoritesFilterSheetsProps
>(
  (
    {
      currentSort,
      onApplySort,
      selectedDifficulties,
      onApplyDifficulties,
      maxDistance,
      onApplyDistance,
      getFilteredCount,
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const sortSheetRef = useRef<BaseBottomSheetModalRef>(null);
    const difficultySheetRef = useRef<BaseBottomSheetModalRef>(null);
    const distanceSheetRef = useRef<BaseBottomSheetModalRef>(null);

    // Local temporary states while sheet is open
    const [tempSort, setTempSort] = useState<SortCriteria>(currentSort);
    const [tempDifficulties, setTempDifficulties] = useState<string[]>(selectedDifficulties);
    const [tempDistanceRange, setTempDistanceRange] = useState<[number, number]>([
      0,
      maxDistance ?? MAX_DISTANCE_LIMIT,
    ]);

    useImperativeHandle(ref, () => ({
      openSort: () => {
        setTempSort(currentSort);
        sortSheetRef.current?.present();
      },
      openDifficulty: () => {
        setTempDifficulties(selectedDifficulties);
        difficultySheetRef.current?.present();
      },
      openDistance: () => {
        setTempDistanceRange([0, maxDistance ?? MAX_DISTANCE_LIMIT]);
        distanceSheetRef.current?.present();
      },
    }));

    // Computed button titles with real-time count
    const sortResultsCount = getFilteredCount({ sort: tempSort });
    const diffResultsCount = getFilteredCount({ difficulties: tempDifficulties });
    const effectiveTempMaxDist =
      tempDistanceRange[1] >= MAX_DISTANCE_LIMIT ? null : tempDistanceRange[1];
    const distResultsCount = getFilteredCount({ maxDistance: effectiveTempMaxDist });

    const formatButtonTitle = (count: number) => {
      if (count === 0) return 'Aucune randonnée';
      if (count === 1) return 'Afficher 1 randonnée';
      return `Afficher ${count} randonnées`;
    };

    return (
      <>
        {/* 1. Sort Bottom Sheet */}
        <BaseBottomSheetModal
          ref={sortSheetRef}
          enableDynamicSizing
          title="Trier par"
          showCloseButton
          secondaryButtonTitle="Effacer le filtre"
          onSecondaryPress={() => {
            onApplySort('recent');
            sortSheetRef.current?.dismiss();
          }}
          primaryButtonTitle={formatButtonTitle(sortResultsCount)}
          onPrimaryPress={() => {
            onApplySort(tempSort);
            sortSheetRef.current?.dismiss();
          }}>
          <View style={styles.sheetContent}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = tempSort === opt.key;
              return (
                <ChoiceChip
                  key={opt.key}
                  label={opt.label}
                  selected={isSelected}
                  radio
                  onPress={() => setTempSort(opt.key)}
                />
              );
            })}
          </View>
        </BaseBottomSheetModal>

        {/* 2. Difficulty Bottom Sheet */}
        <BaseBottomSheetModal
          ref={difficultySheetRef}
          enableDynamicSizing
          title="Difficulté"
          showCloseButton
          secondaryButtonTitle="Effacer le filtre"
          onSecondaryPress={() => {
            onApplyDifficulties([]);
            difficultySheetRef.current?.dismiss();
          }}
          primaryButtonTitle={formatButtonTitle(diffResultsCount)}
          onPrimaryPress={() => {
            onApplyDifficulties(tempDifficulties);
            difficultySheetRef.current?.dismiss();
          }}>
          <View style={styles.sheetContent}>
            {DIFFICULTY_OPTIONS.map((diff) => {
              const isChecked = tempDifficulties.includes(diff);
              return (
                <ChoiceChip
                  key={diff}
                  label={diff}
                  selected={isChecked}
                  checkbox
                  onPress={() => {
                    setTempDifficulties((prev) =>
                      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
                    );
                  }}
                />
              );
            })}
          </View>
        </BaseBottomSheetModal>

        {/* 3. Distance Bottom Sheet */}
        <BaseBottomSheetModal
          ref={distanceSheetRef}
          enableDynamicSizing
          title="Distance"
          showCloseButton
          secondaryButtonTitle="Effacer le filtre"
          onSecondaryPress={() => {
            onApplyDistance(null);
            distanceSheetRef.current?.dismiss();
          }}
          primaryButtonTitle={formatButtonTitle(distResultsCount)}
          onPrimaryPress={() => {
            onApplyDistance(effectiveTempMaxDist);
            distanceSheetRef.current?.dismiss();
          }}>
          <View style={styles.sheetContent}>
            <RangeSlider
              title="Distance maximale"
              min={0}
              max={MAX_DISTANCE_LIMIT}
              values={tempDistanceRange}
              onChange={setTempDistanceRange}
              valueFormatter={(_, max) =>
                max >= MAX_DISTANCE_LIMIT ? 'Toutes les distances' : `Jusqu'à ${max} km`
              }
            />
          </View>
        </BaseBottomSheetModal>
      </>
    );
  }
);

FavoritesFilterSheets.displayName = 'FavoritesFilterSheets';

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
});
