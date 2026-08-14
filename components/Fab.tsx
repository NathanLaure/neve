import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import Reanimated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface FabProps extends Omit<PressableProps, 'style'> {
  text?: string;
  icon?: React.ReactNode;
  size?: 'small' | 'default' | 'large';
  variant?: 'primary' | 'secondary' | 'card';
  visible?: boolean;
  style?: StyleProp<ViewStyle> | any;
  textStyle?: StyleProp<TextStyle> | any;
}

export function Fab({
  text,
  icon,
  size = 'default',
  variant = 'primary',
  visible = true,
  onPress,
  style,
  textStyle,
  disabled,
  ...pressableProps
}: FabProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (!visible) return null;

  const height = size === 'small' ? 36 : size === 'large' ? 56 : 48;
  const borderRadius = height / 2;
  const paddingHorizontal = !text
    ? (size === 'small' ? 12 : 16)
    : (size === 'small' ? 14 : size === 'large' ? 24 : 20);
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  const backgroundColor = disabled
    ? (theme.buttonDisabled || '#333333')
    : variant === 'secondary'
      ? (theme.secondary || '#1F2937')
      : variant === 'card'
        ? (theme.card || '#1E1E1E')
        : (theme.tint || '#FA6415');

  const textColor = disabled
    ? (theme.buttonTextDisabled || '#777777')
    : variant === 'card'
      ? theme.text
      : '#FFFFFF';

  return (
    <Reanimated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={[
        styles.wrapper,
        {
          height,
          borderRadius,
          backgroundColor,
          overflow: 'hidden' as const,
        },
        style,
      ]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        android_ripple={
          disabled
            ? undefined
            : {
                color: variant === 'card' ? theme.ripple : theme.rippleOnBrand,
                borderless: false,
                foreground: true,
              }
        }
        style={[
          styles.pressable,
          {
            paddingHorizontal,
            borderRadius,
            overflow: 'hidden' as const,
          },
        ]}
        {...pressableProps}>
        {icon}
        {text ? (
          <Text
            numberOfLines={1}
            style={[
              styles.text,
              { color: textColor, fontSize },
              textStyle,
            ]}>
            {text}
          </Text>
        ) : null}
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontWeight: '700',
    includeFontPadding: false,
  },
});

export default Fab;
