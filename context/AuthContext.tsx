import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  defaultStation?: string;
  preferredDifficulty?: string;
  favoriteCount?: number;
  newsletterConsent?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  isEmailConfirmed: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    defaultStation?: string,
    newsletterConsent?: boolean
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (
    provider: 'google' | 'apple' | 'facebook'
  ) => Promise<{ error: string | null; cancelled?: boolean }>;
  checkUserExists: (email: string) => Promise<boolean>;
  checkUserProvider: (email: string) => Promise<{ exists: boolean; providers: string[] }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: string | null }>;
  checkEmailConfirmed: (email?: string) => Promise<boolean>;
  signOut: () => Promise<{ error: string | null }>;
  deleteUnconfirmedUser: () => Promise<void>;
  completeOnboarding: () => void;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateUserPassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
}

export function translateAuthError(error: any): string {
  if (!error) return '';

  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error.message && typeof error.message === 'string') {
    msg = error.message;
  } else if (error.error_description && typeof error.error_description === 'string') {
    msg = error.error_description;
  } else if (typeof error === 'object') {
    if (error.status === 500) {
      return "Erreur serveur Supabase (500) : l'envoi du mail de confirmation a échoué. Vérifiez vos identifiants SMTP ou désactivez la confirmation d'email dans Supabase.";
    }
    try {
      msg = JSON.stringify(error);
    } catch {
      msg = String(error);
    }
  } else {
    msg = String(error);
  }

  if (msg.includes('535') || msg.includes('5.7.0') || msg.includes('unexpected_failure') || msg.includes('"status":500')) {
    return "Erreur d'envoi d'e-mail par le serveur (SMTP 535). Les identifiants du serveur d'envoi SMTP dans votre dashboard Supabase sont invalides, ou l'option 'Confirm email' doit être désactivée.";
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'E-mail ou mot de passe incorrect. Si votre compte a été créé via Google, connectez-vous avec le bouton Google ci-dessous.';
  }
  if (msg.includes('User already registered') || msg.includes('user_already_exists')) {
    return 'Un compte existe déjà avec cette adresse e-mail.';
  }
  if (
    msg.toLowerCase().includes('password should') ||
    msg.toLowerCase().includes('password must') ||
    msg.toLowerCase().includes('weak_password')
  ) {
    return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
  }
  if (msg.includes('Rate limit exceeded') || msg.includes('over_email_send_rate_limit')) {
    return 'Trop de tentatives. Veuillez patienter un instant avant de réessayer.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Veuillez confirmer votre adresse e-mail avant de vous connecter.';
  }
  if (msg.includes('Unable to validate email address')) {
    return 'Adresse e-mail invalide.';
  }

  return msg;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const isEmailConfirmed = !!user?.email_confirmed_at;

  const loadUserProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile({
          id: data.id,
          fullName: data.full_name || currentUser.user_metadata?.full_name || 'Randonneur',
          avatarUrl: data.avatar_url || currentUser.user_metadata?.avatar_url,
          defaultStation: data.default_station || 'Paris Gare de Lyon',
          preferredDifficulty: data.preferred_difficulty || 'Modéré',
          favoriteCount: data.favorite_count || 0,
          newsletterConsent: data.newsletter_consent ?? currentUser.user_metadata?.newsletter_consent ?? false,
        });
      } else {
        setProfile({
          id: currentUser.id,
          fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Randonneur',
          avatarUrl: currentUser.user_metadata?.avatar_url,
          defaultStation: 'Paris Gare de Lyon',
          preferredDifficulty: 'Modéré',
          favoriteCount: 0,
          newsletterConsent: currentUser.user_metadata?.newsletter_consent ?? false,
        });
      }
    } catch {
      setProfile({
        id: currentUser.id,
        fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Randonneur',
        avatarUrl: currentUser.user_metadata?.avatar_url,
        defaultStation: 'Paris Gare de Lyon',
        preferredDifficulty: 'Modéré',
        favoriteCount: 0,
        newsletterConsent: currentUser.user_metadata?.newsletter_consent ?? false,
      });
    }
  };

  useEffect(() => {
    // Restore onboarding state
    AsyncStorage.getItem('hasCompletedOnboarding').then((val) => {
      if (val === 'true') {
        setHasCompletedOnboarding(true);
      }
    });

    // 1. Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setIsLoading(false);
    });

    // 2. Listen to Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    defaultStation: string = 'Paris Gare de Lyon',
    newsletterConsent: boolean = false
  ) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = 'https://neve-rando.fr/auth/confirmed';
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          default_station: defaultStation,
          newsletter_consent: newsletterConsent,
        },
      },
    });

    if (error) {
      if (
        error.message?.includes('User already registered') ||
        error.message?.includes('user_already_exists')
      ) {
        const resendRes = await resendConfirmationEmail(cleanEmail);
        setIsLoading(false);
        if (!resendRes.error) {
          return { error: null, isResent: true };
        }
      }
      setIsLoading(false);
      return { error: translateAuthError(error) };
    }

    if (data.user) {
      setUser(data.user);
      setSession(data.session);
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: cleanEmail,
        full_name: fullName || cleanEmail.split('@')[0],
        default_station: defaultStation,
        newsletter_consent: newsletterConsent,
        updated_at: new Date().toISOString(),
      });
      await loadUserProfile(data.user);
    }
    setIsLoading(false);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setIsLoading(false);
      return { error: translateAuthError(error) };
    }

    if (data.user) {
      setUser(data.user);
      setSession(data.session);
      await loadUserProfile(data.user);
    }
    setIsLoading(false);
    return { error: null };
  };

  const signInWithOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setIsLoading(true);
    try {
      const redirectUrl = makeRedirectUri({
        path: 'auth/callback',
      });
      console.log('OAuth redirectUrl generated:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

      if (error) {
        setIsLoading(false);
        return { error: translateAuthError(error) };
      }

      if (data?.url) {
        console.log('Supabase OAuth authorization URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('WebBrowser openAuthSessionAsync result:', result);
        if (result.type === 'success' && result.url) {
          const params = parseSupabaseUrl(result.url);
          if (params.access_token && params.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            setIsLoading(false);
            return { error: sessionError ? translateAuthError(sessionError) : null, cancelled: false };
          } else if (params.code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
            setIsLoading(false);
            return { error: exchangeError ? translateAuthError(exchangeError) : null, cancelled: false };
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setIsLoading(false);
          return { error: null, cancelled: true };
        }
      }
      setIsLoading(false);
      return { error: null, cancelled: false };
    } catch (err: any) {
      setIsLoading(false);
      return { error: translateAuthError(err) };
    }
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_input: cleanEmail,
      });

      if (!error && typeof data === 'boolean') {
        return data;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      return !!profileData;
    } catch {
      return false;
    }
  };

  const checkUserProvider = async (
    email: string
  ): Promise<{ exists: boolean; providers: string[] }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.rpc('check_user_provider', {
        email_input: cleanEmail,
      });

      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          exists: !!row.user_exists,
          providers: Array.isArray(row.providers) ? row.providers : [],
        };
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      return {
        exists: !!profileData,
        providers: profileData ? ['email'] : [],
      };
    } catch {
      return { exists: false, providers: [] };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = 'https://neve-rando.fr/auth/confirmed';
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error ? translateAuthError(error) : null };
  };

  const checkEmailConfirmed = async (emailToCheck?: string): Promise<boolean> => {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.user?.email_confirmed_at) {
        setUser(refreshData.user);
        setSession(refreshData.session);
        return true;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        setUser(currentUser);
        return true;
      }

      const targetEmail = emailToCheck || user?.email;
      if (targetEmail) {
        const { data: isConfirmed } = await supabase.rpc('check_user_confirmed', {
          email_input: targetEmail.trim().toLowerCase(),
        });
        if (isConfirmed === true) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsLoading(false);
    return { error: error ? translateAuthError(error) : null };
  };

  const deleteUnconfirmedUser = async () => {
    try {
      if (user) {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.rpc('delete_unconfirmed_user');
      }
    } catch (e) {
      console.warn('Error deleting unconfirmed user:', e);
    }
    await signOut();
  };

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = 'https://neve-rando.fr/auth/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    return { error: error ? translateAuthError(error) : null };
  };

  const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? translateAuthError(error) : null };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Aucun utilisateur connecté.' };
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
        default_station: updates.defaultStation,
        preferred_difficulty: updates.preferredDifficulty,
        newsletter_consent: updates.newsletterConsent,
        updated_at: new Date().toISOString(),
      });
      return { error: error ? translateAuthError(error) : null };
    } catch (err) {
      return { error: translateAuthError(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        hasCompletedOnboarding,
        isEmailConfirmed,
        signUp,
        signIn,
        signInWithOAuth,
        checkUserExists,
        checkUserProvider,
        resendConfirmationEmail,
        checkEmailConfirmed,
        signOut,
        deleteUnconfirmedUser,
        completeOnboarding,
        resetPassword,
        updateUserPassword,
        updateProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
