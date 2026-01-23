import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, User, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isPixelTheme?: boolean;
  onNotificationClick?: (type: "like" | "comment" | "friend_request", actorId: string, moodId: string | null) => void;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "friend_request";
  actor_id: string;
  mood_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const NotificationsSheet = ({ isOpen, onClose, isPixelTheme = false, onNotificationClick }: NotificationsSheetProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { navigateToNotification } = useNotificationNavigation();

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
      // Mark as read after a small delay to ensure notifications are fetched first
      const timer = setTimeout(async () => {
        await markAllAsRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (notif) => {
          const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('user_id', notif.actor_id).maybeSingle();
          return { ...notif, actor_profile: profile } as Notification;
        })
      );
      setNotifications(enriched);
    }
    setLoading(false);
  }, [user]);

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // Mark as read in DB.
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .select();

      if (error) {
        console.error("Error marking notifications as read:", error);
      } else {
        console.log(`Marked ${data?.length || 0} notifications as read`);
      }
    } catch (err) {
      console.error("Exception marking notifications as read:", err);
    }
  };

  // 🔥 FIXED: Optimistic clear + Actual DB deletion
  const handleClearAll = async () => {
    if (!user) return;
    if (!window.confirm("Clear all notifications?")) return;

    // 1. Clear screen immediately
    setNotifications([]);

    try {
      // 2. Delete from DB so they don't come back
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error("Error deleting notifications:", error);
        // Refetch to show current state if delete failed
        await fetchNotifications();
      } else {
        console.log(`Deleted ${data?.length || 0} notifications`);
        // Close the sheet after successful clear
        onClose();
      }
    } catch (err) {
      console.error("Exception deleting notifications:", err);
      await fetchNotifications();
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    navigateToNotification(notif.type, notif.actor_id, notif.mood_id, notif.comment_id);
    onNotificationClick?.(notif.type, notif.actor_id, notif.mood_id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={(e) => e.stopPropagation()} className={`bg-card border-t border-border w-full max-w-lg safe-area-bottom flex flex-col ${isPixelTheme ? "" : "rounded-t-3xl"}`} style={{ maxHeight: "70vh" }}>
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h3 className={`font-semibold ${isPixelTheme ? "text-xs" : "text-lg"}`}>Notifications</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={handleClearAll} className={`flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>
                    <Trash2 className="w-4 h-4" /> Clear all
                  </button>
                )}
                <button onClick={onClose} className={`p-2 bg-secondary ${isPixelTheme ? "" : "rounded-full"}`}><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Heart className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className={`${isPixelTheme ? "text-xs" : ""}`}>No notifications yet</p></div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={`w-full bg-secondary p-3 flex items-center gap-3 text-left ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius: isPixelTheme ? "0" : undefined }}>
                      <div className={`w-10 h-10 flex items-center justify-center overflow-hidden ${isPixelTheme ? "" : "rounded-full"}`}>{notif.actor_profile?.avatar_url ? <img src={notif.actor_profile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; }} /> : <User className="w-5 h-5 text-muted-foreground" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`${isPixelTheme ? "text-[8px]" : "text-sm"}`}><span className="font-medium">{notif.actor_profile?.display_name || "Someone"}</span> {notif.type === "like" ? "liked your mood" : notif.type === "comment" ? "commented on your mood" : "sent you a friend request"}</p>
                        <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsSheet;