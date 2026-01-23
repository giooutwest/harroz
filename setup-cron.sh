#!/bin/bash

# Supabase Cron Job Setup Script
# This sets up hourly checks for daily reminders (timezone-aware)

echo "🕐 Setting up hourly cron job for timezone-aware daily reminders..."
echo ""
echo "How it works:"
echo "  - Runs every hour"
echo "  - Checks which users should get reminder at their local time"
echo "  - Each user gets notified at THEIR 9 PM (or custom time)"
echo ""
echo "Step 1: Get your Supabase Access Token"
echo "   1. Go to: https://supabase.com/dashboard/account/tokens"
echo "   2. Click 'Generate New Token'"
echo "   3. Give it a name like 'cron-setup'"
echo "   4. Copy the token"
echo ""
read -p "Paste your access token here: " ACCESS_TOKEN
echo ""

echo "Setting up hourly cron job..."
echo ""

# Make the API call to set up hourly cron
response=$(curl -s -w "\n%{http_code}" -X POST \
  'https://api.supabase.com/v1/projects/hikxltzykjejndyhvdrf/functions/queue-daily-reminders/schedules' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "cron": "0 * * * *",
    "timezone": "UTC"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
  echo "✅ Success! Cron job has been set up."
  echo "   Schedule: Every hour at minute 0 (UTC)"
  echo "   Function checks each user's timezone and reminds them at their local time"
  echo ""
  echo "Response: $body"
  echo ""
  echo "⚠️  IMPORTANT: You also need to apply the database migration!"
  echo "   Run this SQL in Supabase SQL Editor:"
  echo ""
  echo "   ALTER TABLE public.profiles"
  echo "   ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles',"
  echo "   ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 21"
  echo "   CHECK (reminder_time >= 0 AND reminder_time <= 23);"
  echo ""
else
  echo "❌ Error setting up cron job (HTTP $http_code)"
  echo "Response: $body"
  echo ""
  echo "Common issues:"
  echo "  - 401/403: Invalid access token"
  echo "  - 404: Cron API might not be available yet"
  echo ""
  echo "Alternative: Use an external cron service (cron-job.org, EasyCron)"
  echo "  URL to hit hourly: https://hikxltzykjejndyhvdrf.supabase.co/functions/v1/queue-daily-reminders"
fi

echo ""
echo "Done!"
