-- Migration : centre de retours (suggestions et assistance).
--
-- Une seule table pour les quatre intentions du formulaire. Le tri se fait sur
-- `intent` et `status`, pas sur des tables séparées : un signalement qui se
-- révèle être une idée change de colonne, pas de place.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- `set null` et non `cascade` : supprimer son compte doit rompre le lien avec
  -- le retour, pas effacer le retour. Un bug signalé reste vrai après le départ
  -- de celui qui l'a vu, et la ligne devenue anonyme n'est plus une donnée
  -- personnelle. Voir `delete_own_account`, qui n'a donc rien à faire ici.
  user_id uuid references auth.users (id) on delete set null,

  intent text not null check (intent in ('problem', 'data', 'idea', 'help')),

  -- Sujet du signalement, seulement pour `data` : ce sur quoi porte la
  -- correction, et son identifiant quand on le connaît.
  subject_kind text check (subject_kind in ('hike', 'journey', 'other')),
  subject_id text,

  message text not null check (char_length(message) between 1 and 5000),

  -- Chemin dans le bucket `feedback`, pas une URL : le bucket est privé et les
  -- URL signées expirent.
  screenshot_path text,

  -- Contexte technique joint automatiquement. `update_id` est le plus utile de
  -- tous : plusieurs mises à jour OTA se succèdent sur un même `build_number`,
  -- qui ne suffit donc pas à savoir quel code tournait.
  app_version text,
  build_number text,
  update_id text,
  runtime_version text,
  platform text,
  os_version text,
  screen text,

  status text not null default 'new'
    check (status in ('new', 'in_progress', 'done', 'declined'))
);

-- Le tri se fait par état puis par date : c'est l'ordre de lecture d'une file.
create index if not exists feedback_status_created_at_idx
  on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;

-- Écriture réservée au propriétaire de la ligne. Rien n'empêche d'écrire pour
-- soi, rien ne permet d'écrire pour autrui.
drop policy if exists "Users can submit their own feedback" on public.feedback;
create policy "Users can submit their own feedback"
  on public.feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Lecture de ses propres envois. Sans elle, un `insert().select()` échouerait
-- alors même que l'écriture a réussi.
drop policy if exists "Users can read their own feedback" on public.feedback;
create policy "Users can read their own feedback"
  on public.feedback for select
  to authenticated
  using (user_id = auth.uid());

-- Ni update ni delete : un retour envoyé ne se retire pas. Le tri se fait
-- depuis la console, hors des politiques.

-- Bucket des captures d'écran.
--
-- Privé, contrairement aux avatars : une capture peut montrer n'importe quoi de
-- l'écran de son auteur. La lecture passe par une URL signée depuis la console.
insert into storage.buckets (id, name, public)
values ('feedback', 'feedback', false)
on conflict (id) do nothing;

-- Même convention que les avatars : le premier segment du chemin est
-- l'identifiant du propriétaire, et c'est sur lui que reposent les politiques.
drop policy if exists "Users can upload their own feedback screenshot" on storage.objects;
create policy "Users can upload their own feedback screenshot"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'feedback'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own feedback screenshot" on storage.objects;
create policy "Users can read their own feedback screenshot"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'feedback'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
