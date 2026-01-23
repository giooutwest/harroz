-- Add user_id column to moods table
ALTER TABLE public.moods ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_moods_user_id ON public.moods(user_id);

-- Update unique constraint to be per-user per-date
ALTER TABLE public.moods DROP CONSTRAINT IF EXISTS moods_date_key;
ALTER TABLE public.moods ADD CONSTRAINT moods_user_date_unique UNIQUE (user_id, date);

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Allow all operations on moods" ON public.moods;

-- Create proper RLS policies for authenticated users
CREATE POLICY "Users can view their own moods"
ON public.moods FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own moods"
ON public.moods FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moods"
ON public.moods FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moods"
ON public.moods FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update storage policies to be user-specific
DROP POLICY IF EXISTS "Anyone can view mood photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mood photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete mood photos" ON storage.objects;

CREATE POLICY "Users can view their own mood photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mood-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own mood photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mood-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own mood photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mood-photos' AND auth.uid()::text = (storage.foldername(name))[1]);