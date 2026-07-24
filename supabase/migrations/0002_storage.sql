-- =============================================================================
-- Private storage bucket for voice clips (Phase 3). Created now so RLS is in
-- place from day one. Bucket is PRIVATE — access only via short-lived signed
-- URLs. Paths are randomized {uuid}/{uuid}.webm and owned by the uploader.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice',
  'voice',
  false,
  10485760,  -- 10 MB
  array['audio/webm', 'audio/mp4', 'audio/wav']
)
on conflict (id) do nothing;

-- Users may only touch objects they own, inside the voice bucket.
create policy "voice_read_own" on storage.objects
  for select using (bucket_id = 'voice' and owner = auth.uid());
create policy "voice_insert_own" on storage.objects
  for insert with check (bucket_id = 'voice' and owner = auth.uid());
create policy "voice_delete_own" on storage.objects
  for delete using (bucket_id = 'voice' and owner = auth.uid());
