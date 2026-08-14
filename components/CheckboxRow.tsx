import React from 'react';
import { StyleSheet, Text, View, Platform, Pressable } from 'react-native';
import { Host, Checkbox } from '@expo/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

/* eslint-disable @typescript-eslint/no-require-imports */
const swiftUIModifiers = Platform.OS === 'ios' ? require('@expo/ui/swift-ui/modifiers') : null;
const jetpackModifiers = Platform.OS === 'android' ? require('@expo/ui/jetpack-compose/modifiers') : null;
const AndroidCheckbox = Platform.OS === 'android' ? require('@expo/ui/jetpack-compose').Checkbox : null;
/* eslint-enable @typescript-eslint/no-require-imports */

const CHECKBOX_SCALE = 1.1;

export interface CheckboxRowProps {
  title: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  /** Couleur de fond du conteneur hôte pour fondre le ripple sans démarcation */
  backgroundColor?: string;
  style?: any;
}

export default function CheckboxRow({
  title,
  value,
  onValueChange,
  backgroundColor,
  style,
}: CheckboxRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const resolvedBg = backgroundColor ?? style?.backgroundColor ?? 'transparent';

  const rowStyle = [
    styles.row,
    {
      borderRadius: 12,
      overflow: 'hidden' as const,
      backgroundColor: resolvedBg,
    },
    style,
  ];

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      android_ripple={{
        color: theme.ripple,
        borderless: false,
        foreground: true,
      }}
      style={rowStyle}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      <Host matchContents style={{ overflow: 'visible' }}>
        {Platform.OS === 'android' && AndroidCheckbox ? (
          <AndroidCheckbox
            value={value}
            onCheckedChange={onValueChange}
            enabled={true}
            colors={{
              checkedColor: theme.primary,
              uncheckedColor: theme.buttonSecondary,
              checkmarkColor: '#ffffff',
            }}
            modifiers={
              jetpackModifiers
                ? [jetpackModifiers.graphicsLayer({ scaleX: CHECKBOX_SCALE, scaleY: CHECKBOX_SCALE })]
                : undefined
            }
          />
        ) : (
          <Checkbox
            value={value}
            onValueChange={onValueChange}
            modifiers={
              swiftUIModifiers
                ? [swiftUIModifiers.tint(theme.primary), swiftUIModifiers.scaleEffect(CHECKBOX_SCALE)]
                : undefined
            }
          />
        )}
      </Host>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  left: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
});
