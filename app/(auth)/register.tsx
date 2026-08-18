import React, { useEffect, useRef, useState } from 'react';
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
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { SignupHomeLocationStep } from '@/components/auth/SignupHomeLocationStep';
import { TransportStep } from '@/components/auth/TransportStep';
import { useAdventure } from '@/context/AdventureContext';
import { TransportPassId } from '@/types/passenger';
import { GeocodedPlace } from '@/services/geocodingService';
import { formatPlaceLabel } from '@/components/PlaceSearchField';

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
    hasCompletedAccountOnboarding,
    accountOnboardingStep,
    setAccountOnboardingStep,
    completeAccountOnboarding,
    isLoading,
  } = useAuth();

  const initialAuthMode = (() => {
    const raw = Array.isArray(searchParams.mode) ? searchParams.mode[0] : searchParams.mode;
    if (
      raw === 'notifications' ||
      raw === 'location' ||
      raw === 'home-location' ||
      raw === 'transport' ||
      raw === 'newsletter' ||
      raw === 'welcome' ||
      raw === 'login' ||
      raw === 'verify-email'
    ) {
      return raw;
    }
    if (!hasCompletedAccountOnboarding && accountOnboardingStep) {
      return accountOnboardingStep as any;
    }
    return 'entry';
  })();

  const [authMode, setAuthMode] = useState<
    | 'entry'
    | 'login'
    | 'signup'
    | 'verify-email'
    | 'notifications'
    | 'location'
    | 'home-location'
    | 'transport'
    | 'newsletter'
    | 'forgot-password'
    | 'welcome'
  >(initialAuthMode);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  /* Lieu de résidence principal déclaré après l'étape de géolocalisation.
     Les coordonnées servent à classer les randonnées par temps de trajet. */
  const [homePlace, setHomePlace] = useState<GeocodedPlace | null>(null);
  const [transportPasses, setTransportPasses] = useState<TransportPassId[]>([]);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const lastHandledModeRef = useRef<string | null>(initialAuthMode);

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

  const goToStep = async (
    nextMode:
      | 'entry'
      | 'login'
      | 'signup'
      | 'verify-email'
      | 'notifications'
      | 'location'
      | 'home-location'
      | 'transport'
      | 'newsletter'
      | 'forgot-password'
      | 'welcome'
  ) => {
    lastHandledModeRef.current = nextMode;
    setAuthMode(nextMode);
    router.setParams({ mode: nextMode });
    if (
      nextMode === 'notifications' ||
      nextMode === 'location' ||
      nextMode === 'home-location' ||
      nextMode === 'transport' ||
      nextMode === 'newsletter' ||
      nextMode === 'welcome'
    ) {
      try {
        await setAccountOnboardingStep(nextMode);
      } catch (e) {
        console.warn('Error saving onboarding step:', e);
      }
    }
  };

  // Handle external URL mode parameter e.g. /register?mode=notifications
  useEffect(() => {
    const rawMode = Array.isArray(searchParams.mode) ? searchParams.mode[0] : searchParams.mode;
    if (rawMode && rawMode !== lastHandledModeRef.current) {
      lastHandledModeRef.current = rawMode;
      if (
        rawMode === 'notifications' ||
        rawMode === 'location' ||
        rawMode === 'home-location' ||
        rawMode === 'transport' ||
        rawMode === 'newsletter' ||
        rawMode === 'welcome' ||
        rawMode === 'login' ||
        rawMode === 'verify-email' ||
        rawMode === 'forgot-password' ||
        rawMode === 'entry'
      ) {
        setAuthMode(rawMode as any);
        setAccountOnboardingStep(rawMode);
      }
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
        goToStep('login');
      }
    } else {
      goToStep('signup');
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
      if (!hasCompletedAccountOnboarding && accountOnboardingStep) {
        goToStep(accountOnboardingStep as any);
      } else {
        router.replace('/(tabs)');
      }
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
      goToStep('verify-email');
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
      await goToStep('notifications');
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
    setGender('');
    setHomePlace(null);
    setSignupStep(1);
    goToStep('entry');
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
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const currentUserId = currentSession?.user?.id;
      let isCompleted = false;
      let savedStep: string | null = null;
      if (currentUserId) {
        const isCompletedVal = await AsyncStorage.getItem(
          `@neve_account_onboarding_completed_${currentUserId}`
        );
        isCompleted = isCompletedVal === 'true';
        savedStep = await AsyncStorage.getItem(
          `@neve_account_onboarding_step_${currentUserId}`
        );

        if (!isCompleted && !savedStep) {
          try {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('id, full_name, home_location')
              .eq('id', currentUserId)
              .maybeSingle();

            if (dbProfile?.full_name || dbProfile?.home_location) {
              isCompleted = true;
              await AsyncStorage.setItem(
                `@neve_account_onboarding_completed_${currentUserId}`,
                'true'
              );
            }
          } catch (e) {
            console.warn('Error checking existing profile in handleOAuth:', e);
          }
        }
      }

      if (isCompleted) {
        router.replace('/(tabs)');
      } else if (savedStep) {
        goToStep(savedStep as any);
      } else {
        await goToStep('notifications');
      }
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
    await goToStep('location');
  };

  // Handle Location Permission Request Post Registration
  const handleRequestLocation = async () => {
    try {
      await refreshUserLocation();
    } catch (e) {
      console.warn('Location permission notice:', e);
    }
    await goToStep('home-location');
  };

  // Handle Home Location declaration
  const handleHomeLocationChoice = async () => {
    if (homePlace) {
      try {
        await updateProfile({
          homeLocation: formatPlaceLabel(homePlace),
          homeLat: homePlace.latitude,
          homeLng: homePlace.longitude,
        });
      } catch (e) {
        console.warn('Home location notice:', e);
      }
    }
    await goToStep('transport');
  };

  /*
   * Abonnements de transport déclarés à l'inscription. Une liste vide est une
   * réponse valide (« je n'en ai pas encore ») et s'enregistre comme telle : le
   * profil est ensuite la source de vérité, y compris pour préremplir le premier
   * randonneur d'une aventure.
   */
  const handleTransportChoice = async () => {
    try {
      await updateProfile({ transportPasses });
    } catch (e) {
      console.warn('Transport passes notice:', e);
    }
    await goToStep('newsletter');
  };

  // Handle Newsletter Opt-In Post Registration
  const handleNewsletterChoice = async (accepted: boolean) => {
    try {
      await updateProfile({ newsletterConsent: accepted });
    } catch (e) {
      console.warn('Newsletter consent notice:', e);
    }
    await goToStep('welcome');
  };

  // Final step: Explore Main App
  const handleWelcomeExplore = async () => {
    await completeAccountOnboarding();
    router.replace('/(tabs)');
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
      goToStep('entry');
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
      goToStep('login');
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
            paddingBottom: Math.max(insets.bottom + 16, 34),
          },
        ]}
        keyboardShouldPersistTaps="handled">
        
        {/* Topbar with Circular Back Button */}
        {/* Les étapes qui suivent la création du compte n'ont pas de retour :
            il ramènerait à la saisie de l'e-mail alors que le compte existe. */}
        {authMode !== 'entry' &&
        authMode !== 'welcome' &&
        authMode !== 'notifications' &&
        authMode !== 'location' &&
        authMode !== 'home-location' &&
        authMode !== 'transport' ? (
          <View style={styles.topbar}>
            <Pressable
              onPress={() => {
                if (authMode === 'signup' && signupStep > 1) {
                  setSignupStep(1);
                } else if (authMode === 'verify-email') {
                  goToStep('signup');
                  setSignupStep(2);
                } else if (authMode === 'forgot-password') {
                  goToStep('login');
                } else {
                  goToStep('entry');
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
              gender={gender}
              setGender={setGender}
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
              onSkip={() => goToStep('location')}
            />
          )}

          {authMode === 'location' && (
            <LocationStep
              onRequestLocation={handleRequestLocation}
              onSkip={() => goToStep('home-location')}
            />
          )}

          {authMode === 'home-location' && (
            <SignupHomeLocationStep
              place={homePlace}
              setPlace={setHomePlace}
              onContinue={handleHomeLocationChoice}
              onSkip={() => goToStep('transport')}
              isLoading={isLoading}
            />
          )}

          {authMode === 'transport' && (
            <TransportStep
              passes={transportPasses}
              setPasses={setTransportPasses}
              onContinue={handleTransportChoice}
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
              onForgotPassword={() => goToStep('forgot-password')}
              onOAuth={handleOAuth}
              isLoading={isLoading}
            />
          )}

          {authMode === 'forgot-password' && (
            <ForgotPassStep
              email={email}
              setEmail={setEmail}
              onSubmit={handleSendResetLink}
              onBackToLogin={() => goToStep('login')}
              isLoading={isCheckingEmail}
            />
          )}

          {authMode === 'welcome' && (
            <WelcomeStep onExplore={handleWelcomeExplore} />
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
