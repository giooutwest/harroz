-- Create storage buckets for video journal
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('videos',     'videos',     true),
  ('audio',      'audio',      true),
  ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- ── videos bucket policies ────────────────────────────────────────────────────
CREATE POLICY "videos: authenticated upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "videos: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

-- ── audio bucket policies ─────────────────────────────────────────────────────
CREATE POLICY "audio: authenticated upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "audio: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'audio');

-- ── thumbnails bucket policies ────────────────────────────────────────────────
CREATE POLICY "thumbnails: authenticated upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "thumbnails: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'thumbnails');
