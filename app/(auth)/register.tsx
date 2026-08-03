import React, { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  PermissionsAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/utils/toast';

import { AuthEntryStep } from '@/components/auth/AuthEntryStep';
import { SignupPasswordStep } from '@/components/auth/SignupPasswordStep';
import { SignupProfileStep } from '@/components/auth/SignupProfileStep';
import { VerifyEmailStep } from '@/components/auth/VerifyEmailStep';
import { NotificationStep } from '@/components/auth/NotificationStep';
import { NewsletterStep } from '@/components/auth/NewsletterStep';
import { LoginStep } from '@/components/auth/LoginStep';
import { WelcomeStep } from '@/components/auth/WelcomeStep';
import { ForgotPassStep } from '@/components/auth/ForgotPassStep';
import { LocationStep } from '@/components/auth/LocationStep';
import { useAdventure } from '@/context/AdventureContext';

export default function SwarmAuthScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { refreshUserLocation } = useAdventure();

  const {
    signUp,
    signIn,
    signInWithOAuth,
    checkUserExists,
    checkUserProvider,
    resendConfirmationEmail,
    checkEmailConfirmed,
    signOut,
    deleteUnconfirmedUser,
    resetPassword,
    updateProfile,
    completeOnboarding,
    isLoading,
  } = useAuth();

  const [authMode, setAuthMode] = useState<
    'entry' | 'login' | 'signup' | 'verify-email' | 'notifications' | 'location' | 'newsletter' | 'forgot-password' | 'welcome'
  >('entry');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedStation, setSelectedStation] = useState('Paris Gare de Lyon');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);

  // Animated transitions between auth modes and signup steps
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [slideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    fadeAnim.setValue(0.25);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [authMode, signupStep]);

  // Handle URL mode parameter e.g. /register?mode=notifications
  useEffect(() => {
    const rawMode = Array.isArray(searchParams.mode) ? searchParams.mode[0] : searchParams.mode;
    if (rawMode === 'notifications') {
      setAuthMode('notifications');
    } else if (rawMode === 'newsletter') {
      setAuthMode('newsletter');
    } else if (rawMode === 'welcome') {
      setAuthMode('welcome');
    }
  }, [searchParams.mode]);

  // Check whether email already exists and detect authentication providers
  const handleEmailCheck = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast.error('Adresse e-mail invalide', 'Veuillez entrer une adresse e-mail valide.');
      return;
    }
    setIsCheckingEmail(true);

    const { exists, providers } = await checkUserProvider(email.trim());
    setIsCheckingEmail(false);

    if (exists) {
      const hasEmailProvider = providers.includes('email');
      const oAuthProvider = providers.find(
        (p) => p === 'google' || p === 'apple' || p === 'facebook'
      );

      if (!hasEmailProvider && oAuthProvider) {
        const providerName =
          oAuthProvider === 'google'
            ? 'Google'
            : oAuthProvider === 'apple'
            ? 'Apple'
            : 'Facebook';

        showToast.info(
          `Compte ${providerName} détecté`,
          `Ce compte Névé a été créé avec ${providerName}. Cliquez sur "Continuer avec ${providerName}" ci-dessous.`
        );
      } else {
        setAuthMode('login');
      }
    } else {
      setAuthMode('signup');
      setSignupStep(1);
    }
  };

  // Sign In Submission for Existing Users
  const handleLoginSubmit = async () => {
    if (!password.trim()) {
      showToast.error('Mot de passe requis', 'Veuillez entrer votre mot de passe.');
      return;
    }

    const { error } = await signIn(email.trim(), password);
    if (error) {
      showToast.error('Erreur de connexion', error);
    } else {
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  // Signup Wizard Submission
  const handleSignupSubmit = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const result = await signUp(
      email.trim(),
      password,
      fullName || undefined,
      undefined,
      newsletterConsent
    );

    if (result.error) {
      showToast.error('Erreur d’inscription', result.error);
    } else {
      if ((result as any).isResent) {
        showToast.success('E-mail envoyé 📩', 'Un nouvel e-mail de confirmation vient de vous être envoyé !');
      }
      setAuthMode('verify-email');
    }
  };

  // Resend Email Confirmation
  const handleResendEmail = async () => {
    setIsResendingEmail(true);
    const { error } = await resendConfirmationEmail(email);
    setIsResendingEmail(false);
    if (error) {
      showToast.error('Erreur d’envoi', error);
    } else {
      showToast.success('E-mail envoyé 📩', 'Un nouvel e-mail de confirmation vient de vous être envoyé !');
    }
  };

  // Verify whether email has been confirmed by user
  const handleCheckConfirmation = async () => {
    setIsCheckingConfirmation(true);
    const confirmed = await checkEmailConfirmed(email);
    if (confirmed) {
      if (password) {
        await signIn(email, password);
      }
      setIsCheckingConfirmation(false);
      completeOnboarding();
      setAuthMode('notifications');
    } else {
      setIsCheckingConfirmation(false);
      showToast.error('E-mail non confirmé', 'Merci de cliquer sur le lien reçu dans votre boîte mail.');
    }
  };

  // Handle Changing Email (Reset Auth & Return to Entry Step)
  const handleChangeEmail = async () => {
    try {
      await deleteUnconfirmedUser();
    } catch (e) {
      console.warn('Delete unconfirmed user notice:', e);
    }
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setSelectedStation('Paris Gare de Lyon');
    setSignupStep(1);
    setAuthMode('entry');
  };

  // OAuth Authentication
  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    const res = await signInWithOAuth(provider);
    if (res.cancelled) {
      return;
    }
    if (res.error) {
      showToast.error('Erreur d’authentification', res.error);
    } else {
      completeOnboarding();
      setAuthMode('notifications');
    }
  };

  // Request Notifications permission
  const handleRequestNotifications = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      } else if (Platform.OS === 'ios') {
        const Notifications = await import('expo-notifications');
        if (Notifications && typeof Notifications.requestPermissionsAsync === 'function') {
          await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
        }
      }
    } catch (e) {
      console.warn('Notifications permission notice:', e);
    }
    setAuthMode('location');
  };

  // Handle Location Permission Request Post Registration
  const handleRequestLocation = async () => {
    try {
      await refreshUserLocation();
    } catch (e) {
      console.warn('Location permission notice:', e);
    }
    setAuthMode('newsletter');
  };

  // Handle Newsletter Opt-In Post Registration
  const handleNewsletterChoice = async (accepted: boolean) => {
    try {
      await updateProfile({ newsletterConsent: accepted });
    } catch (e) {
      console.warn('Newsletter consent notice:', e);
    }
    setAuthMode('welcome');
  };

  // Handle Forgot Password reset request with email verification
  const handleSendResetLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast.error('Adresse e-mail invalide', 'Veuillez entrer une adresse e-mail valide.');
      return;
    }

    setIsCheckingEmail(true);
    const { exists, providers } = await checkUserProvider(email.trim());
    setIsCheckingEmail(false);

    if (!exists) {
      showToast.error('Aucun compte trouvé', 'Aucune aventure Névé n’est associée à cette adresse e-mail.');
      return;
    }

    const hasEmailProvider = providers.includes('email');
    const oAuthProvider = providers.find((p) => p === 'google' || p === 'apple' || p === 'facebook');

    if (!hasEmailProvider && oAuthProvider) {
      const providerName = oAuthProvider === 'google' ? 'Google' : oAuthProvider === 'apple' ? 'Apple' : 'Facebook';
      showToast.info(
        `Compte ${providerName} détecté`,
        `Ce compte Névé a été créé avec ${providerName}. Connectez-vous directement via ${providerName}.`
      );
      setAuthMode('entry');
      return;
    }

    setIsCheckingEmail(true);
    const { error } = await resetPassword(email.trim());
    setIsCheckingEmail(false);

    if (error) {
      showToast.error('Erreur d’envoi', error);
    } else {
      showToast.success(
        'E-mail envoyé 📩',
        `Un lien de réinitialisation sécurisé vient d'être envoyé à ${email}.`
      );
      setAuthMode('login');
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
        {authMode !== 'entry' && authMode !== 'welcome' && authMode !== 'notifications' ? (
          <View style={styles.topbar}>
            <Pressable
              onPress={() => {
                if (authMode === 'signup' && signupStep === 2) {
                  setSignupStep(1);
                } else if (authMode === 'verify-email') {
                  setAuthMode('signup');
                  setSignupStep(2);
                } else if (authMode === 'forgot-password') {
                  setAuthMode('login');
                } else {
                  setAuthMode('entry');
                }
              }}
              style={[styles.circularBackBtn, { backgroundColor: theme.card }]}>
              <ArrowLeft size={20} color={theme.text} />
            </Pressable>
          </View>
        ) : null}

        {/* Animated Step Container */}
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}>

          {authMode === 'entry' && (
            <AuthEntryStep
              email={email}
              setEmail={setEmail}
              onContinue={handleEmailCheck}
              onOAuth={handleOAuth}
              isLoading={isCheckingEmail}
            />
          )}

          {authMode === 'signup' && signupStep === 1 && (
            <SignupPasswordStep
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              isPasswordValid={isPasswordValid}
              setIsPasswordValid={setIsPasswordValid}
              onNext={() => setSignupStep(2)}
            />
          )}

          {authMode === 'signup' && signupStep === 2 && (
            <SignupProfileStep
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              selectedStation={selectedStation}
              setSelectedStation={setSelectedStation}
              onSubmit={handleSignupSubmit}
              isLoading={isLoading}
            />
          )}

          {authMode === 'verify-email' && (
            <VerifyEmailStep
              email={email}
              onCheckConfirmation={handleCheckConfirmation}
              onResendEmail={handleResendEmail}
              onChangeEmail={handleChangeEmail}
              isCheckingConfirmation={isCheckingConfirmation}
              isResendingEmail={isResendingEmail}
            />
          )}

          {authMode === 'notifications' && (
            <NotificationStep
              onRequestNotifications={handleRequestNotifications}
              onSkip={() => setAuthMode('location')}
            />
          )}

          {authMode === 'location' && (
            <LocationStep
              onRequestLocation={handleRequestLocation}
              onSkip={() => setAuthMode('newsletter')}
            />
          )}

          {authMode === 'newsletter' && (
            <NewsletterStep onChoice={handleNewsletterChoice} />
          )}

          {authMode === 'login' && (
            <LoginStep
              email={email}
              password={password}
              setPassword={setPassword}
              onLoginSubmit={handleLoginSubmit}
              onForgotPassword={() => setAuthMode('forgot-password')}
              onOAuth={handleOAuth}
              isLoading={isLoading}
            />
          )}

          {authMode === 'forgot-password' && (
            <ForgotPassStep
              email={email}
              setEmail={setEmail}
              onSubmit={handleSendResetLink}
              onBackToLogin={() => setAuthMode('login')}
              isLoading={isCheckingEmail}
            />
          )}

          {authMode === 'welcome' && (
            <WelcomeStep onExplore={() => router.replace('/(tabs)')} />
          )}

        </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  circularBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
