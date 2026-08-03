import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';

interface NotificationStepProps {
  onRequestNotifications: () => void;
  onSkip: () => void;
}

export function NotificationStep({
  onRequestNotifications,
  onSkip,
}: NotificationStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.contentFlex}>
      {/* Placeholder Image / Icon Box */}
      <View style={[styles.placeholderBox, { backgroundColor: theme.card }]}>
        <Bell size={48} color={theme.primary} />
      </View>

      {/* Left-Aligned Header Text Group */}
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Activer les notifications
        </Text>

        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          Soyez toujours mis au courant en premier des nouvelles randonnées disponibles proche de chez vous, recevez des suggestions d’évasions et plus encore en activant les notifications.
        </Text>

        <Text style={[styles.noteText, { color: theme.textMuted }]}>
          Vous pouvez changer ce paramètre à tout moment.
        </Text>
      </View>

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <Button
          variant="primary"
          title="Activer les notifications"
          onPress={onRequestNotifications}
          style={styles.actionBtn}
        />

        <Button
          variant="transparent"
          title="Plus tard"
          onPress={onSkip}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 16,
    paddingTop: 60,
  },
  placeholderBox: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  headerTextGroup: {
    gap: 12,
    marginTop: 4,
  },
  headingTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  headingSubtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  noteText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  bottomStickyBlock: {
    marginTop: 'auto',
    gap: 12,
    paddingTop: 12,
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  },
  skipBtn: {
    paddingVertical: 8,
    alignSelf: 'center',
  },
  skipText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
