import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, PanResponder } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface RangeSliderProps {
  title: string;
  subtitle?: React.ReactNode;
  min: number;
  max: number;
  values: [number, number];
  onChange: (vals: [number, number]) => void;
  valueFormatter: (minVal: number, maxVal: number) => string;
}

export default function RangeSlider({
  title,
  subtitle,
  min,
  max,
  values,
  onChange,
  valueFormatter,
}: RangeSliderProps) {
  const [width, setWidth] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const activeHandle = useRef<'min' | 'max' | null>(null);

  const [localValues, setLocalValues] = useState<[number, number]>(values);
  const localValuesRef = useRef(localValues);

  // Track previous prop values to sync changes during render
  const [prevValues, setPrevValues] = useState<[number, number]>(values);
  if (values[0] !== prevValues[0] || values[1] !== prevValues[1]) {
    setLocalValues(values);
    setPrevValues(values);
  }

  useEffect(() => {
    localValuesRef.current = localValues;
  }, [localValues]);

  const updateLocalValues = (nextVals: [number, number]) => {
    setLocalValues(nextVals);
    localValuesRef.current = nextVals;
  };

  const minRef = useRef(min);
  const maxRef = useRef(max);
  const widthRef = useRef(width);
  const onChangeRef = useRef(onChange);

  const startValueRef = useRef<number>(0);
  const startPageXRef = useRef<number>(0);

  useEffect(() => {
    minRef.current = min;
    maxRef.current = max;
    widthRef.current = width;
    onChangeRef.current = onChange;
  });

  const [panResponder, setPanResponder] = useState<any>(null);

  useEffect(() => {
    setPanResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const w = widthRef.current;
          if (w <= 12) return;
          const trackWidth = w - 12;
          const relativeTouchX = Math.max(0, Math.min(touchX - 6, trackWidth));
          const touchVal =
            minRef.current + (relativeTouchX / trackWidth) * (maxRef.current - minRef.current);
          const roundedVal = Math.round(touchVal);

          const currentVals = localValuesRef.current;
          const distMin = Math.abs(roundedVal - currentVals[0]);
          const distMax = Math.abs(roundedVal - currentVals[1]);
          const handle = distMin < distMax ? 'min' : 'max';
          activeHandle.current = handle;

          let nextVals: [number, number];
          if (handle === 'min') {
            const constrainedVal = Math.max(
              minRef.current,
              Math.min(roundedVal, currentVals[1] - 1)
            );
            nextVals = [constrainedVal, currentVals[1]];
            startValueRef.current = constrainedVal;
          } else {
            const constrainedVal = Math.max(
              currentVals[0] + 1,
              Math.min(roundedVal, maxRef.current)
            );
            nextVals = [currentVals[0], constrainedVal];
            startValueRef.current = constrainedVal;
          }

          updateLocalValues(nextVals);
          startPageXRef.current = evt.nativeEvent.pageX;
        },
        onPanResponderMove: (evt) => {
          const w = widthRef.current;
          if (w <= 12 || !activeHandle.current) return;
          const trackWidth = w - 12;
          const dx = evt.nativeEvent.pageX - startPageXRef.current;
          const deltaVal = (dx / trackWidth) * (maxRef.current - minRef.current);
          const newVal = Math.round(startValueRef.current + deltaVal);

          const currentVals = localValuesRef.current;
          if (activeHandle.current === 'min') {
            const constrainedVal = Math.max(minRef.current, Math.min(newVal, currentVals[1] - 1));
            updateLocalValues([constrainedVal, currentVals[1]]);
          } else {
            const constrainedVal = Math.max(currentVals[0] + 1, Math.min(newVal, maxRef.current));
            updateLocalValues([currentVals[0], constrainedVal]);
          }
        },
        onPanResponderRelease: () => {
          activeHandle.current = null;
          onChangeRef.current(localValuesRef.current);
        },
      })
    );
  }, []);

  const pctMin = ((localValues[0] - min) / (max - min)) * 100;
  const pctMax = ((localValues[1] - min) / (max - min)) * 100;

  return (
    <View style={styles.filterGroup}>
      <View style={styles.filterGroupHeader}>
        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <Text style={[styles.filterGroupTitle, { color: theme.text }]}>{title}</Text>
          {subtitle}
        </View>
        <Text style={[styles.filterValueText, { color: theme.text }]}>
          {valueFormatter(localValues[0], localValues[1])}
        </Text>
      </View>
      <View
        style={styles.sliderWrapper}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...(panResponder ? panResponder.panHandlers : {})}>
        <View style={[styles.sliderTrack, { backgroundColor: theme.border }]} pointerEvents="none">
          <View
            style={[
              styles.sliderActiveTrack,
              {
                left: `${pctMin}%`,
                width: `${pctMax - pctMin}%`,
                backgroundColor: theme.text,
              },
            ]}
          />
          <View
            style={[
              styles.sliderThumb,
              {
                left: `${pctMin}%`,
                backgroundColor: theme.text,
                borderWidth: 2,
                borderColor: theme.card,
              },
            ]}
          />
          <View
            style={[
              styles.sliderThumb,
              {
                left: `${pctMax}%`,
                backgroundColor: theme.text,
                borderWidth: 2,
                borderColor: theme.card,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterGroup: {
    marginBottom: 40,
    width: '100%',
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterGroupTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    marginBottom: 0,
  },
  filterValueText: {
    fontFamily: 'Satoshi',
    fontSize: 16,
  },
  sliderWrapper: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sliderTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    position: 'relative',
  },
  sliderActiveTrack: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -10,
    width: 12,
    height: 24,
    borderRadius: 4,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
