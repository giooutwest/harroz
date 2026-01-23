-- Fix 1: Allow friends to view profiles (display names and privacy settings)
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows users to view their own profile AND friends to view profiles
CREATE POLICY "Users and friends can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.are_friends(user_id, auth.uid())
);

-- Fix 2: Allow friends to access shared mood photos based on mood visibility
-- First drop the existing restrictive storage policy if it exists
DROP POLICY IF EXISTS "Users can view their own mood photos" ON storage.objects;

-- Create comprehensive policy for mood photo viewing
CREATE POLICY "Users and friends can view mood photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mood-photos' AND (
    -- Owner can always view their photos
    auth.uid()::text = (storage.foldername(name))[1]
    -- Friends can view if mood is shared with them
    OR EXISTS (
      SELECT 1 FROM public.moods
      WHERE moods.photo_url = storage.objects.name
      AND (
        (moods.visibility = 'friends' AND public.are_friends(moods.user_id, auth.uid()))
        OR (moods.visibility = 'close_friends' AND public.is_close_friend(moods.user_id, auth.uid()))
      )
    )
  )
);