# 🔔 Push Notification Fix

## Problem
Push notifications were being queued in the database but never sent because there was no automatic process to trigger the `send-push-notifications` edge function.

## Solution
You need to set up a **Cron Job** in Supabase to automatically process pending notifications.

## Setup Instructions

### Method 1: Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs** (or use the pg_cron extension)
3. Create a new cron job with these settings:

```sql
-- Job Name: process-push-notifications
-- Schedule: */1 * * * * (every minute)
-- SQL Command:

SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications',
  headers := jsonb_build_object(
    'Authorization',
    'Bearer YOUR_SERVICE_ROLE_KEY'
  )
)::text;
```

**Replace:**
- `YOUR_PROJECT_REF` with your actual Supabase project reference (found in Project Settings → API)
- `YOUR_SERVICE_ROLE_KEY` with your service role key (Settings → API → service_role key - **NEVER expose this publicly!**)

### Method 2: Alternative - Direct HTTP Webhook

If you prefer external scheduling, use a service like:
- **Vercel Cron** (if deployed on Vercel)
- **GitHub Actions** (runs every minute)
- **Uptime Robot** (monitors a URL that triggers the function)

Create an endpoint that calls:
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Method 3: pg_cron Extension (Advanced)

If you have access to pg_cron:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job
SELECT cron.schedule(
  'process-push-notifications',
  '* * * * *', -- Every minute
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications',
      headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
    );
  $$
);
```

## Verification

After setting up the cron job:

1. **Check if notifications are being processed:**
```sql
SELECT * FROM pending_push_notifications
WHERE processed = true
ORDER BY created_at DESC
LIMIT 10;
```

2. **Test the system:**
   - Have a friend send you a message
   - Check if a notification appears in `pending_push_notifications`
   - Wait 1 minute
   - Check if `processed = true` for that notification
   - You should receive a push notification on your device

3. **Monitor the edge function logs:**
   - Go to Edge Functions → send-push-notifications → Logs
   - You should see logs every minute showing how many notifications were processed

## Troubleshooting

### No notifications are being sent?
1. Verify the cron job is running (check Supabase logs)
2. Check edge function logs for errors
3. Verify VAPID keys are set in Edge Function secrets:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

### Notifications queued but not processed?
- Check if the cron job has the correct authorization header
- Verify the edge function URL is correct
- Check if there are any errors in the edge function logs

### Still not working?
- Ensure service worker is registered (check browser console)
- Verify push subscription exists in `push_subscriptions` table
- Test notification permission: `Notification.permission` should be `"granted"`
- Try sending a test notification from Settings page

## Clean Up Old Notifications

Optionally, add another cron job to clean up processed notifications older than 7 days:

```sql
DELETE FROM pending_push_notifications
WHERE processed = true
AND created_at < NOW() - INTERVAL '7 days';
```
