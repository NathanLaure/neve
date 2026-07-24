import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      icon,
      rightIcon,
      containerStyle,
      inputStyle,
      style,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const borderColor = error
      ? theme.statusBgError
      : isFocused
      ? theme.primary
      : theme.border;

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.background,
              borderColor,
              borderWidth: isFocused || error ? 2 : 1,
            },
          ]}>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

          <TextInput
            ref={ref}
            style={[styles.input, { color: theme.text }, inputStyle, style]}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...textInputProps}
          />

          {rightIcon ? <View style={styles.rightIconWrapper}>{rightIcon}</View> : null}
        </View>

        {error ? <Text style={[styles.errorText, { color: theme.statusTextError }]}>{error}</Text> : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    width: '100%',
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  iconWrapper: {
    marginRight: 12,
  },
  rightIconWrapper: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    height: '100%',
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    marginTop: 2,
  },
});
