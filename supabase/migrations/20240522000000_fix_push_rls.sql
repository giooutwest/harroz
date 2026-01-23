-- Enable RLS just in case it was disabled (Safety first)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create the missing SELECT policy
CREATE POLICY "Users can see their own subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
