import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/hooks/useTimeWindow";

export interface NemesisProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface NemesisMood {
  id: string;
  rating: number;
  photo_url: string | null;
  caption: string | null;
  date: string;
}

export interface DayResult {
  date: string;
  userRating: number;
  nemesisRating: number;
  differential: number;
  result: "W" | "L" | "D";
}

export interface RivalryStats {
  wins: number;
  losses: number;
  draws: number;
  avgDifferential: number;
  currentStreakType: "W" | "L" | "D" | null;
  currentStreakCount: number;
  recentDays: DayResult[];
}

export const useNemesis = () => {
  const [nemesisId, setNemesisId] = useState<string | null>(null);
  const [nemesisProfile, setNemesisProfile] = useState<NemesisProfile | null>(null);
  const [nemesisTodayMood, setNemesisTodayMood] = useState<NemesisMood | null>(null);
  const [rivalryStats, setRivalryStats] = useState<RivalryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNemesis = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data } = await (supabase as any)
        .from("nemeses")
        .select("nemesis_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const nId = data?.nemesis_id || null;
      setNemesisId(nId);

      if (!nId) {
        setNemesisProfile(null);
        setNemesisTodayMood(null);
        setRivalryStats(null);
        setLoading(false);
        return;
      }

      // Fetch profile, today's mood, and rivalry stats in parallel
      const today = getLocalDateString();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;

      const [profileRes, nemesisMoodRes, userMoodsRes, nemesisMoodsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .eq("user_id", nId)
          .single(),
        supabase
          .from("moods")
          .select("id, rating, photo_url, caption, date")
          .eq("user_id", nId)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("moods")
          .select("date, rating")
          .eq("user_id", user.id)
          .gte("date", cutoffDate)
          .order("date", { ascending: true }),
        supabase
          .from("moods")
          .select("date, rating")
          .eq("user_id", nId)
          .gte("date", cutoffDate)
          .order("date", { ascending: true }),
      ]);

      // Set profile
      setNemesisProfile(profileRes.data || null);

      // Set today's mood with signed URL
      if (nemesisMoodRes.data) {
        let signedPhotoUrl: string | null = null;
        if (nemesisMoodRes.data.photo_url) {
          const { data: signedData } = await supabase.storage
            .from("mood-photos")
            .createSignedUrl(nemesisMoodRes.data.photo_url, 3600);
          signedPhotoUrl = signedData?.signedUrl || null;
        }
        setNemesisTodayMood({
          ...nemesisMoodRes.data,
          photo_url: signedPhotoUrl,
        });
      } else {
        setNemesisTodayMood(null);
      }

      // Calculate rivalry stats
      const userMoods = userMoodsRes.data || [];
      const nemesisMoods = nemesisMoodsRes.data || [];

      const nemesisByDate = new Map<string, number>();
      nemesisMoods.forEach((m: any) => nemesisByDate.set(m.date, m.rating));

      const dayResults: DayResult[] = [];
      userMoods.forEach((m: any) => {
        const nemRating = nemesisByDate.get(m.date);
        if (nemRating !== undefined) {
          const diff = m.rating - nemRating;
          dayResults.push({
            date: m.date,
            userRating: m.rating,
            nemesisRating: nemRating,
            differential: diff,
            result: diff > 0 ? "W" : diff < 0 ? "L" : "D",
          });
        }
      });

      let wins = 0, losses = 0, draws = 0, totalDiff = 0;
      dayResults.forEach((d) => {
        if (d.result === "W") wins++;
        else if (d.result === "L") losses++;
        else draws++;
        totalDiff += d.differential;
      });

      // Current streak (from most recent day backwards)
      let streakType: "W" | "L" | "D" | null = null;
      let streakCount = 0;
      for (let i = dayResults.length - 1; i >= 0; i--) {
        if (streakType === null) {
          streakType = dayResults[i].result;
          streakCount = 1;
        } else if (dayResults[i].result === streakType) {
          streakCount++;
        } else {
          break;
        }
      }

      setRivalryStats({
        wins,
        losses,
        draws,
        avgDifferential: dayResults.length > 0 ? Math.round((totalDiff / dayResults.length) * 10) / 10 : 0,
        currentStreakType: streakType,
        currentStreakCount: streakCount,
        recentDays: dayResults.slice(-7),
      });
    } catch (e) {
      console.warn("Failed to fetch nemesis data:", e);
      setNemesisId(null);
      setNemesisProfile(null);
      setNemesisTodayMood(null);
      setRivalryStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchNemesis();
  }, [user, fetchNemesis]);

  const setNemesis = async (friendId: string) => {
    if (!user) return;
    try {
      await (supabase as any).from("nemeses").upsert(
        { user_id: user.id, nemesis_id: friendId },
        { onConflict: "user_id" }
      );
      await fetchNemesis();
    } catch (e) {
      console.warn("Failed to set nemesis:", e);
    }
  };

  const removeNemesis = async () => {
    if (!user) return;
    try {
      await (supabase as any).from("nemeses").delete().eq("user_id", user.id);
      setNemesisId(null);
      setNemesisProfile(null);
      setNemesisTodayMood(null);
      setRivalryStats(null);
    } catch (e) {
      console.warn("Failed to remove nemesis:", e);
    }
  };

  return {
    nemesisId,
    nemesisProfile,
    nemesisTodayMood,
    rivalryStats,
    loading,
    setNemesis,
    removeNemesis,
    refetch: fetchNemesis,
  };
};
