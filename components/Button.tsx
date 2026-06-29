import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: React.ReactNode;
  loading?: boolean;
  textStyle?: TextStyle;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    { title, variant = 'primary', icon, loading, style, textStyle, disabled, ...touchableProps },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const variantStyles = getButtonStyles(variant, theme, !!disabled);

    return (
      <TouchableOpacity
        ref={ref}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[defaultStyles.button, variantStyles.button, style]}
        {...touchableProps}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#EFEFEF' : theme.text} size="small" />
        ) : (
          <>
            {icon && <View style={defaultStyles.iconWrapper}>{icon}</View>}
            <Text style={[variantStyles.text, textStyle]}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const getButtonStyles = (
  variant: 'primary' | 'secondary' | 'text',
  theme: any,
  disabled: boolean
) => {
  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: theme.primary,
          borderColor: '#1B1B1B',
          borderWidth: 2,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
          opacity: disabled ? 0.5 : 1,
        },
        text: {
          color: '#EFEFEF',
          fontFamily: 'BricolageGrotesque-SemiBold',
          fontSize: 16,
          lineHeight: 16 * 1.5,
        },
      };
    case 'secondary':
      return {
        button: {
          backgroundColor: 'transparent',
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          opacity: disabled ? 0.5 : 1,
        },
        text: {
          color: theme.text,
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
        },
      };
    case 'text':
    default:
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          height: 36,
          opacity: disabled ? 0.5 : 1,
        },
        text: {
          color: theme.textMuted,
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
          lineHeight: 14 * 1.4,
        },
      };
  }
};

const defaultStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
