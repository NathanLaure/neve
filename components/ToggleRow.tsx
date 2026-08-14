import React from 'react';
import { StyleSheet, Text, View, Platform, Pressable } from 'react-native';
import { Host, Switch } from '@expo/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

/* eslint-disable @typescript-eslint/no-require-imports */
const iosTint = Platform.OS === 'ios' ? require('@expo/ui/swift-ui/modifiers').tint : null;
const AndroidSwitch = Platform.OS === 'android' ? require('@expo/ui/jetpack-compose').Switch : null;
/* eslint-enable @typescript-eslint/no-require-imports */

export interface ToggleRowProps {
  title: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  icon?: React.ReactNode;
  /** Couleur de fond du conteneur hôte pour fondre le ripple sans démarcation */
  backgroundColor?: string;
  style?: any;
}

export default function ToggleRow({
  title,
  value,
  onValueChange,
  icon,
  backgroundColor,
  style,
}: ToggleRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const resolvedBg = backgroundColor ?? style?.backgroundColor ?? 'transparent';

  const rowStyle = [
    styles.toggleRow,
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
      <View style={styles.toggleLeft}>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
        <Text style={[styles.toggleTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      <Host matchContents style={{ overflow: 'visible' }}>
        {Platform.OS === 'android' && AndroidSwitch ? (
          <AndroidSwitch
            value={value}
            onCheckedChange={onValueChange}
            enabled={true}
            colors={{
              checkedThumbColor: '#ffffff',
              checkedTrackColor: theme.primary,
              checkedBorderColor: 'transparent',
              uncheckedThumbColor: theme.tabIconDefault,
              uncheckedTrackColor: theme.background,
              uncheckedBorderColor: theme.border,
            }}
          />
        ) : (
          <Switch
            value={value}
            onValueChange={onValueChange}
            modifiers={iosTint ? [iosTint(theme.primary)] : undefined}
          />
        )}
      </Host>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
});
