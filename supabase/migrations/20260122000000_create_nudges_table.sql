-- Create nudges table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS public.nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

-- Users can view nudges they received
DROP POLICY IF EXISTS "Users can view nudges they received" ON public.nudges;
CREATE POLICY "Users can view nudges they received"
ON public.nudges
FOR SELECT
USING (auth.uid() = receiver_id);

-- Users can send nudges
DROP POLICY IF EXISTS "Users can send nudges" ON public.nudges;
CREATE POLICY "Users can send nudges"
ON public.nudges
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can delete nudges they received (dismiss them)
DROP POLICY IF EXISTS "Users can delete received nudges" ON public.nudges;
CREATE POLICY "Users can delete received nudges"
ON public.nudges
FOR DELETE
USING (auth.uid() = receiver_id);

-- Create trigger function for nudge notifications
CREATE OR REPLACE FUNCTION public.queue_push_on_nudge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender's display name
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  -- Queue push notification
  INSERT INTO public.pending_push_notifications (user_id, title, body, data)
  VALUES (
    NEW.receiver_id,
    '⚡ Nudge!',
    sender_name || ' nudged you to log your mood',
    jsonb_build_object('type', 'nudge', 'sender_id', NEW.sender_id, 'nudge_id', NEW.id)
  );

  -- Also create in-app notification (stored in notifications table)
  -- Note: We'll use 'friend_request' type since nudge isn't in the constraint yet
  INSERT INTO public.notifications (user_id, actor_id, type, mood_id)
  VALUES (NEW.receiver_id, NEW.sender_id, 'friend_request', NULL);

  RETURN NEW;
END;
$$;

-- Create trigger for nudges
DROP TRIGGER IF EXISTS on_nudge_push ON public.nudges;
CREATE TRIGGER on_nudge_push
  AFTER INSERT ON public.nudges
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_nudge();
