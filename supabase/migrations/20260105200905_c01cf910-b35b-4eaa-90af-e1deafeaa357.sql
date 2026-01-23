-- Add length constraint to mood_comments content field
ALTER TABLE public.mood_comments 
  ADD CONSTRAINT comment_content_length CHECK (char_length(content) <= 500);