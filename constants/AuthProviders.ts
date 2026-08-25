/**
 * Fournisseurs d'identité momentanément retirés des écrans de connexion.
 *
 * Apple y figure le temps de finaliser sa configuration. Le code des boutons et
 * le chemin OAuth restent en place : vider ce tableau suffit à les rétablir.
 *
 * **À savoir avant une sortie App Store.** Apple impose « Se connecter avec
 * Apple » dès lors qu'une application propose un autre service tiers de
 * connexion — c'est la règle 4.8 des directives de revue. Google et Facebook
 * étant proposés ici, cette mise en sommeil bloquerait la validation iOS. Elle
 * ne peut donc durer que le temps du test interne Android.
 */
export type AuthProvider = 'google' | 'apple' | 'facebook';

export const DISABLED_AUTH_PROVIDERS: AuthProvider[] = ['apple'];

export function isProviderEnabled(provider: AuthProvider): boolean {
  return !DISABLED_AUTH_PROVIDERS.includes(provider);
}
