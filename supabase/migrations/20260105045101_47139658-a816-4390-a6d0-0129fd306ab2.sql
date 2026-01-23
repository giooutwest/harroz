-- Add check constraint for visibility (fixing the security finding)
ALTER TABLE public.moods DROP CONSTRAINT IF EXISTS moods_visibility_check;
ALTER TABLE public.moods ADD CONSTRAINT moods_visibility_check CHECK (visibility IN ('private', 'friends', 'close_friends'));

-- Create mood_likes table for hearts
CREATE TABLE public.mood_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_id UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mood_id, user_id)
);

-- Enable RLS on mood_likes
ALTER TABLE public.mood_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on moods they can see
CREATE POLICY "Users can view likes on accessible moods"
ON public.mood_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moods
    WHERE moods.id = mood_likes.mood_id
    AND (
      moods.user_id = auth.uid()
      OR (moods.visibility = 'friends' AND public.are_friends(moods.user_id, auth.uid()))
      OR (moods.visibility = 'close_friends' AND public.is_close_friend(moods.user_id, auth.uid()))
    )
  )
);

-- Users can like moods they can see
CREATE POLICY "Users can like accessible moods"
ON public.mood_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.moods
    WHERE moods.id = mood_likes.mood_id
    AND (
      moods.user_id = auth.uid()
      OR (moods.visibility = 'friends' AND public.are_friends(moods.user_id, auth.uid()))
      OR (moods.visibility = 'close_friends' AND public.is_close_friend(moods.user_id, auth.uid()))
    )
  )
);

-- Users can unlike their own likes
CREATE POLICY "Users can remove their likes"
ON public.mood_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create mood_comments table
CREATE TABLE public.mood_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_id UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on mood_comments
ALTER TABLE public.mood_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on moods they can see
CREATE POLICY "Users can view comments on accessible moods"
ON public.mood_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moods
    WHERE moods.id = mood_comments.mood_id
    AND (
      moods.user_id = auth.uid()
      OR (moods.visibility = 'friends' AND public.are_friends(moods.user_id, auth.uid()))
      OR (moods.visibility = 'close_friends' AND public.is_close_friend(moods.user_id, auth.uid()))
    )
  )
);

-- Users can comment on moods they can see
CREATE POLICY "Users can comment on accessible moods"
ON public.mood_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.moods
    WHERE moods.id = mood_comments.mood_id
    AND (
      moods.user_id = auth.uid()
      OR (moods.visibility = 'friends' AND public.are_friends(moods.user_id, auth.uid()))
      OR (moods.visibility = 'close_friends' AND public.is_close_friend(moods.user_id, auth.uid()))
    )
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their comments"
ON public.mood_comments
FOR DELETE
USING (auth.uid() = user_id);