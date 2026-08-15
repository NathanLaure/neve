import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'social' | 'text' | 'transparent' | 'icon' | 'outlined';
  shape?: 'default' | 'round';
  size?: 'default' | 'small';
  iconOnly?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  textStyle?: TextStyle;
  colorScheme?: 'light' | 'dark';
  style?: any;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      title,
      variant = 'primary',
      shape = 'default',
      size = 'default',
      iconOnly = false,
      icon,
      loading,
      style,
      textStyle,
      disabled,
      colorScheme: customColorScheme,
      onPress,
      ...touchableProps
    },
    ref
  ) => {
    const systemColorScheme = useColorScheme() ?? 'light';
    const activeColorScheme = customColorScheme ?? systemColorScheme;
    const theme = Colors[activeColorScheme];

    const isIconOnlyMode = iconOnly || (!!icon && !title);
    const variantStyles = getButtonStyles(variant, shape, size, isIconOnlyMode, theme, !!disabled);

    const getIconColor = () => {
      if (disabled) return theme.buttonTextDisabled || '#7C7C7C';
      if (variant === 'primary' || variant === 'tertiary') return theme.buttonTextOnBrand || '#FFFFFF';
      if (variant === 'secondary') return theme.buttonSecondaryText || '#111111';
      return theme.text;
    };

    const renderIcon = () => {
      if (!icon) return null;
      if (React.isValidElement(icon)) {
        return React.cloneElement(icon as React.ReactElement<any>, {
          color: disabled ? getIconColor() : (icon.props as any)?.color ?? getIconColor(),
        });
      }
      return icon;
    };

    const buttonStyle = [
      defaultStyles.button,
      isIconOnlyMode && defaultStyles.iconOnlyContainer,
      variantStyles.button,
      style,
    ];

    return (
      <TouchableOpacity
        ref={ref}
        disabled={disabled || loading}
        activeOpacity={0.8}
        delayPressIn={0}
        onPress={disabled || loading ? undefined : onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={buttonStyle}
        {...touchableProps}>
        {loading ? (
          <ActivityIndicator color={getIconColor()} size="small" />
        ) : isIconOnlyMode ? (
          <View style={defaultStyles.centeredIconWrapper}>{renderIcon()}</View>
        ) : (
          <View style={defaultStyles.contentRow}>
            {icon ? <View style={defaultStyles.iconWrapper}>{renderIcon()}</View> : null}
            {title ? (
              <Text style={[variantStyles.text, textStyle]}>
                {title}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const getButtonStyles = (
  variant: 'primary' | 'secondary' | 'tertiary' | 'social' | 'text' | 'transparent' | 'icon' | 'outlined',
  shape: 'default' | 'round',
  size: 'default' | 'small',
  iconOnly: boolean,
  theme: any,
  disabled: boolean
) => {
  const borderRadius = shape === 'round' ? 100 : size === 'small' ? 8 : 12;

  if (disabled) {
    const disabledHeight = iconOnly
      ? size === 'small'
        ? 32
        : 48
      : variant === 'tertiary' || size === 'small'
      ? 40
      : 48;

    return {
      button: {
        backgroundColor: theme.buttonDisabled || '#222222',
        borderColor: 'transparent',
        borderWidth: 0,
        height: disabledHeight,
        width: iconOnly ? disabledHeight : undefined,
        borderRadius,
        paddingHorizontal: iconOnly ? 0 : size === 'small' ? 12 : 24,
      },
      text: {
        color: theme.buttonTextDisabled || '#7C7C7C',
        fontFamily: 'Satoshi-Bold',
        fontSize: variant === 'tertiary' || size === 'small' ? 14 : 16,
        includeFontPadding: false,
      },
    };
  }

  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: theme.buttonPrimary || theme.primary,
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'Satoshi-Bold',
          fontSize: size === 'small' ? 14 : 16,
          includeFontPadding: false,
        },
      };

    case 'secondary':
      return {
        button: {
          backgroundColor: theme.buttonSecondary || '#EFEFEF',
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
        },
        text: {
          color: theme.buttonSecondaryText || '#111111',
          fontFamily: 'Satoshi-Bold',
          fontSize: size === 'small' ? 14 : 16,
          includeFontPadding: false,
        },
      };

    case 'outlined':
      return {
        button: {
          backgroundColor: 'transparent',
          borderColor: theme.border,
          borderWidth: 1,
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
        },
        text: {
          color: theme.text,
          fontFamily: 'Satoshi-Bold',
          fontSize: size === 'small' ? 14 : 16,
          includeFontPadding: false,
        },
      };

    case 'tertiary':
      return {
        button: {
          backgroundColor: theme.buttonTertiary || theme.primary,
          borderRadius,
          height: size === 'small' ? 32 : 40,
          paddingHorizontal: size === 'small' ? 12 : 16,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'Satoshi-Bold',
          fontSize: 14,
          includeFontPadding: false,
        },
      };

    case 'icon':
      const iconSize = size === 'small' ? 32 : 48;
      return {
        button: {
          backgroundColor: theme.buttonBgIcon || theme.card,
          height: iconSize,
          width: iconSize,
          borderRadius: shape === 'round' ? 100 : 12,
          paddingHorizontal: 0,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
        text: {
          color: theme.text,
          fontSize: 14,
          includeFontPadding: false,
        },
      };

    case 'social':
      return {
        button: {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius,
          height: 48,
          paddingHorizontal: 16,
        },
        text: {
          color: theme.text,
          fontFamily: 'Satoshi-Bold',
          fontSize: 14,
          includeFontPadding: false,
        },
      };

    case 'transparent':
    case 'text':
    default:
      return {
        button: {
          backgroundColor: theme.background,
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
        },
        text: {
          color: theme.text || '#FFFFFF',
          fontFamily: 'Satoshi-Bold',
          fontSize: size === 'small' ? 14 : 16,
          includeFontPadding: false,
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyContainer: {
    width: undefined,
    alignSelf: 'auto',
  },
  iconWrapper: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

