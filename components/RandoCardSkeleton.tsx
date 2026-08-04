import React from 'react';
import { StyleSheet, View } from 'react-native';

import Skeleton from '@/components/Skeleton';

export default function RandoCardSkeleton() {
  return (
    <View style={styles.wrapper}>
      <Skeleton height={230} borderRadius={16} />

      <View style={styles.contentContainer}>
        <Skeleton width="70%" height={20} borderRadius={6} />
        <Skeleton width="45%" height={14} borderRadius={6} style={{ marginTop: 8 }} />

        <View style={styles.metricsRow}>
          <Skeleton width={64} height={14} borderRadius={6} />
          <Skeleton width={40} height={14} borderRadius={6} />
          <Skeleton width={50} height={14} borderRadius={6} />
          <Skeleton width={56} height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 550,
  },
  contentContainer: {
    paddingBottom: 8,
    paddingTop: 20,
    width: '100%',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
});
