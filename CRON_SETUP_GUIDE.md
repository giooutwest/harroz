# Setting Up Hourly Cron for Daily Reminders

Since Supabase doesn't support cron scheduling via API yet, we'll use a free external service.

## Option 1: cron-job.org (Recommended - Free)

### Step 1: Create Account
1. Go to https://cron-job.org
2. Sign up for free account

### Step 2: Create Cron Job
1. Click "Create cronjob"
2. Fill in:
   - **Title**: "Roz Daily Reminders"
   - **Address**: `https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders`
   - **Schedule**:
     - Every: **1 hour**
     - At minute: **0** (runs at :00 of every hour)
   - **Request method**: POST
   - **Request timeout**: 30 seconds

3. Click "Create cronjob"

### Done!
The function will now run every hour and check which users should get their 9 PM reminder.

---

## Option 2: EasyCron (Alternative - Free Tier)

### Step 1: Create Account
1. Go to https://www.easycron.com
2. Sign up for free account (up to 100 tasks/month is free)

### Step 2: Create Cron Job
1. Click "Add Cron Job"
2. Fill in:
   - **URL**: `https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders`
   - **Cron Expression**: `0 * * * *` (every hour)
   - **HTTP Method**: POST
   - **Timeout**: 30 seconds

3. Save

---

## Option 3: Render Cron Jobs (If hosting on Render)

If you deploy your app on Render, they have native cron job support:

1. In your Render dashboard
2. Create a new "Cron Job"
3. Command: `curl -X POST https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders`
4. Schedule: `0 * * * *`

---

## Option 4: GitHub Actions (Free with GitHub)

Create `.github/workflows/daily-reminders.yml`:

```yaml
name: Daily Reminders Cron

on:
  schedule:
    # Runs every hour at minute 0
    - cron: '0 * * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  trigger-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Function
        run: |
          curl -X POST https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders
```

---

## Verifying It Works

### Check Logs
1. Go to Supabase Dashboard → Edge Functions → queue-daily-reminders → Logs
2. You should see entries every hour showing which users were checked

### Manual Test
Run this to test immediately:
```bash
curl -X POST https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders
```

You should see a response like:
```json
{
  "checked": 10,
  "queued": 3,
  "sendResult": { "sent": 3 }
}
```

This means:
- Checked 10 users
- 3 of them should get reminder at this hour
- Successfully sent 3 push notifications

---

## My Recommendation

**Use cron-job.org** - It's:
- ✅ Free forever
- ✅ Reliable
- ✅ Easy to set up
- ✅ Has monitoring/alerts if it fails
- ✅ No coding required

Takes 2 minutes to set up and you never have to think about it again!
