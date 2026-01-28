import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const UpdateBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if we should show the banner
    const lastShown = localStorage.getItem("moodmemos-update-banner-shown");
    const now = Date.now();

    // Only show once per session (or once per hour)
    if (!lastShown || now - parseInt(lastShown) > 3600000) {
      // Slight delay before showing
      const showTimer = setTimeout(() => {
        setShow(true);
        localStorage.setItem("moodmemos-update-banner-shown", now.toString());
      }, 1000);

      return () => clearTimeout(showTimer);
    }
  }, []);

  useEffect(() => {
    if (show) {
      const hideTimer = setTimeout(() => {
        setShow(false);
      }, 2000);

      return () => clearTimeout(hideTimer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">
            New update available! Check settings.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateBanner;
