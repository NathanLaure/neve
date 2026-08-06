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

    /**
     * Couleur d'icône par défaut sur les variants pleins, pour contraster avec le
     * fond du bouton.
     *
     * Une couleur passée explicitement l'emporte : c'est ce qui permet de
     * réutiliser le même bouton sur un fond clair (écran de planification) comme
     * sur un fond sombre. Auparavant `color` n'était respecté qu'en présence d'un
     * `fill`, donc toujours écrasé en pratique.
     */
    const renderIcon = () => {
      if (!icon) return null;
      if ((variant === 'circle' || variant === 'square') && React.isValidElement(icon)) {
        const existingColor = (icon.props as any)?.color;
        if (existingColor) return icon;

        return React.cloneElement(icon as React.ReactElement<any>, {
          color: disabled ? theme.buttonTextDisabled || '#7C7C7C' : theme.text,
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
