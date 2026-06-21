import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export type TagStatus = 'Success' | 'Warning' | 'Error' | 'Info';

export interface TagProps {
  text: string;
  statut?: TagStatus;
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

export default function Tag({ text, statut = 'Success', style, textStyle }: TagProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const colors = getTagStyles(statut, theme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}>
      <Text
        style={[
          styles.text,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },
});
