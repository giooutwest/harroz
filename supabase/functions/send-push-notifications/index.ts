// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generate VAPID authentication header
async function generateVAPIDAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Create JWT header
  const jwtHeader = {
    typ: 'JWT',
    alg: 'ES256'
  };

  // Create JWT payload
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12 hours
    sub: subject
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(jwtHeader))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(jwtPayload))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Import private key for signing from JWK format
  // The private key is stored as base64url 'd' parameter from JWK
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapidPrivateKey,
      ext: true
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

// Send push notification to a single subscription
async function sendPushNotification(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string
): Promise<boolean> {
  try {
    // Generate VAPID auth header
    const authHeader = await generateVAPIDAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      vapidEmail
    );

    // Encrypt the payload (simplified - using plaintext for now)
    // In production, you'd want proper encryption, but this works for testing
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'TTL': '86400' // 24 hours
      },
      body: payload
    });

    if (response.ok || response.status === 201) {
      return true;
    } else if (response.status === 410 || response.status === 404) {
      // Subscription expired or invalid
      throw new Error('SUBSCRIPTION_EXPIRED');
    } else {
      console.error(`Push failed with status ${response.status}: ${await response.text()}`);
      return false;
    }
  } catch (error: any) {
    if (error.message === 'SUBSCRIPTION_EXPIRED') {
      throw error;
    }
    console.error('Error sending push:', error);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Setup Supabase Client
    // @ts-ignore - Deno global
    const supabase = createClient(
      // @ts-ignore - Deno global
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore - Deno global
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Get VAPID keys
    const vapidEmail = "mailto:5gunsisus@gmail.com";
    // @ts-ignore - Deno global
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    // @ts-ignore - Deno global
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch pending notifications from the queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("pending_push_notifications")
      .select("*")
      .eq("processed", false)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching pending notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log("No pending notifications to send");
      return new Response(
        JSON.stringify({ message: "No pending notifications", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications`);

    let successCount = 0;
    let failureCount = 0;

    // 4. Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Get user's push subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", notification.user_id);

        if (!subs || subs.length === 0) {
          console.log(`No subscriptions for user ${notification.user_id}`);
          // Mark as processed even if no subscriptions
          await supabase
            .from("pending_push_notifications")
            .update({ processed: true })
            .eq("id", notification.id);
          continue;
        }

        // Send to all user's devices
        for (const sub of subs) {
          const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: notification.data?.url || "/",
          });

          try {
            const sent = await sendPushNotification(
              sub,
              payload,
              vapidPublicKey,
              vapidPrivateKey,
              vapidEmail
            );

            if (sent) {
              console.log(`✓ Sent notification to ${sub.endpoint.substring(0, 50)}...`);
            }
          } catch (err: any) {
            console.error(`Failed to send to subscription ${sub.id}:`, err.message);

            // If subscription is dead (410 Gone or 404), delete it
            if (err.message === 'SUBSCRIPTION_EXPIRED') {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              console.log(`Deleted dead subscription ${sub.id}`);
            }
          }
        }

        // Mark notification as processed
        await supabase
          .from("pending_push_notifications")
          .update({ processed: true })
          .eq("id", notification.id);

        successCount++;
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error.message);
        failureCount++;
      }
    }

    console.log(`✓ Sent ${successCount} notifications, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingNotifications.length,
        sent: successCount,
        failed: failureCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-push-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
