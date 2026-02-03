import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  quest?: {
    description: string;
    progress?: number;
    target?: number;
  };
}

export interface EarnedBadge {
  badge_id: string;
  earned_at: string;
  is_equipped: boolean;
}

// Badge definitions
export const BADGES: Badge[] = [
  {
    id: "og",
    name: "OG",
    description: "One of the original members who believed in the vision from day one.",
    icon: "✓",
    color: "#3B82F6", // Blue check
    rarity: "legendary",
  },
  {
    id: "community-champion",
    name: "Community Champion",
    description: "Invited 5 friends who joined the community.",
    icon: "🦸",
    color: "#8B5CF6", // Purple
    rarity: "epic",
    quest: {
      description: "Invite 5 friends to join",
      target: 5,
    },
  },
  {
    id: "streak-master",
    name: "Streak Master",
    description: "Maintained a 30-day mood logging streak.",
    icon: "🔥",
    color: "#F97316", // Orange
    rarity: "epic",
    quest: {
      description: "Reach a 30-day streak",
      target: 30,
    },
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Logged 100 moods. A true mood tracking veteran.",
    icon: "💯",
    color: "#EAB308", // Gold
    rarity: "rare",
    quest: {
      description: "Log 100 moods",
      target: 100,
    },
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Posted 10 moods between midnight and 5am.",
    icon: "🦉",
    color: "#6366F1", // Indigo
    rarity: "rare",
    quest: {
      description: "Post 10 late-night moods (12am-5am)",
      target: 10,
    },
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Posted 10 moods between 5am and 8am.",
    icon: "🐦",
    color: "#F472B6", // Pink
    rarity: "rare",
    quest: {
      description: "Post 10 early morning moods (5am-8am)",
      target: 10,
    },
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Connected with 20+ friends in the community.",
    icon: "🦋",
    color: "#14B8A6", // Teal
    rarity: "rare",
    quest: {
      description: "Have 20 friends",
      target: 20,
    },
  },
  {
    id: "supportive-soul",
    name: "Supportive Soul",
    description: "Left 50 comments supporting friends.",
    icon: "💝",
    color: "#EC4899", // Pink
    rarity: "epic",
    quest: {
      description: "Leave 50 comments on friends' posts",
      target: 50,
    },
  },
  {
    id: "first-steps",
    name: "First Steps",
    description: "Logged your very first mood.",
    icon: "👣",
    color: "#22C55E", // Green
    rarity: "common",
    quest: {
      description: "Log your first mood",
      target: 1,
    },
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Maintained a 7-day streak.",
    icon: "⚔️",
    color: "#64748B", // Slate
    rarity: "common",
    quest: {
      description: "Reach a 7-day streak",
      target: 7,
    },
  },
];

// OG cutoff date - users who joined before this are OGs
const OG_CUTOFF_DATE = new Date("2026-02-01T00:00:00Z");

export interface BadgeProgress {
  [badgeId: string]: {
    current: number;
    target: number;
    completed: boolean;
  };
}

