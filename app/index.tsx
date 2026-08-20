import React, { useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SplashScreenView } from '@/components/SplashScreenView';

export default function IndexGatekeeper() {
  const {
    user,
    session,
    isLoading,
    hasCompletedOnboarding,
    hasCompletedAccountOnboarding,
    accountOnboardingStep,
    accountOnboardingScope,
  } = useAuth();
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  // 1. Show the official Névé animated Splash Screen until state is loaded & animation completes
  if (isLoading || !isSplashFinished) {
    return (
      <SplashScreenView
        isReady={!isLoading}
        minDuration={350}
        onFinish={() => setIsSplashFinished(true)}
      />
    );
  }

  // 2. User is authenticated
  if (user && session) {
    /* Étape en suspens à reprendre : soit une inscription interrompue, soit les
       autorisations système jamais posées sur cet appareil — la portée dit
       laquelle, et jusqu'où le parcours doit aller. */
    if (!hasCompletedAccountOnboarding && accountOnboardingStep) {
      return (
        <Redirect
          href={{
            pathname: '/(auth)/register',
            params: { mode: accountOnboardingStep, scope: accountOnboardingScope },
          }}
        />
      );
    }
    return <Redirect href="/(tabs)" />;
  }

  // 3. User has completed Onboarding slides but is not logged in ➔ Go to Auth Swarm
  if (hasCompletedOnboarding) {
    return <Redirect href="/(auth)/register" />;
  }

  // 4. First time opening the app ➔ Go to Onboarding Slides
  return <Redirect href="/onboarding" />;
}
