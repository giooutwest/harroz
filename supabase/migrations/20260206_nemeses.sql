-- Nemesis Mode: 1-to-1 rivalry designation
-- Each user can have exactly ONE nemesis (enforced by UNIQUE on user_id)

CREATE TABLE IF NOT EXISTS public.nemeses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nemesis_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  CHECK (user_id != nemesis_id)
);

CREATE INDEX IF NOT EXISTS idx_nemeses_nemesis_id ON public.nemeses(nemesis_id);

ALTER TABLE public.nemeses ENABLE ROW LEVEL SECURITY;

-- Users can view their own nemesis designation
CREATE POLICY "Users can view own nemesis"
  ON public.nemeses FOR SELECT
  USING (auth.uid() = user_id);

-- Friends can see each other's nemesis designations (for Rivals tab)
CREATE POLICY "Friends can view nemesis designations"
  ON public.nemeses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = public.nemeses.user_id)
        OR (addressee_id = auth.uid() AND requester_id = public.nemeses.user_id)
      )
    )
  );

-- Users can set a nemesis
CREATE POLICY "Users can set nemesis"
  ON public.nemeses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update (replace) their nemesis
CREATE POLICY "Users can update nemesis"
  ON public.nemeses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can remove their nemesis
CREATE POLICY "Users can remove nemesis"
  ON public.nemeses FOR DELETE
  USING (auth.uid() = user_id);
