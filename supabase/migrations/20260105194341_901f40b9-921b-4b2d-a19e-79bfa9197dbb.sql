-- Create trigger function for friend request notifications
CREATE OR REPLACE FUNCTION public.queue_push_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  -- Only trigger on new pending friend requests
  IF NEW.status = 'pending' THEN
    -- Get actor's display name
    SELECT COALESCE(display_name, 'Someone') INTO actor_name 
    FROM public.profiles WHERE user_id = NEW.requester_id;
    
    INSERT INTO public.pending_push_notifications (user_id, title, body, data)
    VALUES (
      NEW.addressee_id, 
      '👋 Friend Request!', 
      actor_name || ' wants to be your friend',
      jsonb_build_object('type', 'friend_request', 'requester_id', NEW.requester_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request_push ON public.friendships;
CREATE TRIGGER on_friend_request_push
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_friend_request();

-- Create triggers for likes and comments (they exist as functions but not as triggers)
DROP TRIGGER IF EXISTS on_mood_like_push ON public.mood_likes;
CREATE TRIGGER on_mood_like_push
  AFTER INSERT ON public.mood_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_like();

DROP TRIGGER IF EXISTS on_mood_comment_push ON public.mood_comments;
CREATE TRIGGER on_mood_comment_push
  AFTER INSERT ON public.mood_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_comment();