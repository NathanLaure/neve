import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import SettingsPage from '@/components/profile/SettingsPage';

interface SoftwareLicense {
  name: string;
  url: string;
  license: string;
}

const LICENSES: SoftwareLicense[] = [
  {
    name: 'React Native by Meta Platforms, Inc.',
    url: 'https://github.com/facebook/react-native',
    license: 'MIT License',
  },
  {
    name: 'Expo by 650 Industries, Inc.',
    url: 'https://github.com/expo/expo',
    license: 'MIT License',
  },
  {
    name: 'RNMapbox by Mapbox & Contributors',
    url: 'https://github.com/rnmapbox/maps',
    license: 'MIT License',
  },
  {
    name: 'Supabase JS by Supabase, Inc.',
    url: 'https://github.com/supabase/supabase-js',
    license: 'MIT License',
  },
  {
    name: 'React Native Reanimated by Software Mansion',
    url: 'https://github.com/software-mansion/react-native-reanimated',
    license: 'MIT License',
  },
  {
    name: 'React Native Gesture Handler by Software Mansion',
    url: 'https://github.com/software-mansion/react-native-gesture-handler',
    license: 'MIT License',
  },
  {
    name: 'React Native Screens by Software Mansion',
    url: 'https://github.com/software-mansion/react-native-screens',
    license: 'MIT License',
  },
  {
    name: 'Gorhom Bottom Sheet by Mo Gorhom',
    url: 'https://github.com/gorhom/react-native-bottom-sheet',
    license: 'MIT License',
  },
  {
    name: 'Lucide Icons by Lucide Project Authors',
    url: 'https://github.com/lucide-icons/lucide',
    license: 'ISC License',
  },
  {
    name: 'AsyncStorage by React Native Community',
    url: 'https://github.com/react-native-async-storage/async-storage',
    license: 'MIT License',
  },
  {
    name: 'React Native SVG by Software Mansion',
    url: 'https://github.com/software-mansion/react-native-svg',
    license: 'MIT License',
  },
  {
    name: 'OpenStreetMap Contributors',
    url: 'https://www.openstreetmap.org/copyright',
    license: 'Open Database License (ODbL) 1.0',
  },
];

export default function SoftwareLicensesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <SettingsPage title="Licences logicielles">
      <View style={styles.list}>
        {LICENSES.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => Linking.openURL(item.url)}
            android_ripple={{ color: theme.ripple, borderless: false }}
            style={[
              styles.item,
              {
                borderBottomColor: theme.borderLight,
                borderBottomWidth: index < LICENSES.length - 1 ? 1 : 0,
              },
            ]}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.url, { color: theme.textMuted }]}>{item.url}</Text>
            <Text style={[styles.license, { color: theme.textMuted }]}>{item.license}</Text>
          </Pressable>
        ))}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  item: {
    paddingVertical: 14,
    gap: 3,
  },
  name: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  url: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  license: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
