# Push Notifications Setup Guide

## What Was Fixed

1. **Service Worker**: Removed OneSignal SDK, added native Web Push API handlers
2. **Edge Function**: Fixed to process notifications from `pending_push_notifications` queue
3. **Database Triggers**: Already set up correctly - automatically queue push notifications for:
   - Likes on moods
   - Comments on moods
   - Friend requests
4. **Frontend Code**: Removed manual function calls (triggers handle it automatically)

---

## Prerequisites

You need to have VAPID keys configured in Supabase. The public key is already in the code:
```
BOgFBgMZT2jfL9nB4RDqVxfFzOHJvauV_RECSKLIFDTFX1X352Wp60v81w5dG1butj-ER8E0y8hGePd0fxMSgQo
```

---

## Setup Steps

### 1. Deploy Edge Functions to Supabase

You need to deploy the updated Edge Functions. Run these commands:

```bash
cd /Users/osimac/Downloads/harroz-main

# Deploy the send-push-notifications function
npx supabase functions deploy send-push-notifications

# Deploy the queue-daily-reminders function (for 9 PM notifications)
npx supabase functions deploy queue-daily-reminders
```

### 2. Set Environment Variables in Supabase

Go to your Supabase project dashboard:
1. Click on **Edge Functions** in the left sidebar
2. Click on **Manage environment variables**
3. Add these variables:

```
VAPID_PUBLIC_KEY=BOgFBgMZT2jfL9nB4RDqVxfFzOHJvauV_RECSKLIFDTFX1X352Wp60v81w5dG1butj-ER8E0y8hGePd0fxMSgQo
VAPID_PRIVATE_KEY=[Your private key - ask me if you don't have it]
```

**Important**: The private key must match the public key. If you generated these keys yourself, you should have both. If not, you'll need to generate new keys.

### 3. Set Up Cron Job for Daily Reminders (9 PM Notifications)

In Supabase Dashboard:
1. Go to **Database** → **Cron Jobs** (or use the SQL editor)
2. Run this SQL:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every hour at XX:00
-- It will check each user's timezone and send at their 9 PM
SELECT cron.schedule(
  'queue-daily-reminders',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := '[YOUR_SUPABASE_URL]/functions/v1/queue-daily-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
  );
  $$
);
```

Replace:
- `[YOUR_SUPABASE_URL]` with your project URL (e.g., `https://abcdefgh.supabase.co`)
- `[YOUR_SERVICE_ROLE_KEY]` with your service role key from Supabase settings

### 4. Test Push Notifications

Once deployed, test the system:

1. **Build and deploy your app:**
   ```bash
   npm run build
   ```

2. **Enable notifications in the app:**
   - Open the app in your browser
   - Go to Settings
   - Click "Enable Push Notifications"
   - Accept the browser permission prompt

3. **Test with a friend:**
   - Have a friend like your mood or comment
   - You should receive a push notification

4. **Check Supabase Logs:**
   - Go to **Edge Functions** → **send-push-notifications** → **Logs**
   - You should see messages like:
     ```
     Processing X notifications
     Sent notification to https://...
     Sent X notifications, Y failures
     ```

---

## How It Works

### Automatic Flow for Interactions (Likes, Comments, Friend Requests)

1. User performs action (like, comment, friend request)
2. Database trigger fires automatically
3. Trigger inserts row into `pending_push_notifications` table
4. Frontend code calls `send-push-notifications` Edge Function
5. Edge Function:
   - Fetches unprocessed notifications from queue
   - Looks up user's push subscriptions
   - Sends push to all user's devices
   - Marks notifications as processed

### Daily Reminders (9 PM)

1. Cron job runs every hour
2. Calls `queue-daily-reminders` Edge Function
3. Function checks users who haven't posted today
4. Inserts reminder notifications for those users (based on timezone)
5. Calls `send-push-notifications` to actually send them

---

## Troubleshooting

### Notifications not being received?

1. **Check browser permissions:**
   - Make sure you allowed notifications in browser settings
   - Chrome: Settings → Privacy and Security → Site Settings → Notifications

2. **Check Supabase logs:**
   - Edge Functions → send-push-notifications → Logs
   - Look for errors like "VAPID keys not configured"

3. **Check database:**
   ```sql
   -- See if push subscriptions exist
   SELECT * FROM push_subscriptions;

   -- See pending notifications
   SELECT * FROM pending_push_notifications WHERE processed = false;
   ```

4. **Check service worker:**
   - Open browser DevTools → Application → Service Workers
   - Should see `sw.js` registered and activated

### 9 PM Reminders not working?

1. **Check cron job is running:**
   ```sql
   SELECT * FROM cron.job;
   ```

2. **Check timezone is saved:**
   ```sql
   SELECT user_id, timezone FROM profiles;
   ```
   - Timezone should auto-save when user enables notifications

3. **Manually trigger the function:**
   - In Supabase: Edge Functions → queue-daily-reminders → Invoke
   - Check logs for errors

---

## Files Modified

1. `/public/sw.js` - Service worker with push notification handlers
2. `/supabase/functions/send-push-notifications/index.ts` - Process notification queue
3. `/src/components/FriendsTab.tsx` - Removed manual function calls

---

## Next Steps After Setup

1. Deploy the functions
2. Set environment variables
3. Set up the cron job
4. Test with a friend
5. Monitor Supabase logs for any errors

Good luck! Let me know if you encounter any issues.
