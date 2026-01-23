-- Add discoverability setting to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discoverable_by TEXT NOT NULL DEFAULT 'everyone' 
CHECK (discoverable_by IN ('everyone', 'friends_of_friends', 'nobody'));

-- Drop existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users and friends can view profiles" ON public.profiles;

-- Create new SELECT policy that respects discoverability
CREATE POLICY "Users can view profiles based on privacy settings"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR are_friends(user_id, auth.uid())
  OR (
    discoverable_by = 'everyone'
  )
  OR (
    discoverable_by = 'friends_of_friends' 
    AND EXISTS (
      SELECT 1 FROM public.friendships f1
      JOIN public.friendships f2 ON (
        (f1.requester_id = f2.requester_id OR f1.requester_id = f2.addressee_id OR f1.addressee_id = f2.requester_id OR f1.addressee_id = f2.addressee_id)
        AND f1.status = 'accepted' AND f2.status = 'accepted'
      )
      WHERE (f1.requester_id = auth.uid() OR f1.addressee_id = auth.uid())
      AND (f2.requester_id = user_id OR f2.addressee_id = user_id)
    )
  )
);

-- Create function to count daily friend requests
CREATE OR REPLACE FUNCTION public.count_daily_friend_requests(requesting_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.friendships
  WHERE requester_id = requesting_user_id
  AND created_at >= CURRENT_DATE
$$;

-- Drop existing INSERT policy on friendships
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friendships;

-- Create new INSERT policy with rate limiting (10 per day)
CREATE POLICY "Users can create friend requests with rate limit"
ON public.friendships
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND public.count_daily_friend_requests(auth.uid()) < 10
);