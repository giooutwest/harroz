-- Fix 1: Remove the overly permissive notifications INSERT policy
-- Notifications should only be created via SECURITY DEFINER triggers
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Fix 2: Update profiles SELECT policy to require authentication
DROP POLICY IF EXISTS "Users can view profiles based on privacy settings" ON public.profiles;

CREATE POLICY "Users can view profiles based on privacy settings"
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id
    OR are_friends(user_id, auth.uid())
    OR discoverable_by = 'everyone'
    OR (
      discoverable_by = 'friends_of_friends' 
      AND EXISTS (
        SELECT 1
        FROM friendships f1
        JOIN friendships f2 ON (
          (f1.requester_id = f2.requester_id OR f1.requester_id = f2.addressee_id 
           OR f1.addressee_id = f2.requester_id OR f1.addressee_id = f2.addressee_id)
          AND f1.status = 'accepted' AND f2.status = 'accepted'
        )
        WHERE ((f1.requester_id = auth.uid() OR f1.addressee_id = auth.uid())
          AND (f2.requester_id = profiles.user_id OR f2.addressee_id = profiles.user_id))
      )
    )
  )
);

-- Fix 3: Add caption length constraint to moods table for defense-in-depth
ALTER TABLE public.moods 
ADD CONSTRAINT moods_caption_length 
CHECK (caption IS NULL OR char_length(caption) <= 500);