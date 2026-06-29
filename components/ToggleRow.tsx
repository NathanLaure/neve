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
  style?: any;
}

export default function ToggleRow({ title, value, onValueChange, style }: ToggleRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.toggleRow, style]}>
      <View style={styles.toggleLeft}>
        <Text style={[styles.toggleTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      <Host matchContents>
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
  },
  toggleLeft: {
    flex: 1,
    paddingRight: 8,
  },
  toggleTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
});