export const useBadges = () => {
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [progress, setProgress] = useState<BadgeProgress>({});
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Fetch earned badges
  const fetchEarnedBadges = useCallback(async () => {
    if (!user) return;

    // @ts-ignore
    const { data } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at, is_equipped")
      .eq("user_id", user.id);

    if (data) {
      setEarnedBadges(data);
    }
  }, [user]);

  // Calculate progress for all badges
  const calculateProgress = useCallback(async () => {
    if (!user) return;

    const newProgress: BadgeProgress = {};

    // Get user profile for created_at and streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, current_streak")
      .eq("user_id", user.id)
      .single();

    // Check OG status
    if (profile) {
      const createdAt = new Date(profile.created_at);
      newProgress["og"] = {
        current: createdAt < OG_CUTOFF_DATE ? 1 : 0,
        target: 1,
        completed: createdAt < OG_CUTOFF_DATE,
      };

      // Streak progress
      const streak = profile.current_streak || 0;
      newProgress["week-warrior"] = {
        current: Math.min(streak, 7),
        target: 7,
        completed: streak >= 7,
      };
      newProgress["streak-master"] = {
        current: Math.min(streak, 30),
        target: 30,
        completed: streak >= 30,
      };
    }

    // Get total moods count
    const { count: totalMoods } = await supabase
      .from("moods")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    newProgress["first-steps"] = {
      current: Math.min(totalMoods || 0, 1),
      target: 1,
      completed: (totalMoods || 0) >= 1,
    };

    newProgress["centurion"] = {
      current: Math.min(totalMoods || 0, 100),
      target: 100,
      completed: (totalMoods || 0) >= 100,
    };

    // Get night owl moods (midnight to 5am)
    const { data: nightMoods } = await supabase
      .from("moods")
      .select("created_at")
      .eq("user_id", user.id);

    let nightOwlCount = 0;
    let earlyBirdCount = 0;

    if (nightMoods) {
      nightMoods.forEach((mood) => {
        const hour = new Date(mood.created_at).getHours();
        if (hour >= 0 && hour < 5) nightOwlCount++;
        if (hour >= 5 && hour < 8) earlyBirdCount++;
      });
    }

    newProgress["night-owl"] = {
      current: Math.min(nightOwlCount, 10),
      target: 10,
      completed: nightOwlCount >= 10,
    };

    newProgress["early-bird"] = {
      current: Math.min(earlyBirdCount, 10),
      target: 10,
      completed: earlyBirdCount >= 10,
    };

    // Get friends count
    const { count: friendsCount } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    newProgress["social-butterfly"] = {
      current: Math.min(friendsCount || 0, 20),
      target: 20,
      completed: (friendsCount || 0) >= 20,
    };

    // Get comments count
    const { count: commentsCount } = await supabase
      .from("mood_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    newProgress["supportive-soul"] = {
      current: Math.min(commentsCount || 0, 50),
      target: 50,
      completed: (commentsCount || 0) >= 50,
    };

    // Get referrals count
    // @ts-ignore
    const { count: referralsCount } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id);

    newProgress["community-champion"] = {
      current: Math.min(referralsCount || 0, 5),
      target: 5,
      completed: (referralsCount || 0) >= 5,
    };

    setProgress(newProgress);
  }, [user]);

  // Award a badge
  const awardBadge = useCallback(
    async (badgeId: string) => {
      if (!user) return false;

      // Check if already earned
      if (earnedBadges.some((b) => b.badge_id === badgeId)) {
        return false;
      }

      // @ts-ignore
      const { error } = await supabase.from("user_badges").insert({
        user_id: user.id,
        badge_id: badgeId,
      });

      if (!error) {
        await fetchEarnedBadges();
        return true;
      }
      return false;
    },
    [user, earnedBadges, fetchEarnedBadges]
  );

  // Check and award badges based on progress
  const checkAndAwardBadges = useCallback(async () => {
    if (!user || Object.keys(progress).length === 0) return;

    for (const [badgeId, prog] of Object.entries(progress)) {
      if (prog.completed && !earnedBadges.some((b) => b.badge_id === badgeId)) {
        await awardBadge(badgeId);
      }
    }
  }, [user, progress, earnedBadges, awardBadge]);

  // Toggle badge equipped status - only ONE badge can be equipped at a time
  const toggleEquipped = useCallback(
    async (badgeId: string) => {
      if (!user) return;

      const badge = earnedBadges.find((b) => b.badge_id === badgeId);
      if (!badge) return;

      const isCurrentlyEquipped = badge.is_equipped;

      // First, unequip ALL badges
      // @ts-ignore
      await supabase
        .from("user_badges")
        .update({ is_equipped: false })
        .eq("user_id", user.id);

      // If the badge wasn't equipped before, equip it (single selection)
      if (!isCurrentlyEquipped) {
        // @ts-ignore
        await supabase
          .from("user_badges")
          .update({ is_equipped: true })
          .eq("user_id", user.id)
          .eq("badge_id", badgeId);
      }

      await fetchEarnedBadges();
    },
    [user, earnedBadges, fetchEarnedBadges]
  );

  // Generate referral code (using user id)
  useEffect(() => {
    if (user) {
      // Simple referral code based on user id
      setReferralCode(user.id.substring(0, 8).toUpperCase());
    }
  }, [user]);

  // Apply referral code
  const applyReferralCode = useCallback(
    async (code: string) => {
      if (!user) return { success: false, message: "Not logged in" };

      // Find user with this code
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("user_id", `${code.toLowerCase()}%`);

      if (!profiles || profiles.length === 0) {
        return { success: false, message: "Invalid referral code" };
      }

      const referrerId = profiles[0].user_id;

      if (referrerId === user.id) {
        return { success: false, message: "You can't refer yourself!" };
      }

      // Check if already referred
      // @ts-ignore
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_id", user.id)
        .maybeSingle();

      if (existing) {
        return { success: false, message: "You've already used a referral code" };
      }

      // Create referral
      // @ts-ignore
      const { error } = await supabase.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: user.id,
      });

      if (error) {
        return { success: false, message: "Failed to apply code" };
      }

      return { success: true, message: "Referral applied! Your friend will get credit." };
    },
    [user]
  );

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchEarnedBadges();
      await calculateProgress();
      setLoading(false);
    };

    if (user) {
      init();
    }
  }, [user, fetchEarnedBadges, calculateProgress]);

  // Check for new badges when progress updates
  useEffect(() => {
    if (!loading && Object.keys(progress).length > 0) {
      checkAndAwardBadges();
    }
  }, [loading, progress, checkAndAwardBadges]);

  // Get equipped badges for a user
  const getEquippedBadges = useCallback(
    (userId?: string) => {
      if (userId && userId !== user?.id) {
        // For other users, we'd need to fetch their badges
        return [];
      }
      return earnedBadges.filter((b) => b.is_equipped);
    },
    [earnedBadges, user]
  );

  // Get badge by ID
  const getBadge = (badgeId: string): Badge | undefined => {
    return BADGES.find((b) => b.id === badgeId);
  };

  return {
    badges: BADGES,
    earnedBadges,
    progress,
    loading,
    referralCode,
    toggleEquipped,
    applyReferralCode,
    getEquippedBadges,
    getBadge,
    refreshBadges: async () => {
      await fetchEarnedBadges();
      await calculateProgress();
    },
  };
};
