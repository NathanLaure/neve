import React, { forwardRef } from 'react';
import { Info } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export const HeaderButton = forwardRef<typeof Pressable, { onPress?: () => void }>(
  ({ onPress }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
      <Pressable
        onPress={onPress}
        android_ripple={{
          color: theme.ripple,
          borderless: true,
        }}
        style={styles.headerRight}>
        <Info size={25} color={theme.textMuted} />
      </Pressable>
    );
  }
);

HeaderButton.displayName = 'HeaderButton';

export const styles = StyleSheet.create({
  headerRight: {
    marginRight: 15,
  },
});
