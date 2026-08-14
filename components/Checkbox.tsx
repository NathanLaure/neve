import React from 'react';
import { StyleSheet, Text, Pressable, View, TextStyle, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string | React.ReactNode;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  containerStyle,
  labelStyle,
}: CheckboxProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      android_ripple={{
        color: theme.ripple,
        borderless: true,
      }}
      style={[styles.container, containerStyle]}
      hitSlop={6}>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? theme.primary : 'transparent',
            borderColor: checked ? theme.primary : theme.border,
          },
        ]}>
        {checked ? <Check size={14} color="#EFEFEF" strokeWidth={3} /> : null}
      </View>

      {label ? (
        typeof label === 'string' ? (
          <Text style={[styles.label, { color: theme.textMuted }, labelStyle]}>
            {label}
          </Text>
        ) : (
          <View style={styles.labelWrapper}>{label}</View>
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  label: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  labelWrapper: {
    flex: 1,
  },
});
