import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  loading: boolean;
}

export const useStreak = (): StreakData => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      calculateStreak();
    }
  }, [user]);

  const calculateStreak = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from("moods")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (!data || data.length === 0) {
      setCurrentStreak(0);
      setBestStreak(0);
      setLoading(false);
      return;
    }

    // Calculate current streak (from today backwards)
    let current = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDesc = [...data].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let i = 0; i < sortedDesc.length; i++) {
      const entryDate = new Date(sortedDesc[i].date + "T12:00:00");
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      const entryDateStr = entryDate.toISOString().split("T")[0];
      const expectedDateStr = expectedDate.toISOString().split("T")[0];

      if (entryDateStr === expectedDateStr) {
        current++;
      } else if (i === 0) {
        // If no entry today, check if yesterday has an entry (streak still valid)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (entryDateStr === yesterdayStr) {
          current = 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Calculate best streak (iterate through all entries)
    let best = 0;
    let tempStreak = 1;

    const sortedAsc = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 1; i < sortedAsc.length; i++) {
      const prevDate = new Date(sortedAsc[i - 1].date + "T12:00:00");
      const currDate = new Date(sortedAsc[i].date + "T12:00:00");
      const diffDays =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        best = Math.max(best, tempStreak);
        tempStreak = 1;
      }
    }
    best = Math.max(best, tempStreak);

    setCurrentStreak(current);
    setBestStreak(best);
    setLoading(false);
  };

  return { currentStreak, bestStreak, loading };
};
