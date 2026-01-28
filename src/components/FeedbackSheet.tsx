import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquareHeart, Star, Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = "general" | "bug" | "feature";

const FeedbackSheet = ({ isOpen, onClose }: FeedbackSheetProps) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const feedbackTypes = [
    { id: "general" as const, label: "General", icon: MessageSquareHeart },
    { id: "bug" as const, label: "Bug Report", icon: Bug },
    { id: "feature" as const, label: "Feature Idea", icon: Lightbulb },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Please enter your feedback",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Please sign in to submit feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          type: feedbackType,
          message: message.trim(),
          rating: rating || null,
        });

      if (error) throw error;

      toast({
        title: "Thank you for your feedback! 💜",
        description: "Your input helps us improve the app.",
      });

      setMessage("");
      setRating(0);
      setFeedbackType("general");
      onClose();
    } catch (error) {
      toast({
        title: "Couldn't submit feedback",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border p-6 shadow-2xl rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Send Feedback
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Type */}
            <div className="mb-4">
              <label className="text-muted-foreground mb-2 block text-xs">
                What kind of feedback?
              </label>
              <div className="flex gap-2">
                {feedbackTypes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFeedbackType(id)}
                    className={`
                      flex-1 flex flex-col items-center gap-1 p-3 border transition-all rounded-xl
                      ${feedbackType === id
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="text-muted-foreground mb-2 block text-xs">
                How are you enjoying the app? (optional)
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star === rating ? 0 : star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="text-muted-foreground mb-2 block text-xs">
                Your feedback
              </label>
              <Textarea
                placeholder={
                  feedbackType === "bug"
                    ? "Describe the bug you encountered..."
                    : feedbackType === "feature"
                    ? "What feature would you like to see?"
                    : "Tell us what you think..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackSheet;
