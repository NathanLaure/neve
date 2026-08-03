import React from 'react';
import { StyleSheet, Text, View, Platform, Linking } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { NeveLogo } from '@/components/NeveLogo';
import { SocialIcon } from '@/components/SocialIcon';

interface AuthEntryStepProps {
  email: string;
  setEmail: (email: string) => void;
  onContinue: () => void;
  onOAuth: (provider: 'google' | 'apple' | 'facebook') => void;
  isLoading: boolean;
}

export function AuthEntryStep({
  email,
  setEmail,
  onContinue,
  onOAuth,
  isLoading,
}: AuthEntryStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isEmailValid = email.trim().length >= 5 && email.includes('@') && email.includes('.');

  return (
    <View style={styles.contentFlex}>
      {/* Header Névé Official Logo */}
      <View style={styles.logoRow}>
        <NeveLogo variant="icon" size={64} color={theme.text} />
      </View>

      {/* Title & Input Block */}
      <View style={styles.mainBlock}>
        <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
          Commencez avec votre mail
        </Text>

        <View style={styles.formGroup}>
          <Input
            variant="outlined"
            label="Adresse e-mail"
            placeholder="Entrer votre email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={onContinue}
            onClear={() => setEmail('')}
          />

          <Button
            title="Continuer"
            onPress={onContinue}
            loading={isLoading}
            disabled={!isEmailValid}
            style={styles.actionBtn}
          />
        </View>

        {/* Divider: "ou" */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>ou</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Social Auth Buttons */}
        <View style={styles.socialButtonsGroup}>
          {Platform.OS === 'ios' ? (
            <Button
              title="Continuer avec Apple"
              variant="social"
              icon={<SocialIcon provider="apple" size={20} />}
              onPress={() => onOAuth('apple')}
            />
          ) : null}
          <Button
            title="Continuer avec Google"
            variant="social"
            icon={<SocialIcon provider="google" size={20} />}
            onPress={() => onOAuth('google')}
          />
          <Button
            title="Continuer avec Facebook"
            variant="social"
            icon={<SocialIcon provider="facebook" size={20} />}
            onPress={() => onOAuth('facebook')}
          />
        </View>
      </View>

      {/* Terms & Conditions Footer Disclaimer */}
      <View style={styles.footerLegal}>
        <Text style={[styles.legalText, { color: theme.textMuted }]}>
          En continuant, vous acceptez nos{' '}
          <Text
            onPress={() => Linking.openURL('https://neve-rando.fr/terms')}
            style={[styles.legalLink, { color: theme.text }]}>
            Conditions d’utilisation
          </Text>{' '}
          et nous considérons que vous avez lu et accepté notre{' '}
          <Text
            onPress={() => Linking.openURL('https://neve-rando.fr/privacy')}
            style={[styles.legalLink, { color: theme.text }]}>
            Politique de confidentialité
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 20,
  },
  logoRow: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  mainBlock: {
    gap: 20,
  },
  headingTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  formGroup: {
    gap: 14,
    marginVertical: 8,
  },
  actionBtn: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  socialButtonsGroup: {
    gap: 10,
  },
  footerLegal: {
    marginTop: 'auto',
    paddingVertical: 12,
    alignItems: 'center',
  },
  legalText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
});
