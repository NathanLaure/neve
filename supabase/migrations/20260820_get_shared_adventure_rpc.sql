-- Migration : lecture d'une aventure partagée par son jeton, en deux niveaux.
--
-- La politique en place disait « toute aventure qui possède un jeton est
-- lisible par le rôle anon ». RLS ne voit pas le `WHERE` de la requête : la
-- condition ne vérifiait donc aucun jeton, elle ouvrait la table entière. Et la
-- clé anonyme n'est pas un secret — elle est en clair dans le site et embarquée
-- dans l'application. N'importe qui pouvait récupérer les aventures partagées de
-- tous les comptes : gares, dates, et depuis l'ajout de `departure_lat` /
-- `departure_lng`, le domicile de leurs auteurs.
--
-- Deux fonctions plutôt qu'une, parce que deux publics très différents lisent
-- ces liens.

-- 1. L'APERÇU, ouvert à tous.
--
-- Il ne sert qu'à composer la vignette d'un lien : titre, image, date. C'est un
-- robot sans session qui vient la chercher lorsqu'on colle l'adresse dans une
-- messagerie, et le partage perdrait l'essentiel de son intérêt si chaque lien
-- s'affichait sous une carte générique.
--
-- Le point de départ n'en fait délibérément pas partie : c'est une adresse de
-- rue, souvent le domicile de celui qui partage, et elle finissait jusqu'ici
-- dans la description méta de la page — donc indexable.
create or replace function public.get_shared_adventure_preview(p_token text)
returns table (
  outward_date date,
  return_date date,
  is_one_way boolean,
  hike_snapshot jsonb
)
language sql
security definer
stable
set search_path to ''
as $function$
  select a.outward_date, a.return_date, a.is_one_way, a.hike_snapshot
    from public.user_adventures a
   where a.share_token = p_token
   limit 1;
$function$;

revoke all on function public.get_shared_adventure_preview(text) from public;
grant execute on function public.get_shared_adventure_preview(text) to anon, authenticated;

-- 2. LA FEUILLE DE ROUTE, réservée aux comptes.
--
-- Horaires, gares, correspondances : ce qui fait la valeur du lien, et ce pour
-- quoi on demande un compte. `authenticated` seulement — un appelant anonyme
-- n'obtient rien, ce qui est la porte d'entrée de l'écran de connexion, sur le
-- site comme dans l'application.
--
-- Conséquence à connaître : la page `/share/[token]` du site est un composant
-- serveur, dont le client Supabase n'a pas de session. Cette lecture doit donc
-- se faire côté client, là où la session existe.
--
-- Les colonnes rendues sont exactement celles qu'affiche la feuille de route.
-- `user_id`, les coordonnées, la liste des voyageurs et l'état d'achat n'y sont
-- pas : une aventure partagée dit où l'on va, pas d'où précisément l'on part ni
-- avec qui.
--
-- `rando_id` y figure, en revanche : c'est lui qui permettra à l'application
-- d'ouvrir la bonne randonnée quand le destinataire reprendra l'aventure à son
-- compte.
create or replace function public.get_shared_adventure(p_token text)
returns table (
  share_token text,
  rando_id text,
  outward_date date,
  return_date date,
  outward_train jsonb,
  return_train jsonb,
  departure_station_name text,
  return_station_name text,
  is_one_way boolean,
  is_reversed boolean,
  hike_snapshot jsonb
)
language sql
security definer
stable
set search_path to ''
as $function$
  select a.share_token,
         a.rando_id,
         a.outward_date,
         a.return_date,
         a.outward_train,
         a.return_train,
         a.departure_station_name,
         a.return_station_name,
         a.is_one_way,
         a.is_reversed,
         a.hike_snapshot
    from public.user_adventures a
   where a.share_token = p_token
   limit 1;
$function$;

revoke all on function public.get_shared_adventure(text) from public, anon;
grant execute on function public.get_shared_adventure(text) to authenticated;
