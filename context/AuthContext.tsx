import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  defaultStation?: string;
  preferredDifficulty?: string;
  favoriteCount?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  signUp: (email: string, password: string, fullName: string, defaultStation?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: any }>;
  checkUserExists: (email: string) => Promise<boolean>;
  signOut: () => Promise<{ error: any }>;
  completeOnboarding: () => void;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const loadUserProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        setProfile({
          id: data.id,
          fullName: data.full_name || currentUser.user_metadata?.full_name || 'Randonneur',
          avatarUrl: data.avatar_url,
          defaultStation: data.default_station || 'Gare de Lyon',
          preferredDifficulty: data.preferred_difficulty || 'Modéré',
          favoriteCount: data.favorite_count || 0,
        });
      } else {
        // Fallback user profile if table is not created yet
        setProfile({
          id: currentUser.id,
          fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Randonneur',
          defaultStation: 'Gare de Lyon',
          preferredDifficulty: 'Modéré',
          favoriteCount: 3,
        });
      }
    } catch {
      setProfile({
        id: currentUser.id,
        fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Randonneur',
        defaultStation: 'Gare de Lyon',
        preferredDifficulty: 'Modéré',
        favoriteCount: 3,
      });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    defaultStation: string = 'Paris Gare de Lyon'
  ) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          default_station: defaultStation,
        },
      },
    });

    if (!error && data.user) {
      setUser(data.user);
      setSession(data.session);
      setProfile({
        id: data.user.id,
        fullName,
        defaultStation,
        preferredDifficulty: 'Modéré',
        favoriteCount: 0,
      });
    }
    setIsLoading(false);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      setUser(data.user);
      setSession(data.session);
      await loadUserProfile(data.user);
    }
    setIsLoading(false);
    return { error };
  };

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
    });
    setIsLoading(false);
    return { error };
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', email.trim().toLowerCase())
        .maybeSingle();
      return !!data;
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
    return { error };
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' };
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
        default_station: updates.defaultStation,
        preferred_difficulty: updates.preferredDifficulty,
        updated_at: new Date().toISOString(),
      });
      return { error };
    } catch (err) {
      return { error: err };
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
        signUp,
        signIn,
        signInWithOAuth,
        checkUserExists,
        signOut,
        completeOnboarding,
        resetPassword,
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
