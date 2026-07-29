import React from 'react';
import { useRouter } from 'expo-router';
import { SplashScreenView } from '@/components/SplashScreenView';

export default function SplashPage() {
  const router = useRouter();

  return (
    <SplashScreenView
      onFinish={() => {
        router.replace('/onboarding');
      }}
    />
  );
}
