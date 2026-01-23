-- Fix message notifications

-- 1. Add 'message' type to notifications table constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'friend_request', 'message'));

-- 2. Fix the message notification trigger to use correct type
CREATE OR REPLACE FUNCTION public.queue_push_on_message()
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
    '💬 New Message',
    sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    jsonb_build_object('type', 'message', 'sender_id', NEW.sender_id, 'message_id', NEW.id)
  );

  -- Also create in-app notification with CORRECT type
  INSERT INTO public.notifications (user_id, actor_id, type, mood_id)
  VALUES (NEW.receiver_id, NEW.sender_id, 'message', NULL);

  RETURN NEW;
END;
$$;

-- 3. Add UPDATE policy to push_subscriptions
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
