-- Add privacy settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN show_rating_to_friends BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN show_photo_to_friends BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN show_caption_to_friends BOOLEAN NOT NULL DEFAULT true;

-- Add visibility to moods
ALTER TABLE public.moods 
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'close_friends'));

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view their friendships" 
ON public.friendships 
FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests
CREATE POLICY "Users can create friend requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they received (accept/reject)
CREATE POLICY "Users can respond to friend requests" 
ON public.friendships 
FOR UPDATE 
USING (auth.uid() = addressee_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can remove friendships" 
ON public.friendships 
FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create close friends table
CREATE TABLE public.close_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on close friends
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

-- Users can view their close friends
CREATE POLICY "Users can view their close friends" 
ON public.close_friends 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can add close friends
CREATE POLICY "Users can add close friends" 
ON public.close_friends 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can remove close friends
CREATE POLICY "Users can remove close friends" 
ON public.close_friends 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((requester_id = user1_id AND addressee_id = user2_id)
         OR (requester_id = user2_id AND addressee_id = user1_id))
  )
$$;

-- Create function to check if user is close friend
CREATE OR REPLACE FUNCTION public.is_close_friend(owner_id UUID, viewer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.close_friends
    WHERE user_id = owner_id AND friend_id = viewer_id
  )
$$;

-- Update moods RLS to allow friends to view based on visibility
CREATE POLICY "Friends can view shared moods"
ON public.moods
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    visibility = 'friends' 
    AND public.are_friends(user_id, auth.uid())
  )
  OR (
    visibility = 'close_friends' 
    AND public.is_close_friend(user_id, auth.uid())
  )
);

-- Drop old select policy and keep the new one
DROP POLICY IF EXISTS "Users can view their own moods" ON public.moods;

-- Trigger for friendships updated_at
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();