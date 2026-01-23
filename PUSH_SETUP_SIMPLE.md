# 🔔 Push Notifications Setup - Simple Guide

## The Problem
Push notifications are queued in your database but never sent. We need something to automatically call the `send-push-notifications` function every minute.

## ✅ Solution Options (Pick ONE)

I'll show you 3 easy options. Pick the one that works best for you.

---

## Option 1: Supabase Database Webhooks (EASIEST - 5 minutes)

This uses Supabase's built-in webhook feature to automatically call your edge function.

### Step 1: Get Your Edge Function URL

1. Go to Supabase Dashboard
2. Click **Edge Functions** in the left sidebar
3. Find `send-push-notifications`
4. Copy the **Endpoint URL** (looks like: `https://xxxxx.supabase.co/functions/v1/send-push-notifications`)

### Step 2: Get Your Service Role Key

1. Go to **Settings** → **API** in Supabase
2. Find **Service Role Key** under "Project API keys"
3. Click **Reveal** and copy it
4. ⚠️ **KEEP THIS SECRET!** Never share it or commit it to Git

### Step 3: Create a Database Function

Go to **SQL Editor** in Supabase and run this:

```sql
-- Create a function that will be called every minute
CREATE OR REPLACE FUNCTION public.process_pending_push_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count pending notifications
  SELECT COUNT(*) INTO v_count
  FROM pending_push_notifications
  WHERE processed = false;

  -- If there are pending notifications, call the edge function
  IF v_count > 0 THEN
    -- Use http extension to call edge function
    PERFORM
      net.http_post(
        url := 'YOUR_EDGE_FUNCTION_URL',
        headers := jsonb_build_object(
          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
  END IF;
END;
$$;
```

**Replace:**
- `YOUR_EDGE_FUNCTION_URL` with the URL from Step 1
- `YOUR_SERVICE_ROLE_KEY` with the key from Step 2

### Step 4: Set Up pg_cron (if available)

Still in SQL Editor, try running:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'process-push-notifications',
  '* * * * *',
  'SELECT public.process_pending_push_notifications();'
);

-- Verify it's scheduled
SELECT * FROM cron.job;
```

**If you get an error** saying pg_cron doesn't exist, use **Option 2** below instead.

---

## Option 2: GitHub Actions (FREE, RELIABLE)

Use GitHub to automatically call your edge function every minute.

### Step 1: Get Your Credentials

1. Get your **Edge Function URL** (see Option 1, Step 1)
2. Get your **Service Role Key** (see Option 1, Step 2)

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:
   - Name: `SUPABASE_URL` → Value: `https://xxxxx.supabase.co`
   - Name: `SUPABASE_SERVICE_KEY` → Value: Your service role key

### Step 3: Create GitHub Action

Create this file: `.github/workflows/process-push-notifications.yml`

```yaml
name: Process Push Notifications

on:
  schedule:
    # Runs every minute
    - cron: '* * * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  process-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            '${{ secrets.SUPABASE_URL }}/functions/v1/send-push-notifications' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}' \
            -H 'Content-Type: application/json'
```

### Step 4: Enable the Workflow

1. Commit and push the file to GitHub
2. Go to **Actions** tab in GitHub
3. Find "Process Push Notifications"
4. Click **Enable workflow** if needed

**Test it:** Click "Run workflow" to test manually. Check the logs to see if it worked.

---

## Option 3: Vercel Cron (If deployed on Vercel)

If your app is deployed on Vercel, you can use their built-in cron.

### Step 1: Create API Route

Create file: `api/cron/process-notifications.js`

```javascript
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Verify this is from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2: Add to vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/process-notifications",
      "schedule": "* * * * *"
    }
  ]
}
```

### Step 3: Add Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `CRON_SECRET` → Generate a random string (e.g., `openssl rand -base64 32`)
   - `SUPABASE_SERVICE_ROLE_KEY` → Your service role key
   - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase URL

---

## Option 4: External Cron Service (SIMPLEST, NO CODE)

Use a free external service to ping your edge function.

### Recommended: Cron-Job.org (FREE)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for free account
3. Click **Create Cronjob**
4. Fill in:
   - **Title:** Process Push Notifications
   - **URL:** Your edge function URL
   - **Execution:** Every minute (*/1)
   - **HTTP Method:** POST
   - **Request Headers:** Add these:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Request Body:** `{}`
5. Click **Create**

### Alternative: EasyCron (FREE)

1. Go to [easycron.com](https://www.easycron.com)
2. Sign up (100 tasks/day free)
3. Add new cron job:
   - **URL:** Your edge function URL
   - **Cron Expression:** `* * * * *` (every minute)
   - **HTTP Method:** POST
   - **Custom Headers:**
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```

---

## ✅ How to Test

After setting up ANY option above:

### 1. Check if it's working:

Go to Supabase **SQL Editor** and run:

```sql
-- See pending notifications
SELECT * FROM pending_push_notifications
WHERE processed = false
ORDER BY created_at DESC;
```

### 2. Create a test notification:

```sql
-- Insert a test notification
INSERT INTO pending_push_notifications (user_id, title, body, data)
VALUES (
  'YOUR_USER_ID',  -- Replace with your actual user ID
  'Test Notification',
  'This is a test to check if the system is working',
  '{"type": "test"}'::jsonb
);
```

### 3. Wait 1 minute, then check again:

```sql
-- Check if it was processed
SELECT * FROM pending_push_notifications
WHERE title = 'Test Notification'
ORDER BY created_at DESC;
```

The `processed` column should now be `true`!

### 4. Check Edge Function Logs:

1. Go to **Edge Functions** → `send-push-notifications` → **Logs**
2. You should see requests coming in every minute
3. Look for: `"Sent X notifications"`

---

## 🆘 Troubleshooting

### Not seeing any logs in Edge Function?
- Double-check your service role key
- Make sure the URL is correct (should end with `/send-push-notifications`)
- Check the cron service dashboard to see if requests are failing

### Logs show errors?
- Check that VAPID keys are set in Edge Function environment variables
- Go to **Edge Functions** → `send-push-notifications` → **Settings**
- Should see `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

### Notifications processed but not received?
- Check browser console - should see "SW registered"
- Check: `SELECT * FROM push_subscriptions WHERE user_id = 'YOUR_ID'`
- Make sure you granted notification permission in browser
- Try the test notification button in Settings

---

## 🎯 Which Option Should I Choose?

**Choose based on your situation:**

- ✅ **Option 1** - If you have access to pg_cron (try it first!)
- ✅ **Option 2** - If your code is on GitHub (most reliable)
- ✅ **Option 3** - If deployed on Vercel
- ✅ **Option 4** - If you want the absolute simplest setup (no code changes)

**My recommendation:** Try **Option 1** first. If it doesn't work, use **Option 4** (cron-job.org) - it takes 2 minutes and works immediately.

---

## 📞 Need Help?

If you're stuck, let me know:
1. Which option you chose
2. What error you're seeing (if any)
3. Screenshot of edge function logs

I'll help you debug!
