-- Add show_daily_quote setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_daily_quote BOOLEAN NOT NULL DEFAULT false;

-- Create table to store push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to send push notification (will be called by triggers)
-- This stores pending notifications that the edge function will process
CREATE TABLE public.pending_push_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS but allow service role full access
ALTER TABLE public.pending_push_notifications ENABLE ROW LEVEL SECURITY;

-- No user policies - only service role can access this table

-- Create trigger to queue push notification on like
CREATE OR REPLACE FUNCTION public.queue_push_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mood_owner_id UUID;
  actor_name TEXT;
BEGIN
  -- Get the mood owner
  SELECT user_id INTO mood_owner_id FROM public.moods WHERE id = NEW.mood_id;
  
  -- Get actor's display name
  SELECT COALESCE(display_name, 'Someone') INTO actor_name 
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Don't notify if user likes their own mood
  IF mood_owner_id IS NOT NULL AND mood_owner_id != NEW.user_id THEN
    INSERT INTO public.pending_push_notifications (user_id, title, body, data)
    VALUES (
      mood_owner_id, 
      '❤️ New Like!', 
      actor_name || ' liked your mood',
      jsonb_build_object('type', 'like', 'mood_id', NEW.mood_id, 'actor_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to queue push notification on comment
CREATE OR REPLACE FUNCTION public.queue_push_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mood_owner_id UUID;
  actor_name TEXT;
  comment_preview TEXT;
BEGIN
  -- Get the mood owner
  SELECT user_id INTO mood_owner_id FROM public.moods WHERE id = NEW.mood_id;
  
  -- Get actor's display name
  SELECT COALESCE(display_name, 'Someone') INTO actor_name 
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Get comment preview (first 50 chars)
  comment_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    comment_preview := comment_preview || '...';
  END IF;
  
  -- Don't notify if user comments on their own mood
  IF mood_owner_id IS NOT NULL AND mood_owner_id != NEW.user_id THEN
    INSERT INTO public.pending_push_notifications (user_id, title, body, data)
    VALUES (
      mood_owner_id, 
      '💬 New Comment!', 
      actor_name || ': "' || comment_preview || '"',
      jsonb_build_object('type', 'comment', 'mood_id', NEW.mood_id, 'actor_id', NEW.user_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_like_queue_push
  AFTER INSERT ON public.mood_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_like();

CREATE TRIGGER on_comment_queue_push
  AFTER INSERT ON public.mood_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_comment();