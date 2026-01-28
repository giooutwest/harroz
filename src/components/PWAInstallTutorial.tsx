import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, MoreVertical, ArrowDown, Smartphone, CheckCircle2 } from "lucide-react";

interface PWAInstallTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeviceType = "ios" | "android" | "desktop" | "unknown";

const detectDevice = (): DeviceType => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Mac|Linux/i.test(ua) && !/Mobile/i.test(ua)) return "desktop";
  return "unknown";
};

const PWAInstallTutorial = ({ isOpen, onClose }: PWAInstallTutorialProps) => {
  const [device, setDevice] = useState<DeviceType>("unknown");
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const iosSteps = [
    {
      icon: Share,
      title: "Tap the Share button",
      description: "Find the share icon at the bottom center of Safari",
      showBrowserArrow: "ios-share"
    },
    {
      icon: Plus,
      title: "Scroll & tap 'Add to Home Screen'",
      description: "Scroll down in the share menu to find this option",
      showBrowserArrow: null
    },
    {
      icon: CheckCircle2,
      title: "Tap 'Add' to confirm",
      description: "The app will appear on your home screen!",
      showBrowserArrow: null
    }
  ];

  const androidSteps = [
    {
      icon: MoreVertical,
      title: "Tap the menu button",
      description: "Three dots at the top right corner of Chrome",
      showBrowserArrow: "android-menu"
    },
    {
      icon: Smartphone,
      title: "Tap 'Add to Home screen'",
      description: "Or 'Install app' if you see that option",
      showBrowserArrow: null
    },
    {
      icon: CheckCircle2,
      title: "Confirm installation",
      description: "The app will appear on your home screen!",
      showBrowserArrow: null
    }
  ];

  const steps = device === "ios" ? iosSteps : androidSteps;
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  if (isInstalled) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border p-6 max-w-sm w-full text-center rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-4 bg-green-500/20 flex items-center justify-center rounded-full"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>
              <h2 className="font-bold mb-2 text-xl">
                Already Installed! 🎉
              </h2>
              <p className="text-muted-foreground mb-4">
                Roz is already on your home screen. You're all set!
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (device === "desktop") {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border p-6 max-w-sm w-full text-center rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-4 bg-primary/20 flex items-center justify-center rounded-full"
              >
                <Smartphone className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="font-bold mb-2 text-xl">
                Best on Mobile! 📱
              </h2>
              <p className="text-muted-foreground mb-4">
                Visit Roz on your phone's browser to install it as an app on your home screen.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-secondary z-10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Browser arrow pointing to actual UI element */}
          <AnimatePresence>
            {step.showBrowserArrow === "ios-share" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-primary font-bold mb-2 px-3 py-1 bg-primary/20 backdrop-blur text-sm rounded-full">
                    Tap Share below ↓
                  </span>
                  <ArrowDown className="w-8 h-8 text-primary" />
                </motion.div>
              </motion.div>
            )}
            {step.showBrowserArrow === "android-menu" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed top-4 right-16 z-20 flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="flex flex-col items-center"
                >
                  <ArrowDown className="w-8 h-8 text-primary rotate-180" />
                  <span className="text-primary font-bold mt-2 px-3 py-1 bg-primary/20 backdrop-blur text-sm rounded-full">
                    ↑ Tap menu above
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress dots */}
          <div className="pt-6 flex justify-center gap-2">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className="h-1.5 transition-all rounded-full"
                style={{
                  width: index === currentStep ? 24 : 8,
                  backgroundColor: index <= currentStep
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center max-w-sm"
              >
                {/* Step indicator */}
                <p className="text-muted-foreground mb-4 text-xs">
                  Step {currentStep + 1} of {steps.length}
                </p>

                {/* Icon with arrow */}
                <div className="relative mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-24 h-24 flex items-center justify-center bg-primary rounded-3xl"
                    style={{
                      boxShadow: "0 0 60px hsl(var(--primary) / 0.4)",
                    }}
                  >
                    <step.icon className="w-12 h-12 text-primary-foreground" />
                  </motion.div>
                </div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-bold mb-3 text-2xl"
                >
                  {step.title}
                </motion.h1>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground leading-relaxed text-base"
                >
                  {step.description}
                </motion.p>

                {/* Device-specific tips */}
                {device === "ios" && currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-secondary rounded-2xl"
                  >
                    <p className="text-muted-foreground text-xs">
                      💡 Make sure you're using <span className="text-foreground font-medium">Safari</span> —
                      this won't work in Chrome or other browsers on iPhone
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next button */}
          <div className="p-6 safe-area-bottom">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={handleNext}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold text-lg rounded-2xl"
            >
              {currentStep === steps.length - 1 ? "Done! 🎉" : "Next"}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallTutorial;
