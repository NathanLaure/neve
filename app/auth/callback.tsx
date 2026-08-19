import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';

import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';

function parseSupabaseUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!url) return params;

  // Split query and hash parts
  const questionMarkIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  let queryString = '';
  let hashString = '';

  if (questionMarkIndex !== -1) {
    if (hashIndex !== -1 && hashIndex > questionMarkIndex) {
      queryString = url.substring(questionMarkIndex + 1, hashIndex);
      hashString = url.substring(hashIndex + 1);
    } else {
      queryString = url.substring(questionMarkIndex + 1);
    }
  } else if (hashIndex !== -1) {
    hashString = url.substring(hashIndex + 1);
  }

  const parsePairs = (str: string) => {
    str.split('&').forEach((part) => {
      const [key, ...values] = part.split('=');
      if (key) {
        const val = values.join('=');
        try {
          params[decodeURIComponent(key)] = decodeURIComponent(val || '');
        } catch {
          params[key] = val || '';
        }
      }
    });
  };

  if (queryString) parsePairs(queryString);
  if (hashString) parsePairs(hashString);

  return params;
}

type AuthCallbackStatus = 'verifying' | 'success' | 'info' | 'error';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const {
    user,
    session,
    hasCompletedAccountOnboarding,
    accountOnboardingStep,
    setAccountOnboardingStep,
  } = useAuth();

  const [status, setStatus] = useState<AuthCallbackStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Dès que AuthContext détient une session active, rediriger immédiatement
  useEffect(() => {
    if (user && session) {
      if (hasCompletedAccountOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace({
          pathname: '/(auth)/register',
          params: { mode: (accountOnboardingStep as any) || 'notifications' },
        });
      }
    }
  }, [user, session, hasCompletedAccountOnboarding, accountOnboardingStep, router]);

  useEffect(() => {
    let isMounted = true;

    // Redirection immédiate pour les connexions OAuth (Google, Apple, Facebook)
    const handleOAuthRedirect = async (sessionUser: any) => {
      try {
        const isCompleted = await AsyncStorage.getItem(
          `@neve_account_onboarding_completed_${sessionUser.id}`
        );
        if (isCompleted === 'true') {
          router.replace('/(tabs)');
          return;
        }

        const savedStep = await AsyncStorage.getItem(
          `@neve_account_onboarding_step_${sessionUser.id}`
        );
        if (savedStep) {
          router.replace({ pathname: '/(auth)/register', params: { mode: savedStep } });
          return;
        }

        // Vérifier si le profil existe déjà en base pour un utilisateur existant
        try {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('id, full_name, home_location')
            .eq('id', sessionUser.id)
            .maybeSingle();

          if (dbProfile?.full_name || dbProfile?.home_location) {
            await AsyncStorage.setItem(
              `@neve_account_onboarding_completed_${sessionUser.id}`,
              'true'
            );
            router.replace('/(tabs)');
            return;
          }
        } catch (e) {
          console.warn('Error checking existing profile in callback:', e);
        }

        await setAccountOnboardingStep('notifications');
        router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
      } catch {
        router.replace('/(tabs)');
      }
    };

    const isOAuthFlow = (user: any, parsed: Record<string, string>) => {
      if (parsed.provider || parsed.type === 'oauth') return true;
      const provider = user?.app_metadata?.provider;
      if (provider && provider !== 'email') return true;
      const providers = user?.app_metadata?.providers as string[] | undefined;
      if (providers && providers.some((p) => p !== 'email')) return true;
      // S'il n'y a pas de token_hash ni de type signup/email, c'est un flux direct OAuth
      if (!parsed.type && !parsed.token_hash && !parsed.token) return true;
      return false;
    };

    const processUrl = async (url: string | null) => {
      if (!url) return false;

      const parsed = parseSupabaseUrl(url);

      // 1. Si des tokens de session directs sont présents
      if (parsed.access_token && parsed.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        });

        if (!error && data.session?.user) {
          if (isOAuthFlow(data.session.user, parsed)) {
            await handleOAuthRedirect(data.session.user);
            return true;
          }

          if (isMounted) {
            await setAccountOnboardingStep('notifications');
            setStatus('success');
            setTimeout(() => {
              if (isMounted) {
                router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
              }
            }, 3000);
          }
          return true;
        }
      }

      // 2. Si un code PKCE est présent
      if (parsed.code) {
        let sessionUser: any = null;
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (!error && data.session?.user) {
          sessionUser = data.session.user;
        } else {
          // Si le code a déjà été consommé par signInWithOAuth, on récupère la session active
          const { data: currentSessionData } = await supabase.auth.getSession();
          if (currentSessionData.session?.user) {
            sessionUser = currentSessionData.session.user;
          }
        }

        if (sessionUser) {
          if (isOAuthFlow(sessionUser, parsed)) {
            await handleOAuthRedirect(sessionUser);
            return true;
          }

          if (isMounted) {
            await setAccountOnboardingStep('notifications');
            setStatus('success');
            setTimeout(() => {
              if (isMounted) {
                router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
              }
            }, 3000);
          }
          return true;
        }
      }

      // 3. Si un token_hash / token OTP est présent (flow confirmation e-mail)
      const tokenHash = parsed.token_hash || parsed.token;
      if (tokenHash) {
        const type = (parsed.type as any) || 'signup';
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type,
        });

        if (!error && data.session) {
          if (isMounted) {
            await setAccountOnboardingStep('notifications');
            setStatus('success');
            setTimeout(() => {
              if (isMounted) {
                router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
              }
            }, 3000);
          }
          return true;
        }
      }

      // 4. Si une erreur explicite est renvoyée par Supabase
      if (parsed.error || parsed.error_description) {
        // Si l'erreur est otp_expired, il arrive très souvent que le lien ait déjà été consommé avec succès
        if (
          parsed.error === 'access_denied' ||
          parsed.error_code === 'otp_expired' ||
          parsed.error_description?.includes('expired')
        ) {
          // On vérifie si la session est active malgré tout
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            if (isMounted) {
              await setAccountOnboardingStep('notifications');
              setStatus('success');
              setTimeout(() => {
                if (isMounted) {
                  router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
                }
              }, 3000);
            }
            return true;
          }

          if (isMounted) {
            setStatus('info');
          }
          return true;
        }

        if (isMounted) {
          setErrorMessage(parsed.error_description || parsed.error || 'Erreur de confirmation');
          setStatus('error');
        }
        return true;
      }

      return false;
    };

    const handleCallback = async () => {
      try {
        // Vérification immédiate si la session est déjà établie (ex: par signInWithOAuth)
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (initialSession?.user) {
          if (isOAuthFlow(initialSession.user, {})) {
            await handleOAuthRedirect(initialSession.user);
            return;
          }
        }

        const initialUrl = await Linking.getInitialURL();
        const handled = await processUrl(initialUrl);
        if (handled) return;

        // 5. Vérifier la session actuelle ou rafraîchir
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.user) {
          if (isOAuthFlow(refreshData.session.user, {})) {
            await handleOAuthRedirect(refreshData.session.user);
            return;
          }
          if (isMounted) {
            await setAccountOnboardingStep('notifications');
            setStatus('success');
            setTimeout(() => {
              if (isMounted) {
                router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
              }
            }, 3000);
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (isOAuthFlow(session.user, {})) {
            await handleOAuthRedirect(session.user);
            return;
          }
          if (isMounted) {
            await setAccountOnboardingStep('notifications');
            setStatus('success');
            setTimeout(() => {
              if (isMounted) {
                router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
              }
            }, 3000);
          }
          return;
        }

        // 6. Si aucune session directe (ex: validation effectuée dans un navigateur externe)
        if (isMounted) {
          setStatus('info');
        }
      } catch (e: any) {
        console.error('Error handling auth callback:', e);
        if (isMounted) {
          setStatus('info');
        }
      }
    };

    handleCallback();

    const subscription = Linking.addEventListener('url', (event) => {
      processUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);

  const handleContinue = async () => {
    try {
      await setAccountOnboardingStep('notifications');
    } catch { }
    router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {status === 'verifying' && (
        <View style={styles.card}>
          <ActivityIndicator size="large" color={theme.primary} />
          <View style={styles.textGroup}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              Vérification en cours…
            </Text>
            <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
              Nous validons votre compte Névé, un instant…
            </Text>
          </View>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.greenBadge }]}>
            <CheckCircle2 size={44} color={theme.statusBgSuccess} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              Compte validé avec succès ! 🎉
            </Text>
            <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
              Votre adresse e-mail est confirmée. Redirection vers votre parcours dans quelques secondes…
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <Button
              title="Continuer"
              variant="primary"
              onPress={handleContinue}
            />
          </View>
        </View>
      )}

      {status === 'info' && (
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.greenBadge }]}>
            <CheckCircle2 size={44} color={theme.statusBgSuccess} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              E-mail vérifié ! 🎉
            </Text>
            <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
              Votre adresse e-mail a bien été confirmée. Poursuivez votre parcours ci-dessous.
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <Button
              title="Continuer mon inscription"
              variant="primary"
              onPress={handleContinue}
            />
          </View>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.card}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.statusBgErrorSubtle || '#FFE2E2' },
            ]}>
            <AlertCircle size={44} color={theme.statusBgError} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              Lien invalide ou expiré
            </Text>
            <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
              {errorMessage ||
                'Ce lien de confirmation n’est plus valide ou a déjà été utilisé.'}
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <Button
              title="Retour à la connexion"
              variant="primary"
              onPress={() => router.replace('/(auth)/register')}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  titleText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    marginTop: 12,
  },
});
