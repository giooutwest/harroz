import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

const InstallPrompt = ({ isOpen, onClose, onInstall }: InstallPromptProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border p-6 max-w-sm w-full relative rounded-3xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 bg-secondary text-muted-foreground hover:text-foreground transition-colors rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center rounded-2xl"
              style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)" }}
            >
              <Smartphone className="w-8 h-8 text-primary-foreground" />
            </motion.div>

            {/* Content */}
            <div className="text-center">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-bold mb-2 text-xl"
              >
                Install Roz 📲
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mb-6 text-sm"
              >
                Add the app to your home screen for quick access, offline support, and the best experience!
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3"
              >
                <button
                  onClick={onInstall}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-primary/90 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  Show me how
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-secondary text-secondary-foreground font-medium transition-colors hover:bg-secondary/80 rounded-xl"
                >
                  Maybe later
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
