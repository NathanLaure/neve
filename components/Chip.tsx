import React from 'react';
import { StyleSheet, Text, Pressable, View, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface ChipProps {
  text?: string;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  badgeCount?: number;
  badgePosition?: 'chip-corner' | 'icon-corner' | 'inline';
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[] | any;
  textStyle?: TextStyle | TextStyle[] | any;
}

export default function Chip({
  text,
  label,
  selected = false,
  disabled = false,
  size = 'default',
  icon,
  trailingIcon,
  badgeCount,
  badgePosition = 'chip-corner',
  onPress,
  style,
  textStyle,
}: ChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const chipLabel = label ?? text ?? '';
  const minHeight = size === 'small' ? 32 : 40;
  const borderRadius = size === 'small' ? 8 : 12;

  const defaultBgColor = disabled
    ? theme.buttonDisabled || '#222222'
    : theme.card || '#222222';

  const defaultBorderColor = disabled
    ? theme.borderDisabled || '#3D3D3D'
    : selected
    ? theme.primary || '#FA6415'
    : theme.border || '#3D3D3D';

  const defaultBorderWidth = selected ? 1.5 : 1;

  const defaultTextColor = disabled
    ? theme.buttonTextDisabled || '#525252'
    : selected
    ? colorScheme === 'dark'
      ? '#FFFFFF'
      : '#111111'
    : theme.text;

  const hasBadge = badgeCount != null && badgeCount > 0;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.container,
        {
          minHeight,
          borderRadius,
          backgroundColor: defaultBgColor,
          borderColor: defaultBorderColor,
          borderWidth: defaultBorderWidth,
        },
        style,
      ]}>
      {icon && (
        <View style={styles.iconWrapper}>
          {icon}
          {hasBadge && badgePosition === 'icon-corner' ? (
            <View style={[styles.iconBadgeOverlay, { backgroundColor: theme.primary || theme.tint }]}>
              <Text style={styles.iconBadgeText}>{badgeCount}</Text>
            </View>
          ) : null}
        </View>
      )}
      {chipLabel ? (
        <Text
          style={[
            styles.text,
            {
              color: defaultTextColor,
              fontSize: size === 'small' ? 12 : 14,
              fontWeight: selected ? '600' : '500',
            },
            textStyle,
          ]}>
          {chipLabel}
        </Text>
      ) : null}
      {hasBadge && badgePosition === 'inline' ? (
        <View style={[styles.badgePill, { backgroundColor: theme.primary || theme.tint }]}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
      {hasBadge && badgePosition === 'chip-corner' ? (
        <View style={[styles.chipCornerBadge, { backgroundColor: theme.primary || theme.tint }]}>
          <Text style={styles.chipCornerBadgeText}>{badgeCount}</Text>
        </View>
      ) : null}
      {trailingIcon && <View style={styles.trailingIconWrapper}>{trailingIcon}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBadgeOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'center',
  },
  chipCornerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
    elevation: 5,
  },
  chipCornerBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 11,
    textAlign: 'center',
  },
  trailingIconWrapper: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  text: {
    fontFamily: 'BricolageGrotesque-Medium',
  },
});


