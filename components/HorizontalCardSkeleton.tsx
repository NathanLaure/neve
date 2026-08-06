import React from 'react';
import { StyleSheet, View } from 'react-native';

import Skeleton from '@/components/Skeleton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface HorizontalCardSkeletonProps {
  width?: number;
}

export default function HorizontalCardSkeleton({ width = 320 }: HorizontalCardSkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { width, backgroundColor: theme.background }]}>
      {/* Image placeholder */}
      <Skeleton width={88} height={120} borderRadius={0} style={styles.image} />
      {/* Content placeholder */}
      <View style={styles.content}>
        <Skeleton width="80%" height={16} borderRadius={6} />
        <Skeleton width="55%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        <View style={styles.metaRow}>
          <Skeleton width={48} height={12} borderRadius={4} />
          <Skeleton width={36} height={12} borderRadius={4} />
          <Skeleton width={44} height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    gap: 12,
  },
  image: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  content: {
    flex: 1,
    paddingRight: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
});
