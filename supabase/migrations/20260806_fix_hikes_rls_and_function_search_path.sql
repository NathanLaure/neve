-- Correctif sécurité
--
-- 1. La policy "Allow anon and authenticated to insert/update hikes" était en
--    FOR ALL / USING (true) / WITH CHECK (true) pour le rôle `anon`. Comme la clé
--    anon est publique par conception (embarquée dans le bundle mobile), n'importe
--    qui pouvait INSERT, UPDATE et DELETE l'intégralité de la table `hikes`.
--
--    Les scripts d'ingestion utilisaient cette policy pour écrire. Ils sont
--    désormais passés sur la clé `service_role` (voir scripts/supabase-admin.ts),
--    qui contourne le RLS : aucune policy d'écriture n'est donc nécessaire.
--
-- 2. Ajout d'un search_path fixe sur les fonctions SECURITY DEFINER, pour empêcher
--    la résolution de noms via un schéma contrôlé par l'appelant.

-- --------------------------------------------------------------------------
-- 1. Suppression de l'écriture publique sur `hikes`
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow anon and authenticated to insert/update hikes" ON public.hikes;

-- La lecture publique reste assurée par la policy "Allow public select of hikes"
-- (FOR SELECT TO anon, authenticated), qui n'est pas modifiée ici.

-- --------------------------------------------------------------------------
-- 2. search_path fixe sur les fonctions SECURITY DEFINER
-- --------------------------------------------------------------------------
-- Ces fonctions qualifient déjà toutes leurs tables (public.*) et n'utilisent que
-- des fonctions de pg_catalog, qui reste implicitement résolu. search_path = ''
-- est donc sans effet de bord sur leur comportement.

ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_favorite_count_change() SET search_path = '';
ALTER FUNCTION public.handle_hike_rating_change() SET search_path = '';
ALTER FUNCTION public.delete_unconfirmed_user() SET search_path = '';
