-- Create user_badges table to track earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view anyone's badges (for display in feed)
CREATE POLICY "Anyone can view badges"
ON public.user_badges
FOR SELECT
USING (true);

-- Users can manage their own badges
CREATE POLICY "Users can manage own badges"
ON public.user_badges
FOR ALL
USING (auth.uid() = user_id);

-- Create referrals table for tracking app shares
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their referrals
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can create referrals for themselves being referred
CREATE POLICY "Users can be referred"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- Create index for faster lookups
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX idx_user_badges_equipped ON public.user_badges(user_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
