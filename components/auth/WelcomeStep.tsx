import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Button } from '@/components/Button';

interface WelcomeStepProps {
  onExplore: () => void;
}

export function WelcomeStep({ onExplore }: WelcomeStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.contentFlex, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={[styles.successIconBadge, { backgroundColor: theme.card }]}>
        <Sparkles size={48} color={theme.primary} />
      </View>

      <View style={[styles.headerTextGroup, { alignItems: 'center', marginVertical: 24 }]}>
        <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
          Votre compte est créé ! 🎉
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
          Bienvenue sur Névé. Tout est prêt pour préparer vos prochaines randonnées accessibles en train.
        </Text>
      </View>

      <Button
        title="Explorer les randonnées"
        onPress={onExplore}
        style={[styles.actionBtn, { width: '100%' }]}
      />
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
  actionBtn: {
    marginTop: 8,
  },
});
