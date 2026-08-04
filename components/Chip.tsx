import React from 'react';
import { StyleSheet, Text, Pressable, View, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface ChipProps {
  text?: string;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[] | any;
  textStyle?: TextStyle | TextStyle[] | any;
}

export default function Chip({
  text,
  label,
  selected = false,
  disabled = false,
  size = 'default',
  icon,
  trailingIcon,
  onPress,
  style,
  textStyle,
}: ChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const chipLabel = label ?? text ?? '';
  const minHeight = size === 'small' ? 32 : 40;
  const borderRadius = size === 'small' ? 8 : 12;

  const defaultBgColor = disabled
    ? theme.buttonDisabled || '#222222'
    : theme.card || '#222222';

  const defaultBorderColor = disabled
    ? theme.borderDisabled || '#3D3D3D'
    : selected
    ? theme.primary || '#FA6415'
    : theme.border || '#3D3D3D';

  const defaultBorderWidth = selected ? 1.5 : 1;

  const defaultTextColor = disabled
    ? theme.buttonTextDisabled || '#525252'
    : selected
    ? colorScheme === 'dark'
      ? '#FFFFFF'
      : '#111111'
    : theme.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.container,
        {
          minHeight,
          borderRadius,
          backgroundColor: defaultBgColor,
          borderColor: defaultBorderColor,
          borderWidth: defaultBorderWidth,
        },
        style,
      ]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      {chipLabel ? (
        <Text
          style={[
            styles.text,
            {
              color: defaultTextColor,
              fontSize: size === 'small' ? 12 : 14,
              fontWeight: selected ? '600' : '500',
            },
            textStyle,
          ]}>
          {chipLabel}
        </Text>
      ) : null}
      {trailingIcon && <View style={styles.trailingIconWrapper}>{trailingIcon}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingIconWrapper: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'BricolageGrotesque-Medium',
  },
});


