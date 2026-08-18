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

    /**
     * Couleur d'icône par défaut sur les variants pleins, pour contraster avec le
     * fond du bouton.
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

    const badge = badgeCount > 0 ? (
      <View
        pointerEvents="none"
        style={[
          styles.badgeContainer,
          {
            backgroundColor: theme.primary,
            borderColor: theme.background,
          },
        ]}>
        <Text style={styles.badgeText}>{badgeCount}</Text>
      </View>
    ) : null;

    // Variante `plain` : bouton plat et compact
    if (variant === 'plain') {
      const PlainComponent = animated ? AnimatedPressable : Pressable;
      return (
        <View style={[styles.plainWrapper, style]}>
          <PlainComponent
            ref={ref as any}
            accessibilityRole="button"
            disabled={disabled}
            onPress={onPress}
            android_ripple={
              disabled
                ? undefined
                : {
                    color: theme.ripple,
                    borderless: false,
                    foreground: true,
                  }
            }
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            style={[
              styles.plainButton,
              { opacity: disabled ? 0.6 : 1 },
              isPressed && !animated && Platform.OS === 'ios' && styles.pressed,
            ]}
            {...pressableProps}>
            {renderIcon()}
          </PlainComponent>
          {badge}
        </View>
      );
    }

    // Variantes `circle` et `square` : architecture bi-couche
    // Conteneur externe -> porte le fond, le rayon, l'ombre et le badge (non clippé)
    // Pressable interne -> porte le découpage overflow: 'hidden' pour confiner le ripple Android
    const ContainerComponent = animated ? Animated.View : View;
    const isCircle = variant === 'circle';

    const containerStyle = [
      isCircle ? styles.circleContainer : styles.squareContainer,
      {
        backgroundColor: disabled
          ? theme.buttonDisabled || '#222222'
          : theme.card,
        borderColor: isCircle ? 'transparent' : theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.08,
        shadowRadius: isCircle ? 6 : 4,
        elevation: isCircle ? 3 : 2,
        opacity: disabled ? 0.6 : 1,
      },
      style,
    ];

    const innerStyle = [
      styles.innerPressable,
      { borderRadius: isCircle ? 100 : 12 },
      isPressed && !animated && Platform.OS === 'ios' && styles.pressed,
    ];

    return (
      <ContainerComponent ref={ref as any} style={containerStyle}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          android_ripple={
            disabled
              ? undefined
              : {
                  color: theme.ripple,
                  borderless: false,
                  foreground: true,
                }
          }
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={innerStyle}
          {...pressableProps}>
          {renderIcon()}
        </Pressable>
        {badge}
      </ContainerComponent>
    );
  }
);

IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  plainWrapper: {
    position: 'relative',
  },
  plainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 100,
    overflow: 'hidden',
  },
  circleContainer: {
    width: 40,
    height: 40,
    borderRadius: 100,
    position: 'relative',
  },
  squareContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  innerPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeContainer: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
