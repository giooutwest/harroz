import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { FeatureId, useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";

interface FeatureDiscoveryModalProps {
  featureId: FeatureId;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  illustration?: string;
  ctaText?: string;
  onTryIt?: () => void;
}

const FeatureDiscoveryModal = ({
  featureId,
  title,
  description,
  icon,
  iconBgColor,
  illustration,
  ctaText = "Got it!",
  onTryIt
}: FeatureDiscoveryModalProps) => {
  const { shouldShowTooltip, markDiscovered } = useFeatureDiscovery();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay before showing
    if (shouldShowTooltip(featureId)) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [featureId, shouldShowTooltip]);

  const handleDismiss = () => {
    setIsOpen(false);
    markDiscovered(featureId);
    onTryIt?.();
  };

  const handleSkip = () => {
    setIsOpen(false);
    markDiscovered(featureId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">New Feature</span>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 flex items-center justify-center mb-4 rounded-2xl"
                style={{ backgroundColor: iconBgColor }}
              >
                {icon}
              </motion.div>

              {/* Illustration */}
              {illustration && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl mb-4"
                >
                  {illustration}
                </motion.p>
              )}

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-bold text-xl mb-2"
              >
                {title}
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-sm leading-relaxed mb-6"
              >
                {description}
              </motion.p>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handleDismiss}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl"
                whileTap={{ scale: 0.98 }}
              >
                {ctaText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeatureDiscoveryModal;
