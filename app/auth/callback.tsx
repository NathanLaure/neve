import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
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
            router.replace('/(tabs)');
            return;
          } else if (parsed.code) {
            await supabase.auth.exchangeCodeForSession(parsed.code);
            router.replace('/(tabs)');
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace('/(tabs)');
          return;
        }
      } catch (e) {
        console.error('Error handling auth callback:', e);
      }
      router.replace('/(tabs)');
    };

    handleCallback();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, { color: theme.textMuted }]}>
        Confirmation de votre compte Névé...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
  },
});
