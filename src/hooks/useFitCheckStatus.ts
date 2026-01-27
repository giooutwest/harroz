import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInSeconds, addMinutes, subMinutes, isAfter, isBefore } from "date-fns";

type FitCheckState = "hidden" | "teaser" | "active" | "missed" | "completed";

interface FitCheckStatus {
  state: FitCheckState;
  isActive: boolean;
  timeRemaining: number | null;
}

export const useFitCheckStatus = (): FitCheckStatus => {
  const [state, setState] = useState<FitCheckState>("hidden");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { user } = useAuth();

  const checkStatus = useCallback(async () => {
    if (!user) {
      setState("hidden");
      return;
    }

    try {
      // Get today's challenge
      const { data: challenges } = await supabase.rpc("get_todays_challenge");

      if (!challenges || challenges.length === 0) {
        setState("hidden");
        return;
      }

      const challenge = challenges[0];

      // Check if already completed
      const { data: completion } = await supabase
        .from("fit_check_completions")
        .select("on_time")
        .eq("user_id", user.id)
        .eq("challenge_id", challenge.id)
        .maybeSingle();

      if (completion) {
        setState("completed");
        return;
      }

      // Calculate state based on time
      const now = new Date();
      const challengeTime = new Date(challenge.challenge_timestamp);
      const teaserStart = subMinutes(challengeTime, 30);
      const windowEnd = addMinutes(challengeTime, 15);

      if (isBefore(now, teaserStart)) {
        setState("hidden");
        setTimeRemaining(null);
      } else if (isBefore(now, challengeTime)) {
        setState("teaser");
        setTimeRemaining(differenceInSeconds(challengeTime, now));
      } else if (isAfter(now, challengeTime) && isBefore(now, windowEnd)) {
        setState("active");
        setTimeRemaining(differenceInSeconds(windowEnd, now));
      } else {
        setState("missed");
        setTimeRemaining(0);
      }
    } catch (error) {
      console.error("Error checking fit check status:", error);
      setState("hidden");
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    state,
    isActive: state === "active",
    timeRemaining
  };
};
