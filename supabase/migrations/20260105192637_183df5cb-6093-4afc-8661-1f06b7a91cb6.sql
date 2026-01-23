-- Add policy for pending_push_notifications to allow service role to access
-- Since RLS is enabled but we want only service role access, we create a policy that allows nothing for regular users
-- The service role bypasses RLS anyway, so this just satisfies the linter
CREATE POLICY "Service role only"
ON public.pending_push_notifications
FOR ALL
USING (false);