-- Mood Mentions: Many-to-Many relationship for tagging friends in mood posts
-- A mood can tag multiple friends, a friend can be tagged in multiple moods

CREATE TABLE IF NOT EXISTS mood_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id UUID NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only be tagged once per mood
  UNIQUE(mood_id, mentioned_user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_mood_mentions_mood_id ON mood_mentions(mood_id);
CREATE INDEX IF NOT EXISTS idx_mood_mentions_mentioned_user_id ON mood_mentions(mentioned_user_id);

-- RLS Policies
ALTER TABLE mood_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions on moods they can see (their own moods or friends' moods)
CREATE POLICY "Users can view mood mentions"
  ON mood_mentions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM moods m
      WHERE m.id = mood_mentions.mood_id
      AND (
        m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = m.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = m.user_id)
          )
        )
      )
    )
    OR mentioned_user_id = auth.uid()
  );

-- Users can create mentions on their own moods
CREATE POLICY "Users can create mentions on own moods"
  ON mood_mentions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moods m
      WHERE m.id = mood_mentions.mood_id
      AND m.user_id = auth.uid()
    )
  );

-- Users can delete mentions from their own moods
CREATE POLICY "Users can delete mentions from own moods"
  ON mood_mentions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM moods m
      WHERE m.id = mood_mentions.mood_id
      AND m.user_id = auth.uid()
    )
  );
