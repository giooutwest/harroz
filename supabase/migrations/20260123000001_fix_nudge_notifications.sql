-- Fix nudge notifications

-- 1. Add 'nudge' type to notifications table constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'friend_request', 'message', 'nudge'));

-- 2. Update the nudge notification trigger to use correct type
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

  -- Create in-app notification with CORRECT 'nudge' type
  INSERT INTO public.notifications (user_id, actor_id, type, mood_id)
  VALUES (NEW.receiver_id, NEW.sender_id, 'nudge', NULL);

  RETURN NEW;
END;
$$;
