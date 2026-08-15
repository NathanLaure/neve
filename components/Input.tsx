import React, { forwardRef, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
  Animated,
} from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isSuccess?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'outlined';
  onClear?: () => void;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  /**
   * Overrides the field's background. The floating label badge picks it up too, so it
   * stays flush with the field instead of showing the screen background behind it.
   */
  fieldBackground?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      isSuccess = false,
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
      placeholder,
      fieldBackground,
      ...textInputProps
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);
    const [secureText, setSecureText] = useState(isPassword);

    const hasValue = Boolean(value && value.length > 0);
    const isFloating = isFocused || hasValue;
    // Sans label flottant, rien n'occupe l'intérieur du champ au repos : le placeholder
    // doit alors rester visible en permanence (sinon le champ paraît vide).
    const hasFloatingLabel = Boolean(label && variant === 'outlined');

    const animatedIsFocused = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(animatedIsFocused, {
        toValue: isFloating ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }, [isFloating]);

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
      : isSuccess
      ? theme.statusBgSuccess
      : isFocused
      ? theme.primary
      : hasValue
      ? theme.borderLight
      : theme.border;

    const labelColor = error
      ? theme.statusTextError || '#E63946'
      : isSuccess
      ? theme.statusBgSuccess
      : isFocused
      ? theme.primary
      : hasValue
      ? theme.text
      : theme.textMuted;

    const floatingTop = animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -10],
    });

    const floatingFontSize = animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    });

    const floatingLeft = animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [icon ? 44 : 16, 12],
    });

    const containerBackground =
      fieldBackground ?? (variant === 'outlined' ? 'transparent' : theme.card);

    const floatingBgColor = animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', fieldBackground ?? theme.background],
    });

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && variant === 'default' ? (
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: containerBackground,
              borderColor,
              borderWidth: isFocused || isSuccess ? 2 : 1.5,
            },
          ]}>
          {label && variant === 'outlined' ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatingLabelBadge,
                {
                  top: floatingTop,
                  left: floatingLeft,
                  backgroundColor: floatingBgColor,
                },
              ]}>
              <Animated.Text
                style={[
                  styles.floatingLabelText,
                  {
                    color: labelColor,
                    fontSize: floatingFontSize,
                    fontFamily: (hasValue || isFocused) ? 'Satoshi-Bold' : 'Satoshi-Medium',
                  },
                ]}>
                {label}
              </Animated.Text>
            </Animated.View>
          ) : null}

          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isPassword ? secureText : textInputProps.secureTextEntry}
            style={[styles.input, { color: theme.text }, inputStyle, style]}
            placeholder={!hasFloatingLabel || isFloating ? placeholder : undefined}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...textInputProps}
          />

          {onClear && hasValue ? (
            <Pressable
              onPress={onClear}
              hitSlop={10}
              android_ripple={{
                color: theme.ripple,
                borderless: true,
              }}
              style={styles.actionIconBtn}>
              <X size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}

          {isPassword && hasValue ? (
            <Pressable
              onPress={() => setSecureText(!secureText)}
              hitSlop={10}
              android_ripple={{
                color: theme.ripple,
                borderless: true,
              }}
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
    borderRadius: 24,
    height: 56,
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

