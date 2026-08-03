import React, { useRef } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input } from '@/components/Input';
import { PasswordInput } from '@/components/PasswordInput';
import { Button } from '@/components/Button';
import { showToast } from '@/utils/toast';

interface SignupPasswordStepProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isPasswordValid: boolean;
  setIsPasswordValid: (valid: boolean) => void;
  onNext: () => void;
}

export function SignupPasswordStep({
  email,
  setEmail,
  password,
  setPassword,
  isPasswordValid,
  setIsPasswordValid,
  onNext,
}: SignupPasswordStepProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const passwordRef = useRef<TextInput>(null);

  const isEmailValid = email.trim().length >= 5 && email.includes('@') && email.includes('.');
  const canContinue = isEmailValid && isPasswordValid;

  const handleContinue = () => {
    if (!canContinue) {
      showToast.error(
        'Formulaire incomplet',
        'Veuillez renseigner une adresse e-mail valide et un mot de passe conforme.'
      );
      return;
    }
    onNext();
  };

  return (
    <View style={styles.contentFlex}>
      <View style={styles.headerTextGroup}>
        <Text style={[styles.headingTitle, { color: theme.text }]}>
          Créer un nouveau compte
        </Text>
        <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
          C’est votre première fois ici ? Créez un nouveau compte pour continuer.
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Input
          variant="outlined"
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onClear={() => setEmail('')}
        />

        <PasswordInput
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          showRules
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          onValidationChange={setIsPasswordValid}
        />
      </View>

      {/* Bottom Sticky Action Block */}
      <View style={styles.bottomStickyBlock}>
        <Button
          title="Continuer"
          variant="secondary"
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentFlex: {
    flex: 1,
    gap: 20,
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
});
