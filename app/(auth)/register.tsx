import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Apple,
  Globe,
  Sparkles,
  Mountain,
} from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Checkbox } from '@/components/Checkbox';
import { NeveLogo } from '@/components/NeveLogo';
import { SocialIcon } from '@/components/SocialIcon';

const PARIS_STATIONS = [
  'Paris Gare de Lyon',
  'Paris Montparnasse',
  'Paris Gare de l’Est',
  'Paris Gare du Nord',
  'Paris Saint-Lazare',
  'Paris Austerlitz',
];

export default function SwarmAuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { signUp, signIn, signInWithOAuth, checkUserExists, isLoading } = useAuth();

  const [authMode, setAuthMode] = useState<'entry' | 'login' | 'signup' | 'welcome'>('entry');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedStation, setSelectedStation] = useState('Paris Gare de Lyon');
  const [newsletterConsent, setNewsletterConsent] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Check whether email already exists
  const handleEmailCheck = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Veuillez entrer une adresse email valide.');
      return;
    }
    setErrorMsg('');
    setIsCheckingEmail(true);

    const exists = await checkUserExists(email.trim());
    setIsCheckingEmail(false);

    if (exists) {
      setAuthMode('login');
    } else {
      setAuthMode('signup');
      setSignupStep(1);
    }
  };

  // Sign In Submission for Existing Users
  const handleLoginSubmit = async () => {
    if (!password.trim()) {
      setErrorMsg('Veuillez entrer votre mot de passe.');
      return;
    }
    setErrorMsg('');

    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrorMsg(error);
    } else {
      router.replace('/(tabs)');
    }
  };

  // Signup Wizard Submission
  const handleSignupSubmit = async () => {
    setErrorMsg('');
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await signUp(
      email.trim(),
      password,
      fullName || undefined,
      selectedStation
    );

    if (error) {
      setErrorMsg(error);
    } else {
      setAuthMode('welcome');
    }
  };

  // OAuth Authentication
  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setErrorMsg('');
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setErrorMsg(error);
    } else {
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
            paddingTop: Math.max(insets.top + 16, 44),
            paddingBottom: Math.max(insets.bottom + 20, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled">
        
        {/* Topbar with Circular Back Button */}
        {authMode !== 'entry' && authMode !== 'welcome' ? (
          <View style={styles.topbar}>
            <Pressable
              onPress={() => {
                if (authMode === 'signup' && signupStep === 2) {
                  setSignupStep(1);
                } else {
                  setAuthMode('entry');
                }
              }}
              style={[styles.circularBackBtn, { backgroundColor: theme.card }]}>
              <ArrowLeft size={20} color={theme.text} />
            </Pressable>
          </View>
        ) : null}

        {/* ERROR BANNER */}
        {errorMsg ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: theme.statusBgErrorSubtle, borderColor: theme.statusBgError },
            ]}>
            <Text style={[styles.errorText, { color: theme.statusTextError }]}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* ---------------------------------------------------- */}
        {/* MODE 1: AUTH ENTRY / INITIAL EMAIL STEP (Frame 481:6036) */}
        {/* ---------------------------------------------------- */}
        {authMode === 'entry' ? (
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
                  onClear={() => setEmail('')}
                />

                <Button
                  title="Continuer"
                  onPress={handleEmailCheck}
                  loading={isCheckingEmail}
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
                <Button
                  title="Continuer avec Apple"
                  variant="social"
                  icon={<SocialIcon provider="apple" size={20} />}
                  onPress={() => handleOAuth('apple')}
                />
                <Button
                  title="Continuer avec Google"
                  variant="social"
                  icon={<SocialIcon provider="google" size={20} />}
                  onPress={() => handleOAuth('google')}
                />
                <Button
                  title="Continuer avec Facebook"
                  variant="social"
                  icon={<SocialIcon provider="facebook" size={20} />}
                  onPress={() => handleOAuth('facebook')}
                />
              </View>
            </View>

            {/* Terms & Conditions Footer Disclaimer */}
            <View style={styles.footerLegal}>
              <Text style={[styles.legalText, { color: theme.textMuted }]}>
                En continuant, vous acceptez nos{' '}
                <Text
                  onPress={() => Linking.openURL('https://neve-app.fr/terms')}
                  style={[styles.legalLink, { color: theme.text }]}>
                  Conditions d’utilisation
                </Text>{' '}
                et nous considérons que vous avez lu et accepté notre{' '}
                <Text
                  onPress={() => Linking.openURL('https://neve-app.fr/privacy')}
                  style={[styles.legalLink, { color: theme.text }]}>
                  Politique de confidentialité
                </Text>
                .
              </Text>
            </View>
          </View>
        ) : null}

        {/* ---------------------------------------------------- */}
        {/* MODE 2: SIGNUP STEP 1 - EMAIL & PASSWORD (Frame 484:7142) */}
        {/* ---------------------------------------------------- */}
        {authMode === 'signup' && signupStep === 1 ? (
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
                onClear={() => setEmail('')}
              />

              <Input
                variant="outlined"
                label="Mot de passe"
                placeholder="Tapez votre mot de passe"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <Checkbox
                checked={newsletterConsent}
                onToggle={setNewsletterConsent}
                label="J’accepte être tenu au courant des dernières nouveautés, des nouvelles aventures disponibles et de recevoir notre newsletter exclusive. Vous pouvez vous désabonner à tout moment."
              />

              <Button
                title="Continuer"
                onPress={() => {
                  if (!password || password.length < 6) {
                    setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
                    return;
                  }
                  setErrorMsg('');
                  setSignupStep(2);
                }}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ) : null}

        {/* ---------------------------------------------------- */}
        {/* MODE 3: SIGNUP STEP 2 - PROFILE DETAILS (Frame 481:6989) */}
        {/* ---------------------------------------------------- */}
        {authMode === 'signup' && signupStep === 2 ? (
          <View style={styles.contentFlex}>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.headingTitle, { color: theme.text }]}>
                Parlez-nous un peu de vous
              </Text>
              <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
                Ces informations nous permettent de personnaliser votre expérience d'aventure Névé.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.inlineInputsRow}>
                <Input
                  variant="outlined"
                  label="Prénom"
                  placeholder="Nathan"
                  value={firstName}
                  onChangeText={setFirstName}
                  containerStyle={{ flex: 1 }}
                />
                <Input
                  variant="outlined"
                  label="Nom"
                  placeholder="Laure"
                  value={lastName}
                  onChangeText={setLastName}
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <Input
                variant="outlined"
                label="Gare préférée (Optionnel)"
                value={selectedStation}
                onChangeText={setSelectedStation}
                placeholder="Paris Gare de Lyon"
              />

              <Button
                title="Terminer et démarrer"
                onPress={handleSignupSubmit}
                loading={isLoading}
                style={styles.actionBtn}
              />
            </View>

            <View style={styles.footerLegal}>
              <Text style={[styles.legalText, { color: theme.textMuted }]}>
                En continuant, vous acceptez nos{' '}
                <Text style={[styles.legalLink, { color: theme.text }]}>
                  Conditions d’utilisation
                </Text>{' '}
                et notre{' '}
                <Text style={[styles.legalLink, { color: theme.text }]}>
                  Politique de confidentialité
                </Text>
                .
              </Text>
            </View>
          </View>
        ) : null}

        {/* ---------------------------------------------------- */}
        {/* MODE 4: EXISTING USER LOGIN / PASSWORD (Frame 481:6713) */}
        {/* ---------------------------------------------------- */}
        {authMode === 'login' ? (
          <View style={styles.contentFlex}>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.headingTitle, { color: theme.text }]}>
                Ravi de vous revoir !
              </Text>
              <Text style={[styles.headingSubtitle, { color: theme.textMuted }]}>
                Entrez votre mot de passe pour vous connecter à {email}.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Input
                variant="outlined"
                label="Mot de passe"
                placeholder="Tapez votre mot de passe"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <Pressable onPress={() => setErrorMsg('Un lien de réinitialisation vous a été envoyé.')}>
                <Text style={[styles.forgotPassLink, { color: theme.primary }]}>
                  Mot de passe oublié ?
                </Text>
              </Pressable>

              <Button
                title="Se connecter"
                onPress={handleLoginSubmit}
                loading={isLoading}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ) : null}

        {/* ---------------------------------------------------- */}
        {/* MODE 5: WELCOME / ACCOUNT CREATED SUCCESS (Frame 482:7062) */}
        {/* ---------------------------------------------------- */}
        {authMode === 'welcome' ? (
          <View style={[styles.contentFlex, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={[styles.successIconBadge, { backgroundColor: theme.card }]}>
              <Sparkles size={48} color={theme.primary} />
            </View>

            <View style={[styles.headerTextGroup, { alignItems: 'center', marginVertical: 24 }]}>
              <Text style={[styles.headingTitle, { color: theme.text, textAlign: 'center' }]}>
                Bienvenue sur Névé !
              </Text>
              <Text style={[styles.headingSubtitle, { color: theme.textMuted, textAlign: 'center' }]}>
                Votre compte est prêt. Préparez vos prochaines randonnées accessibles en train dès aujourd'hui.
              </Text>
            </View>

            <Button
              title="Explorer les randonnées"
              onPress={() => router.replace('/(tabs)')}
              style={styles.actionBtn}
            />
          </View>
        ) : null}

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
  topbar: {
    height: 48,
    justifyContent: 'center',
    marginBottom: 16,
  },
  circularBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  contentFlex: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 24,
  },
  logoRow: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  logoOfficialImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  mainBlock: {
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
  inlineInputsRow: {
    flexDirection: 'row',
    gap: 12,
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
  forgotPassLink: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 2,
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
  successIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});
