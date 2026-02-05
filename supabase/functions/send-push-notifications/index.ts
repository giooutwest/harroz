// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// @ts-ignore - Import the library to handle encryption and headers
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Setup Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Configure VAPID (The Library handles the complexity now)
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:5gunsisus@gmail.com";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured in Supabase Secrets");
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // 3. Fetch pending notifications from the queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("pending_push_notifications")
      .select("*")
      .eq("processed", false)
      .limit(100);

    if (fetchError) throw fetchError;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications...`);

    // 4. Buffer/consolidate notifications to prevent spam
    // Group by user_id + sender to prevent notification flooding

    const groupedNotifications = new Map<string, {
      notifications: typeof pendingNotifications;
      latestNotification: typeof pendingNotifications[0];
      count: number;
    }>();

    for (const notification of pendingNotifications) {
      // Create a group key based on user_id and sender info
      const senderId = notification.data?.sender_id || notification.data?.from_user_id || 'unknown';
      const notificationType = notification.data?.type || 'nudge';
      const groupKey = `${notification.user_id}:${senderId}:${notificationType}`;

      const existing = groupedNotifications.get(groupKey);
      if (existing) {
        existing.notifications.push(notification);
        existing.count++;
        // Keep the most recent notification as the template
        if (new Date(notification.created_at) > new Date(existing.latestNotification.created_at)) {
          existing.latestNotification = notification;
        }
      } else {
        groupedNotifications.set(groupKey, {
          notifications: [notification],
          latestNotification: notification,
          count: 1,
        });
      }
    }

    console.log(`Consolidated into ${groupedNotifications.size} grouped notifications`);

    let successCount = 0;
    let failureCount = 0;

    // 5. Process each grouped notification
    for (const [, group] of groupedNotifications) {
      const notification = group.latestNotification;
      const allNotificationIds = group.notifications.map((n: any) => n.id);
      const nudgeCount = group.count;

      try {
        // Get user's subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", notification.user_id);

        if (!subs || subs.length === 0) {
          console.log(`No subscriptions for user ${notification.user_id}`);
          // Mark all in group as processed so we don't retry forever
          await supabase
            .from("pending_push_notifications")
            .update({ processed: true })
            .in("id", allNotificationIds);
          continue;
        }

        // Consolidate notification body if multiple nudges from same sender
        let consolidatedBody = notification.body;
        if (nudgeCount > 1) {
          // Extract sender name from existing body/title if possible
          const senderName = notification.data?.sender_name || notification.title?.replace(' nudged you!', '') || 'Someone';
          consolidatedBody = `${senderName} nudged you ${nudgeCount} times!`;
        }

        // Send to all devices
        const notificationPayload = JSON.stringify({
          title: nudgeCount > 1 ? `${nudgeCount} nudges!` : notification.title,
          body: consolidatedBody,
          icon: "/icon-192x192.png",
          url: notification.data?.url || "/",
        });

        // 🔥 FIX: Added ': any' to 'sub' to silence VS Code errors
        const sendPromises = subs.map(async (sub: any) => {
          try {
            // THE FIX: Use the library to send
            // We reconstruct the subscription object to ensure it has the right shape
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys?.p256dh || sub.p256dh, // Handle different DB column names
                auth: sub.keys?.auth || sub.auth,
              },
            };

            await webpush.sendNotification(pushSubscription, notificationPayload);
            return { success: true, id: sub.id };
          } catch (error: any) {
            // 410 Gone / 404 Not Found means the user revoked permission
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log(`Cleaning up dead subscription: ${sub.id}`);
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              console.error(`Failed to send to ${sub.id}:`, error.body || error);
            }
            return { success: false, id: sub.id };
          }
        });

        await Promise.all(sendPromises);

        // Mark all notifications in this group as processed
        await supabase
          .from("pending_push_notifications")
          .update({ processed: true })
          .in("id", allNotificationIds);

        successCount += nudgeCount;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failureCount++;
      }
    }

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
    console.error("Critical Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});