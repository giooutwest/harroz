-- FIX 1: SECURE PUSH NOTIFICATIONS
-- Enable security on the table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON push_subscriptions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;

-- Create strict policies: Users can only touch their OWN keys
CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- FIX 2: SECURE PROFILES
-- Enable security on the table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing "Public" policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create "Authenticated Only" Read Policy
-- This stops random internet bots from scraping your user list
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Ensure users can only UPDATE their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure users can INSERT their own profile (on signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
