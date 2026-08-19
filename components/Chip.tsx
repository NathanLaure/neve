import React from 'react';
import { StyleSheet, Text, Pressable, View, ViewStyle, TextStyle, Platform } from 'react-native';
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
  const minHeight = size === 'small' ? 33 : 40;
  const borderRadius = 12;
  const paddingHorizontal = size === 'small' ? 12 : 16;

  const defaultBgColor = disabled
    ? theme.buttonDisabled || '#222222'
    : theme.card || '#FFFFFF';

  const defaultBorderColor = disabled
    ? theme.borderDisabled || '#BDBDBD'
    : selected
    ? theme.primary || '#EB490B'
    : theme.borderStrong || '#989898';

  const defaultBorderWidth = selected ? 1.5 : 1;

  const defaultTextColor = disabled
    ? theme.buttonTextDisabled || '#525252'
    : selected
    ? theme.primary
    : theme.text;

  const hasBadge = badgeCount != null && badgeCount > 0;
  // Rendered outside the Pressable: the `overflow: hidden` below is what keeps
  // the Android ripple inside the rounded corners, and it would clip a badge
  // that deliberately overhangs the chip.
  const hasCornerBadge = hasBadge && badgePosition === 'chip-corner';
  const chipStyle = [
    styles.container,
    {
      minHeight,
      borderRadius,
      paddingHorizontal,
      backgroundColor: defaultBgColor,
      borderColor: defaultBorderColor,
      borderWidth: defaultBorderWidth,
      opacity: disabled ? 0.4 : 1,
      overflow: 'hidden' as const,
    },
    style,
    { overflow: 'hidden' as const },
  ];

  const chip = (
    <Pressable
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
      style={chipStyle}>
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
              fontSize: size === 'small' ? 11 : 14,
              fontFamily: 'Satoshi-Medium',
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
      {trailingIcon && <View style={styles.trailingIconWrapper}>{trailingIcon}</View>}
    </Pressable>
  );

  if (!hasCornerBadge) return chip;

  // The wrapper does not clip, so the badge may overhang the chip. It stays
  // untouchable so a tap on the overlap still reaches the Pressable underneath.
  return (
    <View style={styles.cornerBadgeAnchor}>
      {chip}
      <View
        pointerEvents="none"
        style={[styles.chipCornerBadge, { backgroundColor: theme.primary || theme.tint }]}>
        <Text style={styles.chipCornerBadgeText}>{badgeCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 6,
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
  cornerBadgeAnchor: {
    position: 'relative',
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
    minWidth: 15,
    height: 15,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
  text: {
    fontFamily: 'Satoshi-Medium',
  },
});


