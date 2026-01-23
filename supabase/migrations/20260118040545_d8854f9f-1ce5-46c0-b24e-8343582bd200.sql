-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.mood_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on comments they can see
CREATE POLICY "Users can view comment likes"
ON public.comment_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mood_comments mc
    JOIN public.moods m ON m.id = mc.mood_id
    WHERE mc.id = comment_likes.comment_id
    AND (
      m.user_id = auth.uid()
      OR (m.visibility = 'friends' AND are_friends(m.user_id, auth.uid()))
      OR (m.visibility = 'close_friends' AND is_close_friend(m.user_id, auth.uid()))
    )
  )
);

-- Users can like comments on moods they can access
CREATE POLICY "Users can like comments"
ON public.comment_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.mood_comments mc
    JOIN public.moods m ON m.id = mc.mood_id
    WHERE mc.id = comment_likes.comment_id
    AND (
      m.user_id = auth.uid()
      OR (m.visibility = 'friends' AND are_friends(m.user_id, auth.uid()))
      OR (m.visibility = 'close_friends' AND is_close_friend(m.user_id, auth.uid()))
    )
  )
);

-- Users can remove their own likes
CREATE POLICY "Users can unlike comments"
ON public.comment_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);