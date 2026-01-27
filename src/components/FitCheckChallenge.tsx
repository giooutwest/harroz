import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Clock, Trophy, Shirt, Timer, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInSeconds, addMinutes, isAfter, isBefore } from "date-fns";

interface Challenge {
  id: string;
  challenge_date: string;
  challenge_time: string;
  challenge_timestamp: string;
}

interface FitCheckChallengeProps {
  isPixelTheme?: boolean;
  onOpenCamera: () => void;
}

const FitCheckChallenge = ({ isPixelTheme = false, onOpenCamera }: FitCheckChallengeProps) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [completedOnTime, setCompletedOnTime] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [challengeState, setChallengeState] = useState<"upcoming" | "active" | "missed" | "completed">("upcoming");
  const [fitCheckStreak, setFitCheckStreak] = useState(0);
  const { user } = useAuth();

  const borderRadius = isPixelTheme ? "0" : undefined;

  useEffect(() => {
    if (user) {
      fetchChallenge();
      fetchStreak();
    }
  }, [user]);

  // Update countdown every second
  useEffect(() => {
    if (!challenge) return;

    const interval = setInterval(() => {
      updateChallengeState();
    }, 1000);

    return () => clearInterval(interval);
  }, [challenge, hasCompleted]);

  const fetchChallenge = async () => {
    try {
      const { data, error } = await supabase.rpc("get_todays_challenge");

      if (error) {
        console.error("Error fetching challenge:", error);
        return;
      }

      if (data && data.length > 0) {
        setChallenge(data[0]);

        // Check if user has completed today's challenge
        const { data: completion } = await supabase
          .from("fit_check_completions")
          .select("on_time")
          .eq("user_id", user?.id)
          .eq("challenge_id", data[0].id)
          .maybeSingle();

        if (completion) {
          setHasCompleted(true);
          setCompletedOnTime(completion.on_time);
          setChallengeState("completed");
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchStreak = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("fit_check_streak")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setFitCheckStreak(data.fit_check_streak || 0);
    }
  };

  const updateChallengeState = useCallback(() => {
    if (!challenge || hasCompleted) return;

    const now = new Date();
    const challengeTime = new Date(challenge.challenge_timestamp);
    const windowEnd = addMinutes(challengeTime, 20);

    if (isBefore(now, challengeTime)) {
      // Challenge hasn't started yet
      setChallengeState("upcoming");
      const secondsUntilStart = differenceInSeconds(challengeTime, now);
      setTimeRemaining(secondsUntilStart);
    } else if (isAfter(now, challengeTime) && isBefore(now, windowEnd)) {
      // Challenge is active (within 20 min window)
      setChallengeState("active");
      const secondsRemaining = differenceInSeconds(windowEnd, now);
      setTimeRemaining(secondsRemaining);
    } else {
      // Challenge window has passed
      setChallengeState("missed");
      setTimeRemaining(0);
    }
  }, [challenge, hasCompleted]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  if (!challenge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-card border border-border ${isPixelTheme ? "" : "rounded-2xl"}`}
      style={{ borderRadius }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 bg-purple-500/20 flex items-center justify-center ${
              isPixelTheme ? "" : "rounded-full"
            }`}
            style={{ borderRadius }}
          >
            <Shirt className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-purple-500`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isPixelTheme ? "text-xs" : "text-sm"}`}>
              Daily Fit Check
            </h3>
            <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
              Today at {format(new Date(challenge.challenge_timestamp), "h:mm a")}
            </p>
          </div>
        </div>

        {/* Streak badge */}
        {fitCheckStreak > 0 && (
          <div
            className={`flex items-center gap-1 px-2 py-1 bg-purple-500/20 ${
              isPixelTheme ? "" : "rounded-full"
            }`}
            style={{ borderRadius }}
          >
            <Trophy className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"} text-purple-500`} />
            <span className={`text-purple-500 font-medium ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
              {fitCheckStreak} day streak
            </span>
          </div>
        )}
      </div>

      {/* Challenge Status */}
      <AnimatePresence mode="wait">
        {challengeState === "completed" ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 bg-green-500/10 border border-green-500/30 text-center ${
              isPixelTheme ? "" : "rounded-xl"
            }`}
            style={{ borderRadius }}
          >
            <Check className={`${isPixelTheme ? "w-6 h-6" : "w-8 h-8"} mx-auto mb-2 text-green-500`} />
            <p className={`font-medium text-green-500 ${isPixelTheme ? "text-xs" : "text-sm"}`}>
              {completedOnTime ? "Completed on time!" : "Completed!"}
            </p>
            {completedOnTime && (
              <p className={`text-green-500/70 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                You earned your purple shirt badge today!
              </p>
            )}
          </motion.div>
        ) : challengeState === "active" ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Active countdown */}
            <div
              className={`p-4 bg-purple-500/20 border border-purple-500/30 mb-3 ${
                isPixelTheme ? "" : "rounded-xl"
              }`}
              style={{ borderRadius }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-purple-500 font-medium ${isPixelTheme ? "text-xs" : "text-sm"}`}>
                    Time's ticking!
                  </p>
                  <p className={`text-purple-500/70 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                    Post your fit check now
                  </p>
                </div>
                <div className="text-right">
                  <motion.p
                    key={timeRemaining}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={`font-bold text-purple-500 ${isPixelTheme ? "text-lg" : "text-2xl"}`}
                  >
                    {formatTime(timeRemaining || 0)}
                  </motion.p>
                  <p className={`text-purple-500/70 ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                    remaining
                  </p>
                </div>
              </div>
            </div>

            {/* Take Photo Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onOpenCamera}
              className={`w-full flex items-center justify-center gap-2 py-3 bg-purple-500 text-white font-medium ${
                isPixelTheme ? "text-xs" : "text-sm rounded-xl"
              }`}
              style={{ borderRadius }}
            >
              <Camera className="w-5 h-5" />
              Take Fit Check Photo
            </motion.button>
          </motion.div>
        ) : challengeState === "missed" ? (
          <motion.div
            key="missed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 bg-muted text-center ${isPixelTheme ? "" : "rounded-xl"}`}
            style={{ borderRadius }}
          >
            <X className={`${isPixelTheme ? "w-6 h-6" : "w-8 h-8"} mx-auto mb-2 text-muted-foreground`} />
            <p className={`text-muted-foreground ${isPixelTheme ? "text-xs" : "text-sm"}`}>
              You missed today's challenge
            </p>
            <p className={`text-muted-foreground/70 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
              Don't worry, there's always tomorrow!
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 bg-secondary ${isPixelTheme ? "" : "rounded-xl"}`}
            style={{ borderRadius }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isPixelTheme ? "text-xs" : "text-sm"}`}>
                  Challenge starts in
                </p>
                <p className={`text-muted-foreground ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                  Be ready to snap a photo!
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${isPixelTheme ? "text-lg" : "text-2xl"}`}>
                  {formatTime(timeRemaining || 0)}
                </p>
                <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                  until challenge
                </p>
              </div>
            </div>

            {/* Info */}
            <div className={`mt-3 p-2 bg-card border border-border ${isPixelTheme ? "" : "rounded-lg"}`} style={{ borderRadius }}>
              <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>
                <Timer className="w-3 h-3 inline mr-1" />
                You'll have 20 minutes to post your fit check and earn a purple shirt badge!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FitCheckChallenge;
