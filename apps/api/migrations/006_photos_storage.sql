-- Optional: create Supabase Storage bucket for durable photo URLs.
-- Run in Supabase SQL editor when using SUPABASE_SERVICE_ROLE_KEY uploads.
-- Local/Railway fallback serves files from apps/api/uploads via /media/files.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;

create policy "Public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Service role manage photos"
  on storage.objects for all
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');
