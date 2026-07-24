import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Globe, Apple } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { signIn, signInWithOAuth, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }
    setErrorMsg('');

    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrorMsg(error.message || 'Identifiants incorrects. Veuillez réessayer.');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setErrorMsg('');
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setErrorMsg(error.message || `Connexion ${provider} indisponible.`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.card }]}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>

        {/* Title Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Connexion</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Bienvenue à nouveau ! Connectez-vous pour retrouver vos parcours et favoris.
          </Text>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={[styles.errorBox, { backgroundColor: theme.statusBgErrorSubtle, borderColor: theme.statusBgError }]}>
            <Text style={[styles.errorText, { color: theme.statusTextError }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Social Auth Buttons */}
        <View style={styles.socialButtonsRow}>
          <Pressable
            onPress={() => handleOAuth('google')}
            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Globe size={20} color={theme.text} />
            <Text style={[styles.socialBtnText, { color: theme.text }]}>Google</Text>
          </Pressable>

          <Pressable
            onPress={() => handleOAuth('apple')}
            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Apple size={20} color={theme.text} />
            <Text style={[styles.socialBtnText, { color: theme.text }]}>Apple</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>ou par email</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Adresse email</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Mail size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="votre.email@exemple.fr"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Mot de passe</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Lock size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••••••"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? (
                  <EyeOff size={20} color={theme.textMuted} />
                ) : (
                  <Eye size={20} color={theme.textMuted} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <Button
          title={isLoading ? 'Connexion en cours...' : 'Se connecter'}
          variant="primary"
          onPress={handleLogin}
          disabled={isLoading}
          style={styles.submitBtn}
        />

        {/* Register Redirect */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Vous n'avez pas encore de compte ?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.linkText, { color: theme.primary }]}>S'inscrire</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialBtnText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  form: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    height: 52,
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
  },
  linkText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
