import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/useAuth";

// ⚠️ PASTE YOUR PUBLIC KEY BELOW (Keep the quotes)
const PUBLIC_VAPID_KEY = "BOgFBgMZT2jfL9nB4RDqVxfFzOHJvauV_RECSKLIFDTFX1X352Wp60v81w5dG1butj-ER8E0y8hGePd0fxMSgQo"; 

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Helper: Convert VAPID key for the browser
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;

      // 1. Auto-save Timezone (Required for 9 PM Notifications)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Update timezone in profile (We ignore the error because Supabase types might be outdated)
      // @ts-ignore
      await supabase.from('profiles').update({ timezone }).eq('user_id', user.id);

      // 2. Check if already subscribed in browser
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribeToPush = async () => {
    if (!user) return;

    if (!('serviceWorker' in navigator)) {
      console.error("No Service Worker support!");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // 1. Request Permission from Apple/Google
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      // 2. Save the "Phone Number" (Endpoint) to Supabase
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')!)));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')!)));

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth
      }, { onConflict: 'user_id, endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Subscription failed:", error);
      return false;
    }
  };

  // 🔥 This allows the Settings page to send tests
  const sendTestNotification = async () => {
    if (!user) return;

    try {
      console.log("Sending test notification request...");
      const { data, error } = await supabase.functions.invoke('push-notification', {
        body: { 
          record: { user_id: user.id }, 
          type: 'TEST' 
        }
      });

      if (error) throw error;
      console.log("Test notification sent!", data);
      return true;
    } catch (error) {
      console.error("Failed to send test notification:", error);
      throw error;
    }
  };

  return {
    isSubscribed,
    subscribeToPush,
    sendTestNotification, 
    isSupported: 'serviceWorker' in navigator,
  };
};