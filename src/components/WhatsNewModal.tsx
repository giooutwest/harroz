import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Activity,
  Clock,
  Palette,
  Shirt,
  CheckCircle2,
  Camera
} from "lucide-react";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tryItAction: "today" | "stats" | "settings" | "fitcheck";
  illustration: string;
}

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryFeature: (action: "today" | "stats" | "settings" | "fitcheck") => void;
}

const features: Feature[] = [
  {
    id: "authentic-photos",
    title: "Real Moments Only",
    description: "We want to see the most authentic photo of your day! You can now only take photos through the app — no more uploading from your gallery. Use this space to be vulnerable and real with your friends.",
    icon: Camera,
    color: "hsl(340, 75%, 55%)",
    tryItAction: "today",
    illustration: "📸💕🌟"
  },
  {
    id: "routine-tags",
    title: "Activity Tags",
    description: "Track what you do each day with simple toggles. See how activities like working out or reading affect your mood over time!",
    icon: Activity,
    color: "hsl(210, 80%, 55%)",
    tryItAction: "today",
    illustration: "💪✨📚🧘💧"
  },
  {
    id: "time-travel",
    title: "Time Travel",
    description: "Look back at what you wrote exactly one month ago, or see how your previous week went. Gain perspective on your journey!",
    icon: Clock,
    color: "hsl(280, 70%, 55%)",
    tryItAction: "stats",
    illustration: "📅⏰🔮"
  },
  {
    id: "fit-check",
    title: "Daily Fit Check Challenge",
    description: "Get a notification at a random time each day. You have 20 minutes to snap a photo of your fit! Earn purple shirt badges for completing on time.",
    icon: Shirt,
    color: "hsl(270, 60%, 55%)",
    tryItAction: "fitcheck",
    illustration: "👔📸🏆"
  },
  {
    id: "grunge-theme",
    title: "Y2K Grunge Theme",
    description: "New aesthetic! Typewriter fonts, paper textures, and a chaotic red/black color palette. For when you want that vintage rebellion vibe.",
    icon: Palette,
    color: "hsl(0, 70%, 45%)",
    tryItAction: "settings",
    illustration: "🎸📰✒️"
  },
  {
    id: "activity-insights",
    title: "Activity Insights",
    description: "See charts showing how your activities correlate with your mood. Discover what makes you feel better and do more of it!",
    icon: Sparkles,
    color: "hsl(45, 90%, 50%)",
    tryItAction: "stats",
    illustration: "📊📈💡"
  }
];

const WhatsNewModal = ({ isOpen, onClose, onTryFeature }: WhatsNewModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentFeature = features[currentIndex];
  const isLastFeature = currentIndex === features.length - 1;
  const isFirstFeature = currentIndex === 0;

  const goToNext = () => {
    if (!isLastFeature) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (!isFirstFeature) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleTryIt = () => {
    onTryFeature(currentFeature.tryItAction);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border w-full max-w-md overflow-hidden shadow-2xl rounded-3xl"
        >
          {/* Header */}
          <div className="relative p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">What's New</h2>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-secondary transition-colors rounded-full"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-3">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 transition-all rounded-full ${
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Feature Content */}
          <div className="relative overflow-hidden" style={{ height: "340px" }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-6 flex flex-col"
              >
                {/* Icon and illustration */}
                <div className="flex flex-col items-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 flex items-center justify-center mb-3 rounded-2xl"
                    style={{
                      backgroundColor: currentFeature.color + "20",
                      border: `2px solid ${currentFeature.color}`
                    }}
                  >
                    <currentFeature.icon
                      className="w-10 h-10"
                      style={{ color: currentFeature.color }}
                    />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl"
                  >
                    {currentFeature.illustration}
                  </motion.p>
                </div>

                {/* Title and description */}
                <div className="text-center flex-1">
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-bold mb-2 text-xl"
                  >
                    {currentFeature.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground leading-relaxed text-sm"
                  >
                    {currentFeature.description}
                  </motion.p>
                </div>

                {/* Try it button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleTryIt}
                  className="w-full py-3 font-semibold flex items-center justify-center gap-2 text-sm rounded-xl"
                  style={{
                    backgroundColor: currentFeature.color,
                    color: "white"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Try it out!
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <button
              onClick={goToPrev}
              disabled={isFirstFeature}
              className={`flex items-center gap-1 px-3 py-2 transition-colors disabled:opacity-30 text-sm rounded-lg ${
                !isFirstFeature ? "hover:bg-secondary" : ""
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-muted-foreground text-xs">
              {currentIndex + 1} of {features.length}
            </span>

            {isLastFeature ? (
              <button
                onClick={handleSkip}
                className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg"
              >
                Done
                <Sparkles className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goToNext}
                className="flex items-center gap-1 px-3 py-2 hover:bg-secondary transition-colors text-sm rounded-lg"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WhatsNewModal;
