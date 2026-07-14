import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export type TagStatus = 'Success' | 'Warning' | 'Error' | 'Info';

export interface TagProps {
  text: string;
  statut?: TagStatus;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// Map tag styles dynamically to semantic theme color tokens from Colors.ts
const getTagStyles = (statut: TagStatus, theme: any) => {
  switch (statut) {
    case 'Success':
      return {
        bg: theme.statusBgSuccessSubtle,
        border: theme.statusBgSuccess,
        text: theme.statusTextSuccess,
      };
    case 'Warning':
      return {
        bg: theme.statusBgWarningSubtle,
        border: theme.statusBgWarning,
        text: theme.statusTextWarning,
      };
    case 'Error':
      return {
        bg: theme.statusBgErrorSubtle,
        border: theme.statusBgError,
        text: theme.statusTextError,
      };
    case 'Info':
      return {
        bg: theme.statusBgInfoSubtle,
        border: theme.statusBgInfo,
        text: theme.statusTextInfo,
      };
  }
};

export default function Tag({ text, statut = 'Success', size = 'sm', icon, style, textStyle }: TagProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const colors = getTagStyles(statut, theme);

  const sizeContainerStyle = size === 'md' ? styles.containerMd : styles.containerSm;
  const sizeTextStyle = size === 'md' ? styles.textMd : styles.textSm;

  return (
    <View
      style={[
        styles.container,
        sizeContainerStyle,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          sizeTextStyle,
          {
            color: colors.text,
          },
          textStyle,
        ]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  containerMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 14,
    lineHeight: 18,
  },
});
