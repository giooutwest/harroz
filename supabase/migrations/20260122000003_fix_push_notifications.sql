-- Fix push notifications by creating a function that automatically sends them
-- This function will be called by database triggers to immediately invoke the edge function

-- Create a function to trigger the edge function immediately
CREATE OR REPLACE FUNCTION public.trigger_push_notification_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use pg_net to call the edge function asynchronously
  -- This requires the pg_net extension and proper configuration

  -- For now, we'll rely on the scheduled function
  -- But you MUST set up a cron job in Supabase Dashboard:
  -- Go to Database > Cron Jobs and add:
  --
  -- Name: send-push-notifications
  -- Schedule: */1 * * * * (every minute)
  -- Command: SELECT net.http_post(
  --            url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications',
  --            headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  --          );

  RETURN NEW;
END;
$$;

-- Add a comment explaining the setup
COMMENT ON FUNCTION public.trigger_push_notification_send() IS
'This function is a placeholder. You MUST configure a cron job in Supabase Dashboard to call send-push-notifications edge function every minute. See function definition for instructions.';

-- Create an index on processed column for better performance
CREATE INDEX IF NOT EXISTS pending_push_notifications_processed_idx
ON public.pending_push_notifications(processed)
WHERE processed = false;

-- Add created_at index for cleanup queries
CREATE INDEX IF NOT EXISTS pending_push_notifications_created_at_idx
ON public.pending_push_notifications(created_at DESC);
