-- Migration : suppression de son propre compte, depuis l'app.
--
-- Obligation réglementaire (RGPD, article 17) mais aussi contractuelle : Google
-- Play impose depuis 2024, à toute application permettant la création d'un
-- compte, une suppression accessible DANS l'app — doublée d'une URL web pour
-- ceux qui l'ont désinstallée. L'App Store demande la même chose (règle
-- 5.1.1(v)).
--
-- `delete_unconfirmed_user` ne couvre pas ce besoin : elle ne s'applique qu'aux
-- comptes dont l'adresse n'a jamais été validée, pour rattraper une inscription
-- abandonnée.
--
-- Le gros du travail est fait par les clés étrangères, toutes en CASCADE :
--
--   auth.users → public.profiles → public.user_adventures
--                                → public.user_favorites
--                                → public.hike_comments
--
-- Supprimer la ligne d'authentification suffit donc à effacer tout le
-- relationnel. Reste la photo de profil, qui vit dans le stockage et qu'aucune
-- cascade n'atteint.
--
-- `SECURITY DEFINER` parce que `auth.users` n'est pas accessible au rôle
-- `authenticated`. La fonction ne prend aucun paramètre et ne lit que
-- `auth.uid()` : elle ne peut donc supprimer que l'appelant, jamais un tiers.
create or replace function public.delete_own_account()
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_user_id uuid := auth.uid();
begin
  -- Appel sans session : rien à supprimer, et surtout pas de `delete` non filtré.
  if target_user_id is null then
    return false;
  end if;

  -- Filet, pas chemin principal : l'app supprime la photo par l'API de stockage
  -- avant d'appeler cette fonction, seule façon d'effacer le fichier lui-même.
  -- Ici on ne retire que la ligne d'index, pour le cas où cet appel aurait
  -- échoué — un enregistrement qui pointe vers un compte disparu n'a rien à
  -- faire là. Convention du bucket : un objet par compte, `{user_id}/avatar`,
  -- dont le premier segment du chemin porte le propriétaire.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = target_user_id::text;

  -- Les cascades emportent le profil, les aventures, les favoris et les avis.
  delete from auth.users where id = target_user_id;

  return true;
end;
$function$;

-- Exécutable par les seuls comptes connectés : un visiteur anonyme n'a pas de
-- `auth.uid()`, l'appel ne ferait rien, mais autant fermer la porte.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
