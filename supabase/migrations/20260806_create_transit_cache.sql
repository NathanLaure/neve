-- Cache des itinéraires calculés par l'API PRIM (Île-de-France Mobilités / Navitia).
--
-- Pourquoi un cache : le palier gratuit de PRIM est plafonné à 1 000 requêtes par
-- jour, tous utilisateurs confondus. Une planification = 2 appels (aller + retour),
-- donc sans cache l'app sature le quota à ~500 planifications quotidiennes.
-- Les horaires théoriques ne bougeant pas d'une minute à l'autre, un même trajet
-- redemandé dans la journée doit être servi depuis cette table.
--
-- Accès : aucune policy n'est définie. La table est lue et écrite exclusivement par
-- l'Edge Function `transit-journeys`, qui utilise la clé service_role et contourne
-- donc le RLS. Avec RLS activé et zéro policy, les rôles `anon` et `authenticated`
-- ne peuvent ni lire ni écrire — ce qui est l'intention.

CREATE TABLE IF NOT EXISTS public.transit_cache (
  -- Empreinte de la requête : coordonnées arrondies + date + créneau horaire + sens.
  -- Construite côté Edge Function (voir buildCacheKey).
  cache_key   TEXT PRIMARY KEY,
  -- Tableau de TransitOption déjà normalisé, prêt à être renvoyé tel quel au client.
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sert la purge opportuniste des entrées périmées (DELETE ... WHERE created_at < ...).
CREATE INDEX IF NOT EXISTS transit_cache_created_at_idx
  ON public.transit_cache (created_at);

ALTER TABLE public.transit_cache ENABLE ROW LEVEL SECURITY;
