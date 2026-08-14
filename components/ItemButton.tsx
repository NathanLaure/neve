import React from 'react';
import { StyleSheet, Text, View, Pressable, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ItemButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export default function ItemButton({
  icon,
  label,
  onPress,
  color,
  style,
  textStyle,
  disabled = false,
}: ItemButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const textColor = color ?? theme.text;

  const itemStyle = [
    styles.container,
    {
      borderRadius: 12,
      overflow: 'hidden' as const,
      backgroundColor: theme.card,
    },
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      android_ripple={
        disabled
          ? undefined
          : {
              color: theme.ripple,
              borderless: false,
              foreground: true,
            }
      }
      style={itemStyle}
      onPress={onPress}
      disabled={disabled}>
      <View style={styles.rowContainer}>
        {icon}
        <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
});
