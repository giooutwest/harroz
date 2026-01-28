import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Shirt, Clock } from "lucide-react";

type CameraMode = "mood" | "fitcheck";

interface CameraSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: CameraMode) => void;
  moodWindowOpen: boolean;
  fitCheckActive: boolean;
  fitCheckTimeRemaining?: number | null;
}

const CameraSelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  moodWindowOpen,
  fitCheckActive,
  fitCheckTimeRemaining
}: CameraSelectionModalProps) => {

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card border border-border p-4 rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              What are you posting?
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary transition-colors rounded-full"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Mood Photo Option */}
            {moodWindowOpen && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect("mood")}
                className="w-full flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 transition-colors rounded-xl"
              >
                <div
                  className="w-12 h-12 bg-primary/20 flex items-center justify-center rounded-full"
                >
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">
                    Mood Photo
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Add a photo to your daily mood entry
                  </p>
                </div>
              </motion.button>
            )}

            {/* Fit Check Option */}
            {fitCheckActive && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect("fitcheck")}
                className="w-full flex items-center gap-4 p-4 bg-purple-500/20 border-2 border-purple-500 hover:bg-purple-500/30 transition-colors rounded-xl"
              >
                <div
                  className="w-12 h-12 bg-purple-500 flex items-center justify-center rounded-full"
                >
                  <Shirt className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-purple-500 text-sm">
                    Fit Check!
                  </p>
                  <p className="text-purple-500/70 text-xs">
                    Post your outfit now
                  </p>
                </div>
                {fitCheckTimeRemaining && fitCheckTimeRemaining > 0 && (
                  <div className="flex items-center gap-1 text-purple-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono font-bold text-sm">
                      {formatTime(fitCheckTimeRemaining)}
                    </span>
                  </div>
                )}
              </motion.button>
            )}

            {/* If neither is available */}
            {!moodWindowOpen && !fitCheckActive && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  No posting windows are open right now
                </p>
                <p className="mt-1 text-xs">
                  Mood posts open at 9 PM
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CameraSelectionModal;
