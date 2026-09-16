
CREATE POLICY "Authenticated read donation photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'donation-photos');
CREATE POLICY "Users upload own donation photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'donation-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own donation photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'donation-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own donation photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'donation-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
