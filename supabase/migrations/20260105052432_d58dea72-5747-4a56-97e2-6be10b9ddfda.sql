-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment')),
  actor_id UUID NOT NULL,
  mood_id UUID REFERENCES public.moods(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.mood_comments(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to create notification on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mood_owner_id UUID;
BEGIN
  -- Get the mood owner
  SELECT user_id INTO mood_owner_id FROM public.moods WHERE id = NEW.mood_id;
  
  -- Don't notify if user likes their own mood
  IF mood_owner_id IS NOT NULL AND mood_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, mood_id)
    VALUES (mood_owner_id, 'like', NEW.user_id, NEW.mood_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to create notification on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mood_owner_id UUID;
BEGIN
  -- Get the mood owner
  SELECT user_id INTO mood_owner_id FROM public.moods WHERE id = NEW.mood_id;
  
  -- Don't notify if user comments on their own mood
  IF mood_owner_id IS NOT NULL AND mood_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, mood_id, comment_id)
    VALUES (mood_owner_id, 'comment', NEW.user_id, NEW.mood_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_mood_like
AFTER INSERT ON public.mood_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

CREATE TRIGGER on_mood_comment
AFTER INSERT ON public.mood_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;