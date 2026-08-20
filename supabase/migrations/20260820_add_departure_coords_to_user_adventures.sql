-- Migration : coordonnées du point de départ et du lieu de retour d'une aventure.
--
-- L'aventure enregistrée ne retenait que des noms. Revenir corriger un trajet
-- rouvrait donc l'écran de choix sans point de départ, qui retombait sur la
-- position de l'appareil à cet instant : on planifiait depuis chez soi, on
-- modifiait l'aller depuis le bureau, et le calculateur proposait des itinéraires
-- partant du bureau. Le nom affiché, lui, restait celui du domicile — l'écart ne
-- se voyait donc pas.
--
-- Un nom ne se reconvertit pas en point sans un nouvel appel de géocodage, qui
-- retomberait de toute façon à côté du quai retenu à la planification. On garde
-- donc le point lui-même.
--
-- Toutes nullables : les aventures enregistrées avant cette migration n'ont pas
-- ces coordonnées, et les écrans savent retomber sur la position de l'appareil
-- comme ils le faisaient jusqu'ici.
ALTER TABLE public.user_adventures
  ADD COLUMN IF NOT EXISTS departure_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS departure_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS return_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS return_lng NUMERIC;

COMMENT ON COLUMN public.user_adventures.departure_lat IS
  'Latitude du point de départ retenu à la planification, pour recalculer un trajet depuis le même endroit.';
