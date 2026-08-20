-- Migration : date d'achèvement du parcours d'inscription, portée par le compte.
--
-- Jusqu'ici, savoir si un compte avait fait son parcours reposait sur un drapeau
-- dans AsyncStorage — donc sur l'appareil — et, à défaut, sur une heuristique :
-- « le profil a-t-il un nom ou une adresse de domicile ? ». Cette heuristique est
-- toujours vraie. Le déclencheur `handle_new_user` remplit `full_name` dès la
-- création du compte, avec la partie gauche de l'e-mail quand le fournisseur
-- n'en donne pas. Un compte Google flambant neuf passait donc pour un habitué et
-- atterrissait directement sur l'explorateur, sans autorisations, sans adresse de
-- domicile, sans pass ni newsletter.
--
-- La colonne enregistre le fait plutôt que de le déduire : elle n'est écrite
-- qu'au bout du parcours, et seul ce parcours l'écrit.
--
-- Nullable : un compte qui n'a pas fini n'a pas de date, et c'est exactement ce
-- qu'on veut lire.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_onboarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.account_onboarded_at IS
  'Instant où le parcours d''inscription a été mené à son terme. NULL tant qu''il ne l''a pas été.';

-- Reprise des comptes existants. Une adresse de domicile ne s'obtient que par
-- l'étape correspondante du parcours ou par l'écran de profil : sa présence est
-- la seule trace fiable, sur les données déjà en place, d'un parcours mené au
-- bout. Les autres comptes le rejoueront une fois — sans perte, les étapes ne
-- font qu'écrire ce qu'elles demandent.
UPDATE public.profiles
  SET account_onboarded_at = COALESCE(updated_at, created_at, now())
  WHERE account_onboarded_at IS NULL
    AND home_location IS NOT NULL;
