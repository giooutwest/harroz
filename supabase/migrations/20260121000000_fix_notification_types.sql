-- Fix notification types to include friend_request
-- Drop the old constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with all three types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like', 'comment', 'friend_request'));
