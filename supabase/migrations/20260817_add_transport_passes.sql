-- Migration: abonnements de transport détenus par l'utilisateur.
--
-- Un randonneur peut en cumuler plusieurs (Navigo en Île-de-France + Carte
-- Avantage pour le TER du week-end), d'où un tableau et non une colonne unique.
-- Liste vide = aucun abonnement, ce qui est aussi le défaut à l'inscription :
-- l'étape est facultative dans le parcours de création de compte.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS transport_passes TEXT[] NOT NULL DEFAULT '{}';
