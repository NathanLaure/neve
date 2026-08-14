import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Mail } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';

interface NewsletterStepProps {
  onChoice: (accepted: boolean) => void;
}

export function NewsletterStep({ onChoice }: NewsletterStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.contentFlex, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={[styles.successIconBadge, { backgroundColor: theme.card }]}>
        <Mail size={48} color={theme.primary} />
      </View>

      <View style={[styles.headerTextGroup, { alignItems: 'center', marginVertical: 24 }]}>
        <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
          Restez inspirés chaque semaine !
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
          Recevez nos plus belles idées de randonnées secrètes et nos pépites accessibles en train directement dans votre boîte mail.
        </Text>
      </View>

      <View style={[styles.formGroup, { width: '100%' }]}>
        <Button
          title="Oui, recevoir les pépites 🏔️"
          onPress={() => onChoice(true)}
          style={styles.actionBtn}
        />

        <Pressable
          onPress={() => onChoice(false)}
          android_ripple={{
            color: theme.ripple,
            borderless: true,
          }}
          style={{ marginTop: 8, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }}>
          <Text style={[styles.legalLink, { color: theme.textMuted, fontSize: 14 }]}>
            Non merci, pas maintenant
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 20,
  },
  successIconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  headerTextGroup: {
    gap: 10,
    marginVertical: 8,
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
  formGroup: {
    gap: 14,
    marginVertical: 8,
  },
  actionBtn: {
    marginTop: 8,
  },
  legalLink: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
});
