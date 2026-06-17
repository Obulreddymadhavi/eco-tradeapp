
CREATE POLICY "Authenticated upload waste photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner reads waste photo" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Vendors read waste photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'waste-photos' AND public.has_role(auth.uid(), 'vendor'));
