import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WeeklyStats {
  averageMood: number;
  bestDay: {
    date: string;
    rating: number;
    photoUrl: string | null;
    caption: string | null;
  } | null;
  worstDay: {
    date: string;
    rating: number;
  } | null;
  moodStability: number; // Lower = more stable (variance)
  totalEntries: number;
  moodTrend: "up" | "down" | "stable";
}

export const useWeeklyStats = () => {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
    }
  }, [user]);

  const fetchWeeklyStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: moods, error: fetchError } = await supabase
        .from("moods")
        .select("id, rating, date, photo_url, caption")
        .eq("user_id", user.id)
        .gte("date", sevenDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      if (!moods || moods.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Calculate average mood
      const sum = moods.reduce((acc, m) => acc + m.rating, 0);
      const averageMood = sum / moods.length;

      // Find best day (highest rating)
      const bestMood = moods.reduce((best, current) =>
        current.rating > best.rating ? current : best
      );

      // Get signed URL for best day photo if exists
      let bestDayPhotoUrl: string | null = null;
      if (bestMood.photo_url) {
        const { data: signedData } = await supabase.storage
          .from("mood-photos")
          .createSignedUrl(bestMood.photo_url, 3600);
        bestDayPhotoUrl = signedData?.signedUrl || null;
      }

      // Find worst day
      const worstMood = moods.reduce((worst, current) =>
        current.rating < worst.rating ? current : worst
      );

      // Calculate variance (mood stability)
      const squaredDiffs = moods.map((m) => Math.pow(m.rating - averageMood, 2));
      const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / moods.length;

      // Calculate trend (compare first half to second half)
      const midpoint = Math.floor(moods.length / 2);
      const firstHalf = moods.slice(0, midpoint);
      const secondHalf = moods.slice(midpoint);

      const firstAvg = firstHalf.length > 0
        ? firstHalf.reduce((acc, m) => acc + m.rating, 0) / firstHalf.length
        : 0;
      const secondAvg = secondHalf.length > 0
        ? secondHalf.reduce((acc, m) => acc + m.rating, 0) / secondHalf.length
        : 0;

      let moodTrend: "up" | "down" | "stable" = "stable";
      if (secondAvg - firstAvg > 0.5) moodTrend = "up";
      else if (firstAvg - secondAvg > 0.5) moodTrend = "down";

      setStats({
        averageMood: Math.round(averageMood * 10) / 10,
        bestDay: {
          date: bestMood.date,
          rating: bestMood.rating,
          photoUrl: bestDayPhotoUrl,
          caption: bestMood.caption,
        },
        worstDay: {
          date: worstMood.date,
          rating: worstMood.rating,
        },
        moodStability: Math.round(variance * 10) / 10,
        totalEntries: moods.length,
        moodTrend,
      });
    } catch (err) {
      console.error("Error fetching weekly stats:", err);
      setError("Failed to load weekly stats");
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchWeeklyStats };
};
