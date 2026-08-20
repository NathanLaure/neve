-- Migration : photos de profil.
--
-- Bucket public en lecture : l'URL de la photo est stockée en clair dans
-- `profiles.avatar_url` et rendue par un simple <Image>, sans jeton signé à
-- renouveler. L'écriture, elle, est cloisonnée par utilisateur.
--
-- Convention de nommage : un seul objet par compte, `{user_id}/avatar`, écrasé
-- à chaque changement. Le premier segment du chemin est l'identifiant du
-- propriétaire, ce sur quoi reposent les politiques ci-dessous. Sans extension :
-- le type est porté par les métadonnées de l'objet, et un passage de JPEG à PNG
-- laisserait sinon un orphelin derrière lui.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
