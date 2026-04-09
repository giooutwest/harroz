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

  // @ts-ignore - Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  // @ts-ignore - Deno global
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get every user with a push subscription
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('user_id');

  if (error || !subscriptions?.length) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'No subscribers found' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];

  const notifications = uniqueUserIds.map(user_id => ({
    user_id,
    title: "psst. we changed everything.",
    body: "same app, different universe. open it up — you'll see.",
    data: { type: 'launch_blast', url: '/' }
  }));

  const { error: insertError } = await supabase
    .from('pending_push_notifications')
    .insert(notifications);

  if (insertError) {
    return new Response(
      JSON.stringify({ error: insertError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fire them immediately
  const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
  });

  const sendResult = await sendResponse.json();

  return new Response(
    JSON.stringify({ sent: uniqueUserIds.length, sendResult }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
