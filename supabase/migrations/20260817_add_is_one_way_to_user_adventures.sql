-- Migration: distinguer un aller simple d'un aller-retour.
--
-- `return_train` est obligatoire dans le modèle : en aller simple, le trajet
-- aller y est recopié faute de mieux. Rien ne permettait donc de savoir, à la
-- relecture d'une aventure, si ce retour avait réellement été planifié — la
-- fiche affichait un train de retour qui n'existait pas.
--
-- Les aventures déjà enregistrées passent à `false`, ce qui préserve leur
-- affichage actuel : toutes ont été créées quand l'aller simple ne sautait pas
-- encore l'étape retour.
ALTER TABLE public.user_adventures
  ADD COLUMN IF NOT EXISTS is_one_way BOOLEAN NOT NULL DEFAULT false;
