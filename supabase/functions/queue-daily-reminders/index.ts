// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore - Deno global
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore - Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore - Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current hour in UTC
    const now = new Date();
    const currentHourUTC = now.getUTCHours();

    console.log(`Running at ${now.toISOString()}, UTC hour: ${currentHourUTC}`);

    // Get all users who have push subscriptions with their timezone settings
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, timezone, reminder_time')
      .not('user_id', 'is', null)
      .limit(1000);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users found');
      return new Response(
        JSON.stringify({ message: 'No users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter users who should get reminder at this hour
    const usersToCheck = profiles.filter(profile => {
      const userTimezone = profile.timezone || 'America/Los_Angeles';
      const reminderHour = profile.reminder_time || 21;

      try {
        // Get current time in user's timezone
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userHour = userTime.getHours();

        // Check if it's their reminder hour
        return userHour === reminderHour;
      } catch (e) {
        console.error(`Invalid timezone ${userTimezone} for user ${profile.user_id}`);
        return false;
      }
    });

    if (usersToCheck.length === 0) {
      console.log('No users to remind at this hour');
      return new Response(
        JSON.stringify({ message: 'No users to remind at this hour' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = usersToCheck.map(p => p.user_id);

    // Check if these users have push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', userIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    const subscribedUserIds = new Set((subscriptions || []).map(s => s.user_id));
    const eligibleUserIds = userIds.filter(uid => subscribedUserIds.has(uid));

    if (eligibleUserIds.length === 0) {
      console.log('No subscribed users to remind');
      return new Response(
        JSON.stringify({ message: 'No subscribed users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which users haven't logged a mood today (in their timezone)
    const notifications = [];

    for (const userId of eligibleUserIds) {
      const userProfile = usersToCheck.find(p => p.user_id === userId);
      const userTimezone = userProfile?.timezone || 'America/Los_Angeles';

      // Get user's "today" date in their timezone
      const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const userToday = userDate.toISOString().split('T')[0];

      // Check if user logged a mood today
      const { data: mood } = await supabase
        .from('moods')
        .select('id')
        .eq('user_id', userId)
        .eq('date', userToday)
        .limit(1)
        .single();

      // Only notify if they haven't logged yet
      if (!mood) {
        notifications.push({
          user_id: userId,
          title: "Time to Journal! 📔",
          body: "It's time for your daily reflection. How was your day?",
          data: { type: 'daily_reminder' }
        });
      }
    }

    console.log(`Queueing ${notifications.length} reminders`);

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('pending_push_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to queue notifications' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Trigger the send-push-notifications function to actually send them
      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });

      const sendResult = await sendResponse.json();
      console.log('Push send result:', sendResult);

      return new Response(
        JSON.stringify({
          checked: userIds.length,
          queued: notifications.length,
          sendResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        checked: userIds.length,
        queued: 0,
        message: 'All users already logged today'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in queue-daily-reminders:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
