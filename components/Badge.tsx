import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export type BadgeVariant = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Le texte ou chiffre du badge */
  count?: number | string;
  /** Variantes sémantiques de couleur */
  variant?: BadgeVariant;
  /** Taille du badge */
  size?: BadgeSize;
  /** Styles personnalisés du conteneur */
  style?: ViewStyle;
  /** Styles personnalisés du texte */
  textStyle?: TextStyle;
  /** Couleur d'arrière-plan explicite si différente des variantes */
  backgroundColor?: string;
  /** Couleur du texte explicite si différente des variantes */
  textColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  variant = 'primary',
  size = 'sm',
  style,
  textStyle,
  backgroundColor,
  textColor,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          bg: theme.statusBgError,
          text: '#FFFFFF',
        };
      case 'warning':
        return {
          bg: theme.statusBgWarning,
          text: '#FFFFFF',
        };
      case 'success':
        return {
          bg: theme.statusBgSuccess,
          text: '#FFFFFF',
        };
      case 'info':
        return {
          bg: theme.statusBgInfo,
          text: '#FFFFFF',
        };
      case 'secondary':
        return {
          bg: theme.surfaceSecondary,
          text: theme.text,
        };
      case 'primary':
      default:
        return {
          bg: theme.primary,
          text: '#FFFFFF',
        };
    }
  };

  const defaultColors = getVariantStyles();
  const finalBg = backgroundColor || defaultColors.bg;
  const finalText = textColor || defaultColors.text;

  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.badge,
        isMd ? styles.badgeMd : styles.badgeSm,
        { backgroundColor: finalBg },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          isMd ? styles.textMd : styles.textSm,
          { color: finalText },
          textStyle,
        ]}>
        {count}
      </Text>
    </View>
  );
};

export default Badge;

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    minWidth: 18,
    minHeight: 18,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 22,
    minHeight: 22,
  },
  text: {
    fontFamily: 'Satoshi_Variable',
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 10,
    lineHeight: 13,
  },
  textMd: {
    fontSize: 12,
    lineHeight: 15,
  },
});
