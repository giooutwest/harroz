import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { FeatureId, useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";

interface FeatureTooltipProps {
  featureId: FeatureId;
  title: string;
  description: string;
  icon?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  delay?: number;
  children?: React.ReactNode;
}

const FeatureTooltip = ({
  featureId,
  title,
  description,
  icon,
  position = "bottom",
  delay = 500,
  children
}: FeatureTooltipProps) => {
  const { shouldShowTooltip, markDiscovered } = useFeatureDiscovery();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (shouldShowTooltip(featureId)) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [featureId, shouldShowTooltip, delay]);

  const handleDismiss = () => {
    setShowTooltip(false);
    markDiscovered(featureId);
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "top-full mt-2 left-1/2 -translate-x-1/2";
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary";
      default:
        return "";
    }
  };

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === "top" ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 ${getPositionClasses()}`}
          >
            <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg min-w-[240px] max-w-[280px]">
              {/* Arrow */}
              {position !== "center" && (
                <div className={`absolute w-0 h-0 border-8 ${getArrowClasses()}`} />
              )}

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="flex items-start gap-3">
                {icon ? (
                  <span className="text-2xl">{icon}</span>
                ) : (
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 pr-4">
                  <h4 className="font-bold text-sm mb-1">{title}</h4>
                  <p className="text-xs opacity-90 leading-relaxed">{description}</p>
                </div>
              </div>

              {/* Got it button */}
              <button
                onClick={handleDismiss}
                className="w-full mt-3 py-2 bg-white/20 hover:bg-white/30 text-sm font-medium rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeatureTooltip;
