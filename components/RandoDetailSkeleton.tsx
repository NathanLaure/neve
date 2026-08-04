import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IconButton } from '@/components/IconButton';
import Skeleton from '@/components/Skeleton';

export default function RandoDetailSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Skeleton height={400} borderRadius={0} />

      <View
        style={[styles.headerOverlay, { top: 0, paddingTop: insets.top + 8 }]}
        pointerEvents="box-none">
        <IconButton
          variant="circle"
          icon={<ArrowLeft size={20} color={theme.text} />}
          onPress={() => router.back()}
        />
      </View>

      <View style={styles.body}>
        <Skeleton width="40%" height={22} borderRadius={6} />
        <Skeleton width="80%" height={28} borderRadius={6} style={{ marginTop: 16 }} />
        <Skeleton width="55%" height={16} borderRadius={6} style={{ marginTop: 10 }} />

        <View style={styles.specsRow}>
          <Skeleton width={64} height={36} borderRadius={6} />
          <Skeleton width={64} height={36} borderRadius={6} />
          <Skeleton width={64} height={36} borderRadius={6} />
        </View>

        <Skeleton width="35%" height={20} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton height={220} borderRadius={16} style={{ marginTop: 16 }} />

        <Skeleton width="45%" height={20} borderRadius={6} style={{ marginTop: 40 }} />
        <Skeleton height={160} borderRadius={8} style={{ marginTop: 16 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    width: '100%',
  },
});
