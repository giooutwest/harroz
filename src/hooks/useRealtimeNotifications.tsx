import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useNotificationNavigation } from "./useNotificationNavigation";

/**
 * Hook that listens for real-time notifications and shows toast messages
 * when new likes/comments arrive. This provides instant in-app feedback
 * without requiring the user to open the notifications panel.
 * 
 * Toasts are now clickable to navigate to the relevant content.
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigateToNotification } = useNotificationNavigation();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!user || isSubscribedRef.current) return;

    isSubscribedRef.current = true;

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`realtime-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const notification = payload.new as {
            id: string;
            type: string;
            actor_id: string;
            mood_id: string | null;
            comment_id: string | null;
          };

          // Fetch the actor's profile to show their name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', notification.actor_id)
            .maybeSingle();

          const actorName = profile?.display_name || 'Someone';

          // Show appropriate toast based on notification type
          if (notification.type === 'like') {
            toast({
              title: "❤️ New Like!",
              description: `${actorName} liked your mood — tap to view`,
              onClick: () => navigateToNotification('like', notification.actor_id, notification.mood_id),
            });
          } else if (notification.type === 'comment') {
            toast({
              title: "💬 New Comment!",
              description: `${actorName} commented on your mood — tap to view`,
              onClick: () => navigateToNotification('comment', notification.actor_id, notification.mood_id, notification.comment_id),
            });
          } else if (notification.type === 'friend_request') {
            toast({
              title: "👋 Friend Request!",
              description: `${actorName} wants to be your friend — tap to view`,
              onClick: () => navigateToNotification('friend_request', notification.actor_id, null),
            });
          }

          // Play notification sound (subtle)
          try {
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880; // A5 note
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          } catch {
            // Audio not available, silently ignore
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, toast, navigateToNotification]);
};
