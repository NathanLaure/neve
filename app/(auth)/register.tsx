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
import {
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Mail,
  Lock,
  Train,
  Eye,
  EyeOff,
  Globe,
  Apple,
  Check,
  Sparkles,
} from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

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

  const [authMode, setAuthMode] = useState<'entry' | 'login' | 'signup'>('entry');
  const [signupStep, setSignupStep] = useState(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedStation, setSelectedStation] = useState('Paris Gare de Lyon');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Universal Email Submission
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

  // Sign In Submission
  const handleLoginSubmit = async () => {
    if (!password.trim()) {
      setErrorMsg('Veuillez entrer votre mot de passe.');
      return;
    }
    setErrorMsg('');

    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrorMsg(error.message || 'Mot de passe incorrect. Veuillez réessayer.');
    } else {
      router.replace('/(tabs)');
    }
  };

  // Signup Wizard Submission
  const handleSignupNext = () => {
    setErrorMsg('');
    if (signupStep === 1) {
      if (!fullName.trim()) {
        setErrorMsg('Veuillez entrer votre nom complet.');
        return;
      }
      setSignupStep(2);
    } else if (signupStep === 2) {
      if (password.length < 6) {
        setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      setSignupStep(3);
    } else if (signupStep === 3) {
      handleFinalRegisterSubmit();
    }
  };

  const handleFinalRegisterSubmit = async () => {
    setErrorMsg('');
    const { error } = await signUp(email.trim(), password, fullName.trim(), selectedStation);
    if (error) {
      setErrorMsg(error.message || 'Création de compte échouée. Veuillez réessayer.');
    } else {
      Alert.alert(
        'Bienvenue sur Névé ! 🎉',
        'Votre compte a été créé avec succès.',
        [{ text: 'Découvrir', onPress: () => router.replace('/(tabs)') }]
      );
    }
  };

  const handlePrev = () => {
    setErrorMsg('');
    if (authMode === 'login') {
      setAuthMode('entry');
    } else if (authMode === 'signup') {
      if (signupStep > 1) {
        setSignupStep(signupStep - 1);
      } else {
        setAuthMode('entry');
      }
    } else {
      router.back();
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
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 12, 24), paddingBottom: Math.max(insets.bottom + 20, 24) },
        ]}
        keyboardShouldPersistTaps="handled">
        
        {/* Back Button / Top Bar */}
        <View style={styles.topRow}>
          <Pressable
            onPress={handlePrev}
            style={[styles.backBtn, { backgroundColor: theme.card }]}>
            <ArrowLeft size={22} color={theme.text} />
          </Pressable>

          {authMode === 'signup' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: theme.primary, width: `${(signupStep / 3) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.stepCounterText, { color: theme.textMuted }]}>
                Étape {signupStep} sur 3
              </Text>
            </View>
          )}
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: theme.statusBgErrorSubtle, borderColor: theme.statusBgError },
            ]}>
            <Text style={[styles.errorText, { color: theme.statusTextError }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* MODE 1: Swarm Style Entry Screen */}
        {authMode === 'entry' && (
          <View style={styles.swarmCenterBlock}>
            {/* Top Swarm Logo */}
            <View style={styles.logoRow}>
              <Text style={[styles.logoText, { color: theme.text }]}>Névé</Text>
              <View style={[styles.logoDot, { backgroundColor: theme.primary }]} />
            </View>

            {/* Title (Matching Swarm Screen) */}
            <Text style={[styles.swarmTitle, { color: theme.text }]}>
              Rejoindre Névé avec votre email
            </Text>

            {/* Email Input */}
            <Input
              placeholder="Entrez votre adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Mail size={20} color={theme.textMuted} />}
              containerStyle={{ marginBottom: 16 }}
            />

            {/* Primary Continue Button */}
            <Button
              title="Continuer"
              variant="primary"
              loading={isCheckingEmail}
              onPress={handleEmailCheck}
              disabled={isCheckingEmail}
              style={styles.fullWidthBtn}
            />

            {/* Divider 'ou' */}
            <View style={styles.swarmDividerRow}>
              <View style={[styles.swarmDividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.swarmDividerText, { color: theme.textMuted }]}>ou</Text>
              <View style={[styles.swarmDividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Stacked Social Sign In Buttons (Using design system Button component) */}
            <View style={styles.socialStack}>
              <Button
                title="Continuer avec Apple"
                variant="secondary"
                icon={<Apple size={18} color={theme.text} />}
                onPress={() => handleOAuth('apple')}
                style={styles.socialButton}
                textStyle={styles.socialButtonText}
              />

              <Button
                title="Continuer avec Google"
                variant="secondary"
                icon={<Globe size={18} color={theme.text} />}
                onPress={() => handleOAuth('google')}
                style={styles.socialButton}
                textStyle={styles.socialButtonText}
              />
            </View>

            {/* Legal Disclaimer Footer */}
            <Text style={[styles.legalDisclaimer, { color: theme.textMuted }]}>
              En continuant, vous acceptez nos{' '}
              <Text style={styles.legalLink}>Conditions d’utilisation</Text> et reconnaissez avoir lu notre{' '}
              <Text style={styles.legalLink}>Politique de confidentialité</Text>.
            </Text>
          </View>
        )}

        {/* MODE 2: Existing User Password Sign-In */}
        {authMode === 'login' && (
          <View style={styles.stepContent}>
            <View style={styles.headerGroup}>
              <Text style={[styles.questionTitle, { color: theme.text }]}>
                Bon retour parmi nous !
              </Text>
              <Text style={[styles.questionSub, { color: theme.textMuted }]}>
                Entrez votre mot de passe pour vous connecter à <Text style={{ color: theme.text, fontFamily: 'Satoshi-Bold' }}>{email}</Text>.
              </Text>
            </View>

            <Input
              label="Mot de passe"
              placeholder="••••••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              icon={<Lock size={20} color={theme.textMuted} />}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff size={20} color={theme.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.textMuted} />
                  )}
                </Pressable>
              }
              containerStyle={{ marginBottom: 28 }}
            />

            <Button
              title={isLoading ? 'Connexion...' : 'Se connecter'}
              variant="primary"
              onPress={handleLoginSubmit}
              disabled={isLoading}
              style={styles.submitBtn}
            />
          </View>
        )}

        {/* MODE 3: New User Registration Wizard */}
        {authMode === 'signup' && (
          <View style={styles.stepContent}>
            {signupStep === 1 && (
              <>
                <View style={styles.headerGroup}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Comment t’appelles-tu ?
                  </Text>
                  <Text style={[styles.questionSub, { color: theme.textMuted }]}>
                    C’est ainsi que tu apparaîtras dans ton profil et sur tes favoris.
                  </Text>
                </View>

                <Input
                  label="Prénom & Nom"
                  placeholder="Alex Dupont"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  icon={<UserIcon size={20} color={theme.textMuted} />}
                  containerStyle={{ marginBottom: 28 }}
                />
              </>
            )}

            {signupStep === 2 && (
              <>
                <View style={styles.headerGroup}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Sécurise ton compte
                  </Text>
                  <Text style={[styles.questionSub, { color: theme.textMuted }]}>
                    Choisis un mot de passe d’au moins 6 caractères pour <Text style={{ color: theme.text, fontFamily: 'Satoshi-Bold' }}>{email}</Text>.
                  </Text>
                </View>

                <Input
                  label="Mot de passe"
                  placeholder="••••••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  icon={<Lock size={20} color={theme.textMuted} />}
                  rightIcon={
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? (
                        <EyeOff size={20} color={theme.textMuted} />
                      ) : (
                        <Eye size={20} color={theme.textMuted} />
                      )}
                    </Pressable>
                  }
                  containerStyle={{ marginBottom: 28 }}
                />
              </>
            )}

            {signupStep === 3 && (
              <>
                <View style={styles.headerGroup}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    D’où pars-tu le plus souvent ?
                  </Text>
                  <Text style={[styles.questionSub, { color: theme.textMuted }]}>
                    Ta gare principale permettra de calculer instantanément tes temps de trajet en train.
                  </Text>
                </View>

                <View style={styles.stationsGrid}>
                  {PARIS_STATIONS.map((station) => {
                    const isSelected = selectedStation === station;
                    return (
                      <Pressable
                        key={station}
                        onPress={() => setSelectedStation(station)}
                        style={[
                          styles.stationCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: isSelected ? theme.primary : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}>
                        <Train size={20} color={isSelected ? theme.primary : theme.textMuted} />
                        <Text
                          style={[
                            styles.stationText,
                            { color: theme.text, fontFamily: isSelected ? 'BricolageGrotesque-Bold' : 'Satoshi-Medium' },
                          ]}>
                          {station}
                        </Text>
                        {isSelected && (
                          <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                            <Check size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Button
              title={
                isLoading
                  ? 'Création...'
                  : signupStep === 3
                  ? 'Terminer et démarrer'
                  : 'Continuer'
              }
              variant="primary"
              icon={signupStep < 3 ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
              iconPosition="right"
              onPress={handleSignupNext}
              disabled={isLoading}
              style={styles.submitBtn}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCounterText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
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
  swarmCenterBlock: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 40,
  },
  logoText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 32,
    letterSpacing: -0.5,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 10,
  },
  swarmTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  swarmInputBox: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    marginBottom: 16,
    justifyContent: 'center',
  },
  swarmInput: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    height: '100%',
  },
  fullWidthBtn: {
    width: '100%',
    height: 52,
    marginBottom: 24,
  },
  swarmDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 28,
  },
  swarmDividerLine: {
    flex: 1,
    height: 1,
  },
  swarmDividerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  socialStack: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  socialButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  socialButtonText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 15,
  },
  legalDisclaimer: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 'auto',
    paddingHorizontal: 16,
  },
  legalLink: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
  stepContent: {
    flex: 1,
  },
  headerGroup: {
    marginBottom: 28,
  },
  questionTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 8,
  },
  questionSub: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 28,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 17,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  stationsGrid: {
    gap: 12,
    marginBottom: 28,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 12,
  },
  stationText: {
    flex: 1,
    fontSize: 15,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 52,
    marginTop: 8,
  },
});
