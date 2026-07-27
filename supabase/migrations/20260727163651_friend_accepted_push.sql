-- Friend-request "sent" pushes are already queued by queue_push_on_friend_request()
-- (see 20260105194341_..._.sql, AFTER INSERT ON friendships). This adds the other
-- half: notify the original requester when their request gets accepted.

CREATE OR REPLACE FUNCTION public.queue_push_on_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT COALESCE(display_name, 'Someone') INTO actor_name
    FROM public.profiles WHERE user_id = NEW.addressee_id;

    INSERT INTO public.pending_push_notifications (user_id, title, body, data)
    VALUES (
      NEW.requester_id,
      '🎉 Friend Request Accepted!',
      actor_name || ' accepted your friend request',
      jsonb_build_object('type', 'friend_accepted', 'addressee_id', NEW.addressee_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_accepted_push ON public.friendships;
CREATE TRIGGER on_friend_accepted_push
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_on_friend_accepted();
