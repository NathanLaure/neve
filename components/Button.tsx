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
  variant?: 'primary' | 'secondary' | 'tertiary' | 'social' | 'text' | 'transparent';
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
          <ActivityIndicator
            color={
              variant === 'primary' || variant === 'secondary'
                ? theme.buttonTextOnBrand
                : theme.text
            }
            size="small"
          />
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
  variant: 'primary' | 'secondary' | 'tertiary' | 'social' | 'text' | 'transparent',
  theme: any,
  disabled: boolean
) => {
  if (disabled) {
    return {
      button: {
        backgroundColor: theme.buttonDisabled || theme.borderLight,
        borderColor: theme.borderDisabled || theme.border,
        borderWidth: variant === 'tertiary' || variant === 'social' ? 1 : 0,
        height: variant === 'tertiary' ? 36 : 48,
        borderRadius: variant === 'tertiary' ? 12 : 12,
        paddingHorizontal: 16,
      },
      text: {
        color: theme.buttonTextDisabled || theme.textMuted,
        fontFamily: 'BricolageGrotesque-Medium',
        fontSize: variant === 'tertiary' ? 14 : 16,
        fontWeight: '600' as const,
      },
    };
  }

  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: theme.buttonPrimary || theme.primary,
          height: 48,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 16,
          fontWeight: '600' as const,
        },
      };
    case 'secondary':
      return {
        button: {
          backgroundColor: theme.buttonSecondary || '#111111',
          height: 48,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 16,
          fontWeight: '600' as const,
        },
      };
    case 'tertiary':
      return {
        button: {
          backgroundColor: theme.buttonTertiary || theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          height: 36,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        text: {
          color: theme.text,
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
          fontWeight: '500' as const,
        },
      };
    case 'social':
      return {
        button: {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          height: 48,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        text: {
          color: theme.text,
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
          fontWeight: '500' as const,
        },
      };
    case 'transparent':
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
    width: '100%',
  },
  iconWrapper: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
