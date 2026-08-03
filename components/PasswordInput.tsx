import React, { forwardRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Input, InputProps } from '@/components/Input';

export interface PasswordInputProps extends Omit<InputProps, 'isPassword'> {
  showRules?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  (
    {
      value = '',
      onChangeText,
      showRules = false,
      onValidationChange,
      ...inputProps
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const hasMinLength = value.length >= 8;
    const hasLowercase = /[a-z]/.test(value);
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^a-zA-Z0-9]/.test(value);
    const isValid = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol;

    useEffect(() => {
      if (onValidationChange) {
        onValidationChange(isValid);
      }
    }, [isValid, onValidationChange]);

    return (
      <View style={styles.wrapper}>
        <Input
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          isPassword
          isSuccess={isValid}
          variant="outlined"
          label="Mot de passe"
          placeholder="Tapez votre mot de passe"
          autoComplete="password-new"
          textContentType="newPassword"
          importantForAutofill="yes"
          {...inputProps}
        />

      {showRules ? (
        <View style={styles.passwordRulesList}>
          <View style={styles.ruleItemRow}>
            <Check
              size={16}
              color={hasMinLength ? theme.statusBgSuccess : theme.textMuted}
            />
            <Text
              style={[
                styles.ruleText,
                { color: hasMinLength ? theme.text : theme.textMuted },
              ]}>
              Au moins 8 caractères
            </Text>
          </View>

          <View style={styles.ruleItemRow}>
            <Check
              size={16}
              color={hasLowercase ? theme.statusBgSuccess : theme.textMuted}
            />
            <Text
              style={[
                styles.ruleText,
                { color: hasLowercase ? theme.text : theme.textMuted },
              ]}>
              Au moins une lettre minuscule
            </Text>
          </View>

          <View style={styles.ruleItemRow}>
            <Check
              size={16}
              color={hasUppercase ? theme.statusBgSuccess : theme.textMuted}
            />
            <Text
              style={[
                styles.ruleText,
                { color: hasUppercase ? theme.text : theme.textMuted },
              ]}>
              Au moins une lettre majuscule
            </Text>
          </View>

          <View style={styles.ruleItemRow}>
            <Check
              size={16}
              color={hasNumber ? theme.statusBgSuccess : theme.textMuted}
            />
            <Text
              style={[
                styles.ruleText,
                { color: hasNumber ? theme.text : theme.textMuted },
              ]}>
              Au moins un chiffre
            </Text>
          </View>

          <View style={styles.ruleItemRow}>
            <Check
              size={16}
              color={hasSymbol ? theme.statusBgSuccess : theme.textMuted}
            />
            <Text
              style={[
                styles.ruleText,
                { color: hasSymbol ? theme.text : theme.textMuted },
              ]}>
              Au moins un caractère spécial (@, !, #, ?, etc.)
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
);

PasswordInput.displayName = 'PasswordInput';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 4,
  },
  passwordRulesList: {
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  ruleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
});
