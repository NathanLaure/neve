import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

interface ForgotPassStepProps {
  email: string;
  setEmail: (email: string) => void;
  onSubmit: () => void;
  onBackToLogin: () => void;
  isLoading: boolean;
}

export function ForgotPassStep({
  email,
  setEmail,
  onSubmit,
  onBackToLogin,
  isLoading,
}: ForgotPassStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isEmailValid = email.trim().length >= 5 && email.includes('@') && email.includes('.');

  return (
    <View style={styles.contentFlex}>
      <View style={styles.iconBadgeWrapper}>
        <View style={[styles.iconBadge, { backgroundColor: theme.card }]}>
          <KeyRound size={44} color={theme.primary} />
        </View>
      </View>

      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
          Mot de passe oublié
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
          Entrez l’adresse e-mail associée à votre compte Névé pour recevoir votre lien de réinitialisation.
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Input
          variant="outlined"
          label="Adresse e-mail"
          placeholder="votre.email@exemple.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          onClear={() => setEmail('')}
        />
      </View>

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <Button
          title="Envoyer le lien de réinitialisation"
          onPress={onSubmit}
          loading={isLoading}
          disabled={!isEmailValid}
          style={styles.actionBtn}
        />

        <Pressable
          onPress={onBackToLogin}
          style={{ marginTop: 8, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={[styles.legalLink, { color: theme.textMuted, fontSize: 14 }]}>
            Retour à la connexion
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
  iconBadgeWrapper: {
    alignItems: 'center',
    marginTop: 16,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  bottomStickyBlock: {
    marginTop: 'auto',
    gap: 14,
    paddingTop: 12,
  },
  actionBtn: {
    marginTop: 8,
  },
  legalLink: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
});
