-- Add parent_id for comment threading
ALTER TABLE public.mood_comments
ADD COLUMN parent_id UUID REFERENCES public.mood_comments(id) ON DELETE CASCADE;

-- Create index for efficient thread queries
CREATE INDEX idx_mood_comments_parent_id ON public.mood_comments(parent_id);
CREATE INDEX idx_mood_comments_mood_id_created ON public.mood_comments(mood_id, created_at);