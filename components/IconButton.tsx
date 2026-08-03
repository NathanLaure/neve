import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Animated,
  StyleProp,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  variant?: 'plain' | 'circle' | 'square';
  badgeCount?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle> | any;
}

export const IconButton = forwardRef<View, IconButtonProps>(
  (
    {
      icon,
      variant = 'plain',
      badgeCount = 0,
      animated = false,
      style,
      disabled,
      onPress,
      ...pressableProps
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [isPressed, setIsPressed] = useState(false);

    const Component = animated ? AnimatedPressable : Pressable;

    // Build default variant styles
    const getVariantStyle = () => {
      if (disabled) {
        return [
          variant === 'circle' ? styles.circleButton : variant === 'square' ? styles.squareButton : styles.plainButton,
          {
            backgroundColor: variant === 'plain' ? 'transparent' : theme.buttonDisabled || '#222222',
            borderColor: 'transparent',
            opacity: 0.6,
          },
        ];
      }

      switch (variant) {
        case 'circle':
          return [
            styles.circleButton,
            {
              backgroundColor: theme.card,
              shadowColor: '#000',
              opacity: 1,
            },
          ];
        case 'square':
          return [
            styles.squareButton,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: 1,
            },
          ];
        case 'plain':
        default:
          return [
            styles.plainButton,
            {
              opacity: 1,
            },
          ];
      }
    };

    // Auto-apply icon color for circle/square variants to contrast with buttonBgIcon
    const renderIcon = () => {
      if (!icon) return null;
      if ((variant === 'circle' || variant === 'square') && React.isValidElement(icon)) {
        const iconColor = disabled
          ? (theme.buttonTextDisabled || '#7C7C7C')
          : theme.text;
        // Only override if the icon doesn't already have a custom fill (e.g. Heart favorite)
        const existingColor = (icon.props as any)?.color;
        const existingFill = (icon.props as any)?.fill;
        const hasCustomFill = existingFill && existingFill !== 'none';
        return React.cloneElement(icon as React.ReactElement<any>, {
          color: hasCustomFill ? existingColor : iconColor,
        });
      }
      return icon;
    };

    return (
      <Component
        ref={ref as any}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[
          getVariantStyle(),
          style,
          isPressed && !animated && styles.pressed,
        ]}
        {...pressableProps}>
        <View style={styles.contentWrapper}>
          {renderIcon()}
          {badgeCount > 0 && (
            <View style={[styles.badgeContainer, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>
      </Component>
    );
  }
);

IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  plainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
