import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function parseSupabaseUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const hash = url.substring(hashIndex + 1);
    hash.split('&').forEach((part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const query = url.substring(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined);
    query.split('&').forEach((part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
  }
  return params;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsed = parseSupabaseUrl(initialUrl);
          if (parsed.access_token && parsed.refresh_token) {
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
            });
            setIsSuccess(true);
            setTimeout(() => {
              router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
            }, 1800);
            return;
          } else if (parsed.code) {
            await supabase.auth.exchangeCodeForSession(parsed.code);
            setIsSuccess(true);
            setTimeout(() => {
              router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
            }, 1800);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setIsSuccess(true);
          setTimeout(() => {
            router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
          }, 1800);
          return;
        }
      } catch (e) {
        console.error('Error handling auth callback:', e);
      }
      setTimeout(() => {
        router.replace({ pathname: '/(auth)/register', params: { mode: 'notifications' } });
      }, 1500);
    };

    handleCallback();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isSuccess ? (
        <>
          <View style={[styles.iconCircle, { backgroundColor: theme.statusBgSuccessSubtle || '#F2F6F3' }]}>
            <CheckCircle2 size={48} color={theme.statusBgSuccess || '#386641'} />
          </View>
          <Text style={[styles.titleText, { color: theme.text }]}>
            E-mail confirmé avec succès ! 🎉
          </Text>
          <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
            Redirection vers votre aventure Névé...
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.text, { color: theme.textMuted }]}>
            Confirmation de votre compte Névé...
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 22,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    textAlign: 'center',
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
  },
});
