-- Add photo and caption columns to moods table
ALTER TABLE public.moods ADD COLUMN photo_url TEXT;
ALTER TABLE public.moods ADD COLUMN caption TEXT;

-- Create storage bucket for mood photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mood-photos', 'mood-photos', true);

-- Allow public read access to mood photos
CREATE POLICY "Anyone can view mood photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'mood-photos');

-- Allow anyone to upload mood photos (since no auth)
CREATE POLICY "Anyone can upload mood photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mood-photos');

-- Allow anyone to delete mood photos
CREATE POLICY "Anyone can delete mood photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'mood-photos');