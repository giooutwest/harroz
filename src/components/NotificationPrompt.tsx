import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

interface NotificationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  isPixelTheme?: boolean;
}

const NotificationPrompt = ({ isOpen, onClose, isPixelTheme }: NotificationPromptProps) => {
  const { 
    isSupported, 
    subscribeToPush,
    sendTestNotification 
  } = usePushNotifications();

  const handleEnable = async () => {
    if (!isSupported) {
      toast.error("Notifications aren't supported on this device");
      onClose();
      return;
    }

    // subscribeToPush handles both permission request and subscription
    const success = await subscribeToPush();
    
    if (success) {
      toast.success("Notifications enabled! You'll get daily reminders at 9 PM 🔔");
      // Send a test notification
      setTimeout(() => {
        sendTestNotification();
      }, 1000);
    }
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`
              relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl
              ${isPixelTheme ? "font-mono" : ""}
            `}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 15 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className={`
                  w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center
                  ${isPixelTheme ? "rounded-none" : ""}
                `}>
                  <Bell className={`w-8 h-8 text-primary ${isPixelTheme ? "" : ""}`} />
                </div>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    repeatDelay: 1
                  }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className={`font-bold mb-2 ${isPixelTheme ? "text-base" : "text-lg"}`}>
                Stay Connected! 🔔
              </h3>
              <p className={`text-muted-foreground ${isPixelTheme ? "text-xs" : "text-sm"}`}>
                Get notified when friends interact with your moods or send you friend requests.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {[
                "Friend request alerts",
                "Likes on your moods",
                "Comments from friends"
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`
                    flex items-center gap-2 text-muted-foreground
                    ${isPixelTheme ? "text-xs" : "text-sm"}
                  `}
                >
                  <span className="text-primary">✓</span>
                  {feature}
                </motion.div>
              ))}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleEnable}
                className={`w-full ${isPixelTheme ? "rounded-none text-xs" : ""}`}
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className={`w-full text-muted-foreground ${isPixelTheme ? "rounded-none text-xs" : ""}`}
              >
                Maybe Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;
