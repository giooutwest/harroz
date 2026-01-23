-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view profiles based on privacy settings" ON public.profiles;

-- Create a more secure policy that explicitly requires authentication
-- and properly restricts access based on privacy settings
CREATE POLICY "Authenticated users can view profiles based on privacy settings" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- User can always see their own profile
  (auth.uid() = user_id)
  -- Or if they are friends
  OR are_friends(user_id, auth.uid())
  -- Or if the profile is discoverable by everyone
  OR (discoverable_by = 'everyone')
  -- Or if discoverable by friends of friends and the viewer is a friend of a friend
  OR (
    discoverable_by = 'friends_of_friends' 
    AND EXISTS (
      SELECT 1
      FROM friendships f1
      JOIN friendships f2 ON (
        (f1.requester_id = f2.requester_id OR f1.requester_id = f2.addressee_id 
         OR f1.addressee_id = f2.requester_id OR f1.addressee_id = f2.addressee_id)
        AND f1.status = 'accepted'
        AND f2.status = 'accepted'
      )
      WHERE (f1.requester_id = auth.uid() OR f1.addressee_id = auth.uid())
      AND (f2.requester_id = profiles.user_id OR f2.addressee_id = profiles.user_id)
    )
  )
);