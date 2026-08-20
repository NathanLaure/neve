-- Migration : lieu de résidence principal, déclaré à l'inscription.
--
-- C'est ce lieu que le profil affiche sous le nom du randonneur (« Paris, 17ᵉ »),
-- et non son adresse e-mail. Il ne remplace pas la position GPS, qui reste la
-- seule à dire où l'utilisateur se trouve à l'instant T : celui-ci dit d'où il
-- part d'habitude, y compris quand la géolocalisation est refusée.
--
-- Les coordonnées accompagnent le libellé parce qu'un nom de commune ne se
-- reconvertit pas en point sans un nouvel appel de géocodage. Toutes nullables :
-- l'étape est facultative, et les comptes créés avant cette migration n'ont
-- rien à déclarer rétroactivement.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_location TEXT,
  ADD COLUMN IF NOT EXISTS home_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS home_lng NUMERIC;

COMMENT ON COLUMN public.profiles.home_location IS
  'Libellé du lieu de résidence principal, tel que choisi dans la recherche de lieux à l''inscription.';
