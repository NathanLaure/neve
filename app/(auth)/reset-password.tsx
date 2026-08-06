import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyRound } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';
import { Button } from '@/components/Button';
import { showToast } from '@/utils/toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { updateUserPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isPasswordValid) {
      showToast.error(
        'Mot de passe non conforme',
        'Veuillez respecter l’ensemble des règles indiquées.'
      );
      return;
    }

    setIsLoading(true);
    const { error } = await updateUserPassword(password);
    setIsLoading(false);

    if (error) {
      showToast.error('Erreur de réinitialisation', error);
    } else {
      showToast.success(
        'Mot de passe mis à jour ! 🔒',
        'Votre nouveau mot de passe a bien été enregistré. Bienvenue !'
      );
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 32, 60),
            paddingBottom: Math.max(insets.bottom + 16, 34),
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.contentFlex}>
          <View style={styles.iconBadgeWrapper}>
            <View style={[styles.iconBadge, { backgroundColor: theme.card }]}>
              <KeyRound size={44} color={theme.primary} />
            </View>
          </View>

          <View style={styles.headerTextGroup}>
            <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
              Nouveau mot de passe
            </Text>
            <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
              Saisissez votre nouveau mot de passe ci-dessous pour sécuriser votre compte Névé.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              showRules
              onValidationChange={setIsPasswordValid}
            />
          </View>

          <View style={styles.bottomStickyBlock}>
            <Button
              title="Mettre à jour le mot de passe"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!isPasswordValid}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  contentFlex: {
    flex: 1,
    gap: 20,
  },
  iconBadgeWrapper: {
    alignItems: 'center',
    marginTop: 20,
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
});
