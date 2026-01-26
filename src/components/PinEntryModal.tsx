import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Check, AlertCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "setup" | "verify" | "change";
  verifyPin?: (pin: string) => Promise<boolean>;
  setupPin?: (pin: string) => Promise<boolean>;
  changePin?: (oldPin: string, newPin: string) => Promise<boolean>;
  isPixelTheme?: boolean;
}

type Step = "enter" | "confirm" | "old" | "new" | "confirmNew";

const PinEntryModal = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  verifyPin,
  setupPin,
  changePin,
  isPixelTheme = false
}: PinEntryModalProps) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("enter");
  const [shake, setShake] = useState(false);

  // Reset state when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setConfirmPin("");
      setOldPin("");
      setError("");
      setIsLoading(false);
      setShake(false);

      if (mode === "setup") {
        setStep("enter");
      } else if (mode === "verify") {
        setStep("enter");
      } else if (mode === "change") {
        setStep("old");
      }
    }
  }, [isOpen, mode]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePinComplete = async (value: string) => {
    if (value.length !== 4) return;

    setError("");

    if (mode === "verify") {
      setIsLoading(true);
      const isValid = await verifyPin?.(value);
      setIsLoading(false);

      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError("Incorrect PIN");
        setPin("");
        triggerShake();
      }
    } else if (mode === "setup") {
      if (step === "enter") {
        setPin(value);
        setStep("confirm");
        setConfirmPin("");
      } else if (step === "confirm") {
        if (value === pin) {
          setIsLoading(true);
          const success = await setupPin?.(pin);
          setIsLoading(false);

          if (success) {
            onSuccess();
            onClose();
          } else {
            setError("Failed to set PIN. Please try again.");
            setPin("");
            setConfirmPin("");
            setStep("enter");
          }
        } else {
          setError("PINs don't match. Try again.");
          setPin("");
          setConfirmPin("");
          setStep("enter");
          triggerShake();
        }
      }
    } else if (mode === "change") {
      if (step === "old") {
        setOldPin(value);
        setIsLoading(true);
        const isValid = await verifyPin?.(value);
        setIsLoading(false);

        if (isValid) {
          setStep("new");
          setPin("");
        } else {
          setError("Incorrect current PIN");
          setOldPin("");
          triggerShake();
        }
      } else if (step === "new") {
        setPin(value);
        setStep("confirmNew");
        setConfirmPin("");
      } else if (step === "confirmNew") {
        if (value === pin) {
          setIsLoading(true);
          const success = await changePin?.(oldPin, pin);
          setIsLoading(false);

          if (success) {
            onSuccess();
            onClose();
          } else {
            setError("Failed to change PIN. Please try again.");
            setOldPin("");
            setPin("");
            setConfirmPin("");
            setStep("old");
          }
        } else {
          setError("PINs don't match. Try again.");
          setPin("");
          setConfirmPin("");
          setStep("new");
          triggerShake();
        }
      }
    }
  };

  const getTitle = () => {
    if (mode === "setup") {
      return step === "enter" ? "Create Journal PIN" : "Confirm Your PIN";
    }
    if (mode === "verify") {
      return "Enter Journal PIN";
    }
    if (mode === "change") {
      if (step === "old") return "Enter Current PIN";
      if (step === "new") return "Enter New PIN";
      return "Confirm New PIN";
    }
    return "Enter PIN";
  };

  const getSubtitle = () => {
    if (mode === "setup") {
      return step === "enter"
        ? "Create a 4-digit PIN to protect your private journal"
        : "Enter the same PIN again to confirm";
    }
    if (mode === "verify") {
      return "Enter your 4-digit PIN to access your journal";
    }
    if (mode === "change") {
      if (step === "old") return "Enter your current PIN to continue";
      if (step === "new") return "Enter your new 4-digit PIN";
      return "Enter the same PIN again to confirm";
    }
    return "";
  };

  const getCurrentValue = () => {
    if (mode === "setup") {
      return step === "enter" ? pin : confirmPin;
    }
    if (mode === "verify") {
      return pin;
    }
    if (mode === "change") {
      if (step === "old") return oldPin;
      if (step === "new") return pin;
      return confirmPin;
    }
    return pin;
  };

  const handleChange = (value: string) => {
    if (mode === "setup") {
      if (step === "enter") {
        setPin(value);
      } else {
        setConfirmPin(value);
      }
    } else if (mode === "verify") {
      setPin(value);
    } else if (mode === "change") {
      if (step === "old") {
        setOldPin(value);
      } else if (step === "new") {
        setPin(value);
      } else {
        setConfirmPin(value);
      }
    }

    if (value.length === 4) {
      handlePinComplete(value);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: shake ? [0, -10, 10, -10, 10, 0] : 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: shake ? 0.4 : 0.2 }}
          className={`bg-card border border-border w-full max-w-sm p-6 ${isPixelTheme ? "" : "rounded-2xl"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto mb-4 bg-primary/10 flex items-center justify-center ${isPixelTheme ? "" : "rounded-full"}`}>
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className={`font-bold mb-2 ${isPixelTheme ? "text-sm" : "text-xl"}`}>
              {getTitle()}
            </h2>
            <p className={`text-muted-foreground ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
              {getSubtitle()}
            </p>
          </div>

          {/* PIN Input */}
          <div className="flex justify-center mb-6">
            <InputOTP
              maxLength={4}
              value={getCurrentValue()}
              onChange={handleChange}
              disabled={isLoading}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className={`w-14 h-14 text-2xl ${isPixelTheme ? "rounded-none" : ""}`} />
                <InputOTPSlot index={1} className={`w-14 h-14 text-2xl ${isPixelTheme ? "rounded-none" : ""}`} />
                <InputOTPSlot index={2} className={`w-14 h-14 text-2xl ${isPixelTheme ? "rounded-none" : ""}`} />
                <InputOTPSlot index={3} className={`w-14 h-14 text-2xl ${isPixelTheme ? "rounded-none" : ""}`} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-destructive mb-4"
            >
              <AlertCircle className="w-4 h-4" />
              <span className={isPixelTheme ? "text-[10px]" : "text-sm"}>{error}</span>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
              />
              <span className={isPixelTheme ? "text-[10px]" : "text-sm"}>Verifying...</span>
            </div>
          )}

          {/* Step indicator for multi-step flows */}
          {(mode === "setup" || mode === "change") && (
            <div className="flex justify-center gap-2 mt-6">
              {mode === "setup" ? (
                <>
                  <div className={`w-2 h-2 ${step === "enter" ? "bg-primary" : "bg-muted"} ${isPixelTheme ? "" : "rounded-full"}`} />
                  <div className={`w-2 h-2 ${step === "confirm" ? "bg-primary" : "bg-muted"} ${isPixelTheme ? "" : "rounded-full"}`} />
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 ${step === "old" ? "bg-primary" : "bg-muted"} ${isPixelTheme ? "" : "rounded-full"}`} />
                  <div className={`w-2 h-2 ${step === "new" ? "bg-primary" : "bg-muted"} ${isPixelTheme ? "" : "rounded-full"}`} />
                  <div className={`w-2 h-2 ${step === "confirmNew" ? "bg-primary" : "bg-muted"} ${isPixelTheme ? "" : "rounded-full"}`} />
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PinEntryModal;
