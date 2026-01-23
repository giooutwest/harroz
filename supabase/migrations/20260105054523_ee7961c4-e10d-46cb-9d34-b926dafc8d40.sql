-- Add INSERT policy for notifications table
-- Allows authenticated users to create notifications where they are the actor
-- Prevents self-notifications (users cannot notify themselves)
CREATE POLICY "Users can create notifications as actor"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() = actor_id
  AND user_id != actor_id
);