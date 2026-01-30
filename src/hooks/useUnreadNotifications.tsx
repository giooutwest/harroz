import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial count
    fetchCount();

    // OPTIMIZED: Subscribe to specific events instead of all events
    const channel = supabase
      .channel('unread-notifications')
      // New notification: increment count directly (avoid refetch)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Only increment if the new notification is unread
          if (payload.new && !(payload.new as any).read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      // Notification marked as read/deleted: refetch to be safe
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // If notification was marked as read, decrement
          const oldRead = (payload.old as any)?.read;
          const newRead = (payload.new as any)?.read;
          if (!oldRead && newRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // On delete, refetch to be safe
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return unreadCount;
};
