-- Add comment visibility setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN show_comments_to_friends_only boolean NOT NULL DEFAULT false;

-- Create a function to check if a user can see comments from another user
CREATE OR REPLACE FUNCTION public.can_view_user_comments(commenter_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User can always see their own comments
    commenter_id = viewer_id
    -- Or if the commenter doesn't have the restriction enabled
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = commenter_id 
      AND show_comments_to_friends_only = true
    )
    -- Or if they are friends
    OR are_friends(commenter_id, viewer_id)
$$;

-- Drop and recreate the SELECT policy for mood_comments to include comment author privacy
DROP POLICY IF EXISTS "Users can view comments on accessible moods" ON public.mood_comments;

CREATE POLICY "Users can view comments on accessible moods" 
ON public.mood_comments 
FOR SELECT 
USING (
  -- Must be able to access the mood
  EXISTS (
    SELECT 1 FROM moods
    WHERE moods.id = mood_comments.mood_id 
    AND (
      moods.user_id = auth.uid() 
      OR (moods.visibility = 'friends' AND are_friends(moods.user_id, auth.uid()))
      OR (moods.visibility = 'close_friends' AND is_close_friend(moods.user_id, auth.uid()))
    )
  )
  -- AND must be able to view comments from this user
  AND can_view_user_comments(mood_comments.user_id, auth.uid())
);