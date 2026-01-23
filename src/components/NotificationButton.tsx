import { useState } from "react";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import NotificationsSheet from "./NotificationsSheet";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export const NotificationButton = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNotifications(true)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
        )}
      </motion.button>

      {/* The Sheet now handles its own navigation internally */}
      <NotificationsSheet
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};
