import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'outlined';
  onClear?: () => void;
  isPassword?: boolean;
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
      variant = 'outlined',
      onClear,
      isPassword = false,
      value,
      onChangeText,
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
    const [secureText, setSecureText] = useState(isPassword);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const borderColor = error
      ? theme.statusTextError || '#E63946'
      : isFocused
      ? theme.primary
      : theme.border;

    const labelColor = error
      ? theme.statusTextError || '#E63946'
      : isFocused
      ? theme.primary
      : theme.textMuted;

    const hasValue = Boolean(value && value.length > 0);

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && variant === 'default' ? (
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: variant === 'outlined' ? 'transparent' : theme.card,
              borderColor,
              borderWidth: isFocused ? 2 : 1.5,
            },
          ]}>
          {label && variant === 'outlined' ? (
            <View style={[styles.floatingLabelBadge, { backgroundColor: theme.background }]}>
              <Text style={[styles.floatingLabelText, { color: labelColor }]}>
                {label}
              </Text>
            </View>
          ) : null}

          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isPassword ? secureText : textInputProps.secureTextEntry}
            style={[styles.input, { color: theme.text }, inputStyle, style]}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...textInputProps}
          />

          {onClear && hasValue ? (
            <Pressable onPress={onClear} hitSlop={10} style={styles.actionIconBtn}>
              <X size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}

          {isPassword ? (
            <Pressable
              onPress={() => setSecureText(!secureText)}
              hitSlop={10}
              style={styles.actionIconBtn}>
              {secureText ? (
                <Eye size={18} color={theme.textMuted} />
              ) : (
                <EyeOff size={18} color={theme.textMuted} />
              )}
            </Pressable>
          ) : null}

          {rightIcon && !isPassword && (!onClear || !hasValue) ? (
            <View style={styles.rightIconWrapper}>{rightIcon}</View>
          ) : null}
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: theme.statusTextError || '#E63946' }]}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    width: '100%',
    marginVertical: 4,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
  },
  floatingLabelBadge: {
    position: 'absolute',
    left: 12,
    top: -10,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  floatingLabelText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 14,
  },
  iconWrapper: {
    marginRight: 10,
  },
  rightIconWrapper: {
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 4,
    marginLeft: 6,
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

