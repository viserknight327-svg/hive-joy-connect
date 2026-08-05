
CREATE POLICY "hive_read_media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('videos','avatars'));
CREATE POLICY "hive_insert_own_media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('videos','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "hive_update_own_media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('videos','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "hive_delete_own_media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('videos','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
