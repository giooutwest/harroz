import { motion, AnimatePresence } from "framer-motion";
import { X, FlaskConical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BetaPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const BetaPrompt = ({ isOpen, onClose }: BetaPromptProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-40 max-w-sm mx-auto bg-card border border-border shadow-xl p-4 rounded-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary/20 flex items-center justify-center rounded-full">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-4">
              <h4 className="font-semibold mb-1 text-sm">
                Beta Testing 🧪
              </h4>
              <p className="text-muted-foreground text-xs">
                This app is in testing! Your feedback helps us improve.
                Share your thoughts in <span className="inline-flex items-center gap-0.5"><Settings className="w-3 h-3" /> Settings</span>.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full mt-3 text-muted-foreground"
          >
            Got it!
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BetaPrompt;
