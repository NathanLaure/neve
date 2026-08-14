import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  PressableProps,
  View,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
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

    const getRippleColor = () => {
      if (variant === 'primary' || variant === 'tertiary') {
        return theme.rippleOnBrand;
      }
      if (variant === 'secondary') {
        return activeColorScheme === 'dark' ? 'rgba(0, 0, 0, 0.15)' : theme.rippleOnBrand;
      }
      return theme.ripple;
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
      { overflow: 'hidden' as const },
      style,
    ];

    return (
      <Pressable
        ref={ref}
        disabled={disabled || loading}
        android_ripple={
          disabled || loading
            ? undefined
            : {
                color: getRippleColor(),
                borderless: false,
                foreground: true,
              }
        }
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={buttonStyle}
        {...touchableProps}>
        {loading ? (
          <ActivityIndicator color={getIconColor()} size="small" />
        ) : isIconOnlyMode ? (
          <View style={defaultStyles.centeredIconWrapper}>{renderIcon()}</View>
        ) : (
          <>
            {icon && <View style={defaultStyles.iconWrapper}>{renderIcon()}</View>}
            {title ? <Text style={[variantStyles.text, textStyle]}>{title}</Text> : null}
          </>
        )}
      </Pressable>
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
        fontFamily: 'BricolageGrotesque-Medium',
        fontSize: variant === 'tertiary' || size === 'small' ? 14 : 16,
        fontWeight: '600' as const,
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
          paddingVertical: size === 'small' ? 8 : 12,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: size === 'small' ? 14 : 16,
          fontWeight: '600' as const,
        },
      };

    case 'secondary':
      return {
        button: {
          backgroundColor: theme.buttonSecondary || '#EFEFEF',
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
          paddingVertical: size === 'small' ? 8 : 12,
        },
        text: {
          color: theme.buttonSecondaryText || '#111111',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: size === 'small' ? 14 : 16,
          fontWeight: '600' as const,
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
          paddingVertical: size === 'small' ? 8 : 12,
        },
        text: {
          color: theme.text,
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: size === 'small' ? 14 : 16,
          fontWeight: '600' as const,
        },
      };

    case 'tertiary':
      return {
        button: {
          backgroundColor: theme.buttonTertiary || theme.primary,
          borderRadius,
          height: size === 'small' ? 32 : 40,
          paddingHorizontal: size === 'small' ? 12 : 16,
          paddingVertical: size === 'small' ? 6 : 8,
        },
        text: {
          color: theme.buttonTextOnBrand || '#FFFFFF',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
          fontWeight: '500' as const,
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
          backgroundColor: theme.background,
          height: size === 'small' ? 36 : 48,
          borderRadius,
          paddingHorizontal: size === 'small' ? 16 : 24,
          paddingVertical: size === 'small' ? 8 : 12,
        },
        text: {
          color: theme.text || '#FFFFFF',
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: size === 'small' ? 14 : 16,
          fontWeight: '600' as const,
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

