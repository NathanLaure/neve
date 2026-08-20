import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { makeRedirectUri } from 'expo-auth-session';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { TransportPassId, normalizePasses } from '@/types/passenger';

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  fullName: string;
  /** `null` retire la photo — `undefined` la laisse telle quelle. */
  avatarUrl?: string | null;
  defaultStation?: string;
  preferredDifficulty?: string;
  favoriteCount?: number;
  newsletterConsent?: boolean;
  /**
   * Lieu de résidence principal, déclaré à l'inscription — « Paris, 17ᵉ ». Ne
   * dit pas où l'utilisateur se trouve maintenant (c'est le rôle de la position
   * GPS), mais d'où il part d'habitude. Absent tant qu'il n'a rien déclaré.
   */
  homeLocation?: string;
  homeLat?: number;
  homeLng?: number;
  /**
   * Abonnements de transport détenus, déclarés à l'inscription et modifiables
   * depuis le profil. Liste vide = aucun abonnement.
   */
  transportPasses?: TransportPassId[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedAccountOnboarding: boolean;
  accountOnboardingStep: string | null;
  /**
   * `device` : seules les autorisations système sont à (re)poser, le reste du
   * profil est déjà renseigné sur le compte. Le parcours s'arrête alors après la
   * localisation au lieu d'enchaîner sur la gare d'origine et les pass.
   */
  accountOnboardingScope: 'full' | 'device';
  /**
   * Recalcule l'état du parcours pour ce compte, l'applique au contexte et le
   * rend. Les connexions OAuth naviguent dessus : elles doivent partir de la même
   * réponse que le démarrage de l'app, sans quoi elles se contredisent.
   */
  refreshAccountOnboarding: (userId: string) => Promise<AccountOnboardingState>;
  setAccountOnboardingStep: (step: string) => Promise<void>;
  completeAccountOnboarding: () => Promise<void>;
  isEmailConfirmed: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    defaultStation?: string,
    newsletterConsent?: boolean,
    /**
     * Lieu de résidence déclaré à l'étape qui suit « Parlez-nous de vous ».
     * Écrit avec le profil initial plutôt que par un `updateProfile` qui suivrait :
     * l'utilisateur n'est pas encore posé dans l'état du contexte à cet instant.
     */
    home?: { location: string; latitude: number; longitude: number }
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
  /**
   * Demande le changement d'adresse e-mail. Rien n'est appliqué tout de suite :
   * Supabase envoie un lien à la nouvelle adresse, et c'est ce clic qui bascule
   * le compte. `user.email` garde donc l'ancienne valeur jusque-là.
   */
  updateUserEmail: (email: string) => Promise<{ error: string | null }>;
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

/**
 * Au-delà, on n'attend plus la réponse de la base sur l'état du parcours.
 *
 * Le démarrage de l'app s'y suspend : mieux vaut une décision prise sur les
 * seules autorisations système qu'un splash qui ne se lève pas.
 */
const PROFILE_READ_TIMEOUT_MS = 2500;

/** Verdict rendu par `refreshAccountOnboarding`, sur lequel les écrans naviguent. */
export interface AccountOnboardingState {
  completed: boolean;
  /** Étape à afficher quand le parcours n'est pas fini. */
  step: string | null;
  scope: 'full' | 'device';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedAccountOnboarding, setHasCompletedAccountOnboarding] = useState(true);
  const [accountOnboardingStep, setAccountOnboardingStepState] = useState<string | null>(null);
  const [accountOnboardingScope, setAccountOnboardingScope] = useState<'full' | 'device'>('full');

  const isEmailConfirmed = !!user?.email_confirmed_at;

  /**
   * Première autorisation système jamais demandée sur cet appareil, s'il en reste.
   *
   * Ne renvoie que les étapes liées à l'appareil. La gare d'origine, les pass et
   * la newsletter vivent sur le profil : les redemander à chaque nouveau téléphone
   * serait à la fois pénible et faux.
   *
   * Un refus n'est pas un oubli : `denied` veut dire que l'utilisateur a déjà
   * répondu ici, on ne le relance pas. Et toute erreur de sondage rend `null` —
   * cette fonction garde la porte d'entrée de l'app, elle ne doit jamais la
   * bloquer.
   */
  const findPendingDevicePermission = async (): Promise<string | null> => {
    try {
      const notifications = await Notifications.getPermissionsAsync();
      if (notifications.status === 'undetermined') return 'notifications';

      const location = await Location.getForegroundPermissionsAsync();
      if (location.status === 'undetermined') return 'location';

      return null;
    } catch (e) {
      console.warn('Could not read device permissions:', e);
      return null;
    }
  };

  /**
   * Où en est ce compte de son parcours d'inscription, et sur cet appareil ?
   *
   * Un seul endroit répond à la question. Les connexions OAuth la posaient
   * chacune de leur côté, avec leur propre règle — « le profil a-t-il un nom ou
   * un domicile ? » — qui répondait toujours oui : le déclencheur
   * `handle_new_user` remplit `full_name` dès la création du compte. Un compte
   * Google tout neuf était donc pris pour un habitué et entrait directement dans
   * l'app, sans autorisations ni domicile ni pass.
   *
   * L'ordre des sources va du plus local au plus lointain, et ce n'est pas un
   * détail : les deux premières décrivent cet appareil-ci, la troisième décrit le
   * compte partout.
   */
  const resolveAccountOnboarding = async (userId: string): Promise<AccountOnboardingState> => {
    try {
      const isCompleted = await AsyncStorage.getItem(`@neve_account_onboarding_completed_${userId}`);
      if (isCompleted === 'true') return { completed: true, step: null, scope: 'full' };

      const savedStep = await AsyncStorage.getItem(`@neve_account_onboarding_step_${userId}`);
      if (savedStep) {
        /* La portée est reprise avec l'étape : sans elle, une app tuée entre les
           notifications et la localisation reprendrait en parcours complet et
           redemanderait la gare d'origine, les pass et la newsletter. */
        const savedScope = await AsyncStorage.getItem(
          `@neve_account_onboarding_scope_${userId}`
        );
        return {
          completed: false,
          step: savedStep,
          scope: savedScope === 'device' ? 'device' : 'full',
        };
      }

      /*
       * Ni drapeau d'achèvement, ni étape en suspens : deux situations très
       * différentes que ces clés ne distinguent pas, puisqu'elles vivent dans
       * AsyncStorage, donc sur l'appareil. Un compte qui a fait son parcours
       * ailleurs, un appareil neuf et un compte qui vient d'être créé se
       * ressemblent parfaitement ici.
       *
       * Le compte, lui, sait : `account_onboarded_at` n'est écrit qu'au bout du
       * parcours, et seul le parcours l'écrit.
       *
       * Cette lecture retient le splash — voir `getSession()` plus bas — donc
       * elle est bornée. Un réseau qui ne répond pas ne doit pas laisser
       * l'utilisateur devant un écran de démarrage : au-delà du délai, on
       * retombe sur ce que le système sait dire tout seul.
       */
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROFILE_READ_TIMEOUT_MS);
      const { data, error } = await supabase
        .from('profiles')
        .select('account_onboarded_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();
      clearTimeout(timeout);

      if (error) {
        /* Hors ligne ou colonne absente : on ne sait pas. Dans le doute on ne
           réinflige pas le parcours complet à quelqu'un qui l'a peut-être déjà
           fait — on se contente de rattraper les autorisations manquantes, ce
           que le système sait dire sans réseau. */
        console.warn('Could not read account onboarding state, falling back to device probe:', error);
        const pendingOffline = await findPendingDevicePermission();
        return pendingOffline
          ? { completed: false, step: pendingOffline, scope: 'device' }
          : { completed: true, step: null, scope: 'full' };
      }

      if (!data?.account_onboarded_at) {
        return { completed: false, step: 'notifications', scope: 'full' };
      }

      /*
       * Le compte a fait son parcours, mais peut-être pas sur ce téléphone-ci :
       * une autorisation `undetermined` n'a jamais été demandée ICI.
       */
      const pending = await findPendingDevicePermission();
      if (pending) return { completed: false, step: pending, scope: 'device' };

      /* Rien à redemander : on pose le drapeau local pour que les lancements
         suivants répondent sans réseau. */
      await AsyncStorage.setItem(`@neve_account_onboarding_completed_${userId}`, 'true');
      return { completed: true, step: null, scope: 'full' };
    } catch (e) {
      console.warn('Error checking account onboarding:', e);
      return { completed: true, step: null, scope: 'full' };
    }
  };

  /** Résout l'état puis l'applique au contexte, et le rend à l'appelant. */
  const refreshAccountOnboarding = async (userId: string): Promise<AccountOnboardingState> => {
    const state = await resolveAccountOnboarding(userId);
    setHasCompletedAccountOnboarding(state.completed);
    setAccountOnboardingScope(state.scope);
    setAccountOnboardingStepState(state.step);
    return state;
  };

  const setAccountOnboardingStep = async (step: string) => {
    setAccountOnboardingStepState(step);
    setHasCompletedAccountOnboarding(false);
    const targetUserId = user?.id || session?.user?.id;
    if (targetUserId) {
      try {
        await AsyncStorage.setItem(`@neve_account_onboarding_step_${targetUserId}`, step);
        // La portée en cours suit l'étape, pour survivre à une app tuée en route.
        await AsyncStorage.setItem(
          `@neve_account_onboarding_scope_${targetUserId}`,
          accountOnboardingScope
        );
        await AsyncStorage.removeItem(`@neve_account_onboarding_completed_${targetUserId}`);
      } catch (e) {
        console.warn('Error saving account onboarding step:', e);
      }
    }
  };

  const completeAccountOnboarding = async () => {
    setHasCompletedAccountOnboarding(true);
    setAccountOnboardingScope('full');
    setAccountOnboardingStepState(null);
    const targetUserId = user?.id || session?.user?.id;
    if (targetUserId) {
      try {
        await AsyncStorage.setItem(`@neve_account_onboarding_completed_${targetUserId}`, 'true');
        await AsyncStorage.removeItem(`@neve_account_onboarding_step_${targetUserId}`);
        await AsyncStorage.removeItem(`@neve_account_onboarding_scope_${targetUserId}`);
      } catch (e) {
        console.warn('Error completing account onboarding:', e);
      }

      /*
       * Le même fait, mais sur le compte plutôt que sur l'appareil : c'est lui
       * que relira une réinstallation ou un second téléphone. Les clés
       * AsyncStorage ci-dessus ne franchissent pas ces frontières.
       *
       * Écrit même quand le parcours réduit s'achève : il ne s'ouvre que sur un
       * compte déjà passé par le parcours complet, et réécrire une date déjà
       * posée ne coûte rien.
       */
      const { error } = await supabase
        .from('profiles')
        .update({ account_onboarded_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (error) {
        /* Sans lever : le parcours est fini du point de vue de l'utilisateur, et
           le drapeau local suffit sur cet appareil-ci. Au pire le parcours sera
           reproposé sur le suivant. */
        console.warn('Could not stamp account onboarding completion:', error);
      }
    }
  };

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
          homeLocation: data.home_location ?? currentUser.user_metadata?.home_location ?? undefined,
          // `NUMERIC` revient en chaîne via PostgREST : la conversion est explicite.
          homeLat: data.home_lat != null ? Number(data.home_lat) : undefined,
          homeLng: data.home_lng != null ? Number(data.home_lng) : undefined,
          // Colonne `text[]` : le contenu n'est pas typé côté base, d'où le filtrage.
          transportPasses: normalizePasses(data.transport_passes),
        });

        /* `auth.users.email` fait foi, `profiles.email` n'en est qu'une copie
           consultable — celle sur laquelle s'appuient `checkUserExists` et
           `checkUserProvider`. Un changement d'adresse ne bascule qu'à la
           confirmation, hors de l'app : c'est ici, au chargement suivant, qu'on
           s'en aperçoit et qu'on réaligne. */
        if (currentUser.email && data.email !== currentUser.email) {
          supabase
            .from('profiles')
            .update({ email: currentUser.email, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id)
            .then(({ error: syncError }) => {
              if (syncError) console.warn('Could not sync profile email:', syncError);
            });
        }
      } else {
        setProfile({
          id: currentUser.id,
          fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Randonneur',
          avatarUrl: currentUser.user_metadata?.avatar_url,
          defaultStation: 'Paris Gare de Lyon',
          preferredDifficulty: 'Modéré',
          favoriteCount: 0,
          newsletterConsent: currentUser.user_metadata?.newsletter_consent ?? false,
          transportPasses: [],
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
        transportPasses: [],
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
        /*
         * Attendu, contrairement au profil : c'est cette réponse qui décide de
         * l'écran d'après. `app/index.tsx` redirige dès que `isLoading` retombe,
         * en lisant `hasCompletedAccountOnboarding` — dont le défaut est `true`,
         * c'est-à-dire « je ne sais pas encore ». Lever le rideau avant la
         * réponse envoyait donc sur l'explorateur un compte qui devait reprendre
         * son parcours.
         *
         * L'attente est bornée côté résolution (voir PROFILE_READ_TIMEOUT_MS).
         */
        await refreshAccountOnboarding(session.user.id);
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
        refreshAccountOnboarding(session.user.id);
      } else {
        setProfile(null);
        setHasCompletedAccountOnboarding(true);
        setAccountOnboardingStepState(null);
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
    newsletterConsent: boolean = false,
    home?: { location: string; latitude: number; longitude: number }
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
          home_location: home?.location,
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
        /* Laissés à `undefined` — et donc absents de la requête — quand l'étape
           a été passée : rien à écrire, et la colonne garde sa valeur. */
        home_location: home?.location,
        home_lat: home?.latitude,
        home_lng: home?.longitude,
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
      const redirectUrl = makeRedirectUri();
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

  /*
   * Le changement ne prend effet qu'une fois le lien de confirmation ouvert
   * depuis la nouvelle boîte : Supabase ne fait ici qu'envoyer ce lien. La
   * colonne `profiles.email` n'est donc pas touchée — elle se réaligne au
   * chargement du profil suivant, une fois `auth.users.email` réellement changé
   * (voir `loadUserProfile`).
   */
  const updateUserEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.updateUser(
      { email: cleanEmail },
      { emailRedirectTo: 'https://neve-rando.fr/auth/confirmed' }
    );
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
        home_location: updates.homeLocation,
        home_lat: updates.homeLat,
        home_lng: updates.homeLng,
        transport_passes: updates.transportPasses,
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
        hasCompletedAccountOnboarding,
        accountOnboardingStep,
        accountOnboardingScope,
        refreshAccountOnboarding,
        setAccountOnboardingStep,
        completeAccountOnboarding,
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
        updateUserEmail,
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
