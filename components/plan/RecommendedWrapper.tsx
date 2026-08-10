import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface RecommendedWrapperProps {
  children: React.ReactNode;
}

export const RecommendedWrapper: React.FC<RecommendedWrapperProps> = ({ children }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.brand }]}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <Info size={16} color="#FFFFFF" />
        <Text style={styles.bannerText}>Trajet recommandé</Text>
      </View>
      {/* Wrapped Content */}
      <View style={styles.contentContainer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginVertical: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  bannerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  contentContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
