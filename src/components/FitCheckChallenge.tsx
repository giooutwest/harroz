import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Clock, Trophy, Shirt, Timer, Check, X, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInSeconds, addMinutes, subMinutes, isAfter, isBefore } from "date-fns";

interface Challenge {
  id: string;
  challenge_date: string;
  challenge_time: string;
  challenge_timestamp: string;
}

interface FitCheckChallengeProps {
  onOpenCamera: () => void;
}

// States:
// "hidden" - More than 30 min before challenge
// "teaser" - 30 min to 0 min before challenge (shows "coming soon")
// "active" - 0 to 15 min after challenge time (the actual window)
// "missed" - After 15 min window
// "completed" - User completed it

type ChallengeState = "hidden" | "teaser" | "active" | "missed" | "completed";

const FitCheckChallenge = ({ onOpenCamera }: FitCheckChallengeProps) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [completedOnTime, setCompletedOnTime] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState>("hidden");
  const [fitCheckStreak, setFitCheckStreak] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchChallenge();
      fetchStreak();
    }
  }, [user]);

  // Update countdown every second
  useEffect(() => {
    if (!challenge) return;

    // Initial update
    updateChallengeState();

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
    const teaserStart = subMinutes(challengeTime, 30); // 30 min before
    const windowEnd = addMinutes(challengeTime, 15); // 15 min window

    if (isBefore(now, teaserStart)) {
      // More than 30 min before - hide completely
      setChallengeState("hidden");
      setTimeRemaining(null);
    } else if (isBefore(now, challengeTime)) {
      // 30 min to 0 min before - show teaser
      setChallengeState("teaser");
      const secondsUntilStart = differenceInSeconds(challengeTime, now);
      setTimeRemaining(secondsUntilStart);
    } else if (isAfter(now, challengeTime) && isBefore(now, windowEnd)) {
      // 0 to 15 min - active window
      setChallengeState("active");
      const secondsRemaining = differenceInSeconds(windowEnd, now);
      setTimeRemaining(secondsRemaining);
    } else {
      // After 15 min window - missed
      setChallengeState("missed");
      setTimeRemaining(0);
    }
  }, [challenge, hasCompleted]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  // Don't render anything if hidden or no challenge
  if (!challenge || challengeState === "hidden") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 bg-card border-2 border-purple-500/50 rounded-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 bg-purple-500/20 flex items-center justify-center rounded-full"
          >
            <Shirt className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-500 text-sm">
              Fit Check!
            </h3>
          </div>
        </div>

        {/* Streak badge */}
        {fitCheckStreak > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full"
          >
            <Trophy className="w-4 h-4 text-purple-500" />
            <span className="text-purple-500 font-medium text-xs">
              {fitCheckStreak}
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
            className="p-4 bg-green-500/10 border border-green-500/30 text-center rounded-xl"
          >
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-green-500 text-sm">
              {completedOnTime ? "Nailed it!" : "Completed!"}
            </p>
            {completedOnTime && (
              <p className="text-green-500/70 text-xs">
                Purple shirt badge earned!
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
            {/* Active countdown - urgent! */}
            <div
              className="p-4 bg-purple-500 mb-3 rounded-xl"
            >
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="font-bold text-sm">
                    GO GO GO!
                  </p>
                  <p className="opacity-80 text-xs">
                    Post your fit now!
                  </p>
                </div>
                <div className="text-right">
                  <motion.p
                    key={timeRemaining}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="font-bold text-3xl"
                  >
                    {formatTime(timeRemaining || 0)}
                  </motion.p>
                </div>
              </div>
            </div>

            {/* Take Photo Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onOpenCamera}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </motion.button>
          </motion.div>
        ) : challengeState === "missed" ? (
          <motion.div
            key="missed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-muted/50 text-center rounded-xl"
          >
            <X className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">
              Window closed. Tomorrow's another day!
            </p>
          </motion.div>
        ) : challengeState === "teaser" ? (
          <motion.div
            key="teaser"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-purple-500 text-sm">
                    Coming soon...
                  </p>
                  <p className="text-purple-500/70 text-xs">
                    Be ready to show your fit!
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-500 text-xl">
                  {formatTime(timeRemaining || 0)}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

export default FitCheckChallenge;
