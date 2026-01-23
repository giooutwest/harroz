## ✅ Timezone Support for Daily Reminders

Great catch! You were absolutely right - the original setup would have sent reminders to everyone at the same absolute time, which would be the wrong local time for most users.

## How It Works Now:

### The Solution:
1. **Each user stores their timezone** in the `profiles` table
2. **Cron runs every hour** (not just at 9 PM)
3. **Function checks** which users it's currently 9 PM for (in their timezone)
4. **Only those users** get the reminder

### Example:
- 9:00 PM Pacific → California users get reminded
- 10:00 PM Pacific (1:00 AM Eastern) → No one reminded
- 11:00 PM Pacific (2:00 AM Eastern) → No one reminded
- 12:00 AM Pacific (3:00 AM Eastern, 9:00 PM Hawaii) → Hawaii users get reminded
- And so on...

## Database Changes:

Added to `profiles` table:
- `timezone` - User's timezone (default: "America/Los_Angeles")
- `reminder_time` - Hour to send reminder (default: 21 = 9 PM)

## Setup Steps:

### 1. Apply Database Migration

Run this in Supabase SQL Editor:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 21
CHECK (reminder_time >= 0 AND reminder_time <= 23);
```

### 2. Set Up Hourly Cron Job

**Option A:** Run the setup script
```bash
./setup-cron.sh
```

**Option B:** Use external cron service
- Go to [cron-job.org](https://cron-job.org) or similar
- Set up hourly job hitting:
  ```
  https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders
  ```

**Option C:** Use Supabase API manually
```bash
# Get token from: https://supabase.com/dashboard/account/tokens
curl -X POST \
  'https://api.supabase.com/v1/projects/hikxltzykjejndyhvdrf/functions/queue-daily-reminders/schedules' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "cron": "0 * * * *",
    "timezone": "UTC"
  }'
```

### 3. Users Can Set Their Timezone

You'll want to add a settings UI where users can:
- Select their timezone
- Choose their preferred reminder time (9 PM by default)

Example code for the settings:
```typescript
await supabase
  .from('profiles')
  .update({
    timezone: 'America/New_York',
    reminder_time: 21
  })
  .eq('user_id', user.id);
```

## How the Function Works:

1. Runs every hour
2. Gets all user profiles with timezone settings
3. For each user, calculates: "What hour is it in THEIR timezone?"
4. If it matches their `reminder_time` (default 9 PM)
5. AND they have push notifications enabled
6. AND they haven't logged a mood today (in their timezone)
7. → Send them a reminder!

## Testing:

To test without waiting for a specific hour:

```bash
# Manually trigger the function
npx supabase functions invoke queue-daily-reminders
```

Check the logs to see which users it would notify based on their current local time.

## Benefits:

✅ Each user gets reminder at THEIR 9 PM
✅ Works across all timezones
✅ Users can customize their reminder time
✅ Respects user's local "today" when checking if they logged
