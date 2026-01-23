import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Calendar, BarChart3, Camera, ChevronRight, Sparkles, Smartphone, Bell } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
  isPixelTheme?: boolean;
}

const steps = [
  {
    icon: Sun,
    title: "Welcome to Roz! ☀️",
    description: "Your personal mood tracker that helps you understand your emotional weather patterns over time.",
    color: "hsl(50, 90%, 55%)",
  },
  {
    icon: Calendar,
    title: "Daily Check-ins at 9 PM",
    description: "Your journal opens at 9 PM each night so you can reflect on your whole day. Rate from 1-10 using our weather scale!",
    color: "hsl(210, 80%, 55%)",
  },
  {
    icon: Camera,
    title: "Capture Moments",
    description: "Add photos and captions to remember what made each day special. Build a visual journal of your journey!",
    color: "hsl(140, 55%, 45%)",
  },
  {
    icon: Bell,
    title: "Never Miss a Check-in",
    description: "Enable notifications to get a reminder at 9 PM. You have until midnight to log your mood each day!",
    color: "hsl(280, 80%, 65%)",
  },
  {
    icon: Smartphone,
    title: "Install the App",
    description: "Add Roz to your home screen for quick access! Go to Settings to learn how.",
    color: "hsl(30, 80%, 55%)",
  },
  {
    icon: Sparkles,
    title: "You're All Set!",
    description: "Start by logging how you're feeling today. Remember: there's no wrong answer, just honest check-ins!",
    color: "hsl(350, 70%, 60%)",
  },
];

const Onboarding = ({ onComplete, isPixelTheme = false }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6"
    >
      {/* Skip button - Moved down to top-14 to clear iPhone Notch */}
      {!isLastStep && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleSkip}
          className={`absolute top-14 right-6 text-muted-foreground hover:text-foreground transition-colors ${isPixelTheme ? "text-xs" : "text-sm"}`}
        >
          Skip
        </motion.button>
      )}

      {/* Progress dots - Moved down to top-14 */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex gap-2">
        {steps.map((_, index) => (
          <motion.div
            key={index}
            className={`h-1.5 transition-all ${isPixelTheme ? "" : "rounded-full"}`}
            style={{
              width: index === currentStep ? 24 : 8,
              backgroundColor: index <= currentStep ? step.color : "hsl(var(--muted))",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className={`w-28 h-28 flex items-center justify-center mb-8 ${isPixelTheme ? "pixel-border" : "rounded-full"}`}
            style={{ 
              backgroundColor: step.color,
              boxShadow: `0 0 60px ${step.color}40`,
            }}
          >
            <Icon className="w-12 h-12 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`font-bold mb-4 ${isPixelTheme ? "text-base" : "text-2xl"}`}
          >
            {step.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-muted-foreground leading-relaxed ${isPixelTheme ? "text-xs" : "text-base"}`}
          >
            {step.description}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Next button - Moved up to bottom-16 to clear Home Indicator */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={handleNext}
        whileTap={{ scale: 0.95 }}
        className={`absolute bottom-16 w-[calc(100%-3rem)] max-w-sm py-4 bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ${isPixelTheme ? "text-sm" : "text-lg rounded-2xl"}`}
        style={{ borderRadius: isPixelTheme ? 0 : undefined }}
      >
        {isLastStep ? "Let's Go!" : "Next"}
        {!isLastStep && <ChevronRight className="w-5 h-5" />}
      </motion.button>
    </motion.div>
  );
};

export default Onboarding;