import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, ChevronLeft, ChevronRight, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subMonths, subWeeks, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface PastMood {
  id: string;
  mood_rating: number;
  journal_entry: string | null;
  photo_url: string | null;
  created_at: string;
  tags?: { name: string; icon: string }[];
}

interface OnThisDayProps {
}

const moodLabels: { [key: number]: string } = {
  1: "Terrible",
  2: "Bad",
  3: "Poor",
  4: "Down",
  5: "Okay",
  6: "Fine",
  7: "Good",
  8: "Great",
  9: "Excellent",
  10: "Amazing"
};

const OnThisDay = ({}: OnThisDayProps) => {
  const [activeView, setActiveView] = useState<"month" | "week">("month");
  const [oneMonthAgo, setOneMonthAgo] = useState<PastMood | null>(null);
  const [lastWeekMoods, setLastWeekMoods] = useState<PastMood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTimeTravel();
    }
  }, [user]);

  const fetchTimeTravel = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Check if user has at least 30 days of data
      const thirtyDaysAgo = subMonths(new Date(), 1);
      const { count } = await supabase
        .from("moods")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("created_at", thirtyDaysAgo.toISOString());

      setHasEnoughData((count || 0) > 0);

      // Fetch mood from exactly one month ago (±1 day tolerance)
      const oneMonthAgoDate = subMonths(new Date(), 1);
      const startOfDay = new Date(oneMonthAgoDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(oneMonthAgoDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: monthAgoData } = await supabase
        .from("moods")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (monthAgoData) {
        // Fetch tags for this mood
        const tags = await fetchMoodTags(monthAgoData.id);
        setOneMonthAgo({ ...monthAgoData, tags });
      }

      // Fetch last week's moods
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));
      const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1));

      const { data: weekData } = await supabase
        .from("moods")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString())
        .order("created_at", { ascending: true });

      if (weekData) {
        // Fetch tags for each mood
        const moodsWithTags = await Promise.all(
          weekData.map(async (mood) => {
            const tags = await fetchMoodTags(mood.id);
            return { ...mood, tags };
          })
        );
        setLastWeekMoods(moodsWithTags);
      }
    } catch (error) {
      console.error("Error fetching time travel data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoodTags = async (moodId: string): Promise<{ name: string; icon: string }[]> => {
    const { data: moodTags } = await supabase
      .from("mood_routine_tags")
      .select("tag_id, tag_type")
      .eq("mood_id", moodId);

    if (!moodTags || moodTags.length === 0) return [];

    const tags: { name: string; icon: string }[] = [];

    // Fetch default tags
    const defaultTagIds = moodTags.filter(t => t.tag_type === "default").map(t => t.tag_id);
    if (defaultTagIds.length > 0) {
      const { data: defaultTags } = await supabase
        .from("default_routine_tags")
        .select("name, icon")
        .in("id", defaultTagIds);
      if (defaultTags) tags.push(...defaultTags);
    }

    // Fetch custom tags
    const customTagIds = moodTags.filter(t => t.tag_type === "custom").map(t => t.tag_id);
    if (customTagIds.length > 0) {
      const { data: customTags } = await supabase
        .from("user_routine_tags")
        .select("name, icon")
        .in("id", customTagIds);
      if (customTags) tags.push(...customTags);
    }

    return tags;
  };

  const getAverageRating = (moods: PastMood[]) => {
    if (moods.length === 0) return 0;
    return Math.round(moods.reduce((sum, m) => sum + m.mood_rating, 0) / moods.length);
  };

  const getMoodColor = (rating: number) => {
    if (rating <= 2) return "bg-red-500";
    if (rating <= 4) return "bg-orange-500";
    if (rating <= 6) return "bg-yellow-500";
    if (rating <= 8) return "bg-green-500";
    return "bg-blue-500";
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-card border border-border rounded-2xl">
        <div className="animate-pulse">
          <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasEnoughData) {
    return (
      <div className="p-4 bg-card border border-border text-center rounded-2xl">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold mb-1 text-sm">Time Travel</h3>
        <p className="text-muted-foreground text-xs">
          Keep logging your moods! Once you have a month of data, you'll see your journey here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border border-border rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Time Travel</h3>
        </div>

        {/* View Toggle */}
        <div className="flex bg-secondary p-0.5">
          <button
            onClick={() => setActiveView("month")}
            className={`px-3 py-1 transition-colors ${
              activeView === "month" ? "bg-primary text-primary-foreground" : ""
            } text-xs`}
          >
            1 Month
          </button>
          <button
            onClick={() => setActiveView("week")}
            className={`px-3 py-1 transition-colors ${
              activeView === "week" ? "bg-primary text-primary-foreground" : ""
            } text-xs`}
          >
            Last Week
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === "month" ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {oneMonthAgo ? (
              <div>
                <p className="text-muted-foreground mb-3 text-xs">
                  On this day, {format(new Date(oneMonthAgo.created_at), "MMMM d, yyyy")}
                </p>

                <div className="p-4 bg-secondary rounded-xl">
                  {/* Mood rating */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 ${getMoodColor(oneMonthAgo.mood_rating)} flex items-center justify-center text-white font-bold rounded-full`}
                    >
                      {oneMonthAgo.mood_rating}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {moodLabels[oneMonthAgo.mood_rating]}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(oneMonthAgo.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Journal entry */}
                  {oneMonthAgo.journal_entry && (
                    <p className="text-muted-foreground italic mb-3 text-xs">
                      "{oneMonthAgo.journal_entry}"
                    </p>
                  )}

                  {/* Tags */}
                  {oneMonthAgo.tags && oneMonthAgo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {oneMonthAgo.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-primary/10 text-primary text-[10px]"
                        >
                          {tag.icon} {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reflection prompt */}
                <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-primary text-xs">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    How far have you come since then?
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  No entry from this day last month
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="week"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {lastWeekMoods.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Your week of {format(subWeeks(new Date(), 1), "MMM d")} - {format(endOfWeek(subWeeks(new Date(), 1)), "MMM d")}
                </p>

                {/* Week summary */}
                <div className="p-4 bg-secondary mb-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs">Average Mood</p>
                      <p className="font-bold text-2xl">
                        {getAverageRating(lastWeekMoods)}/10
                      </p>
                      <p className="text-xs">
                        {moodLabels[getAverageRating(lastWeekMoods)]}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {lastWeekMoods.map((mood, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 ${getMoodColor(mood.mood_rating)} flex items-center justify-center text-white text-[8px] font-bold rounded`}
                          title={format(new Date(mood.created_at), "EEEE")}
                        >
                          {mood.mood_rating}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top activities */}
                {(() => {
                  const allTags = lastWeekMoods.flatMap(m => m.tags || []);
                  const tagCounts = allTags.reduce((acc, tag) => {
                    acc[tag.name] = (acc[tag.name] || { ...tag, count: 0 });
                    acc[tag.name].count++;
                    return acc;
                  }, {} as { [key: string]: { name: string; icon: string; count: number } });
                  const topTags = Object.values(tagCounts).sort((a, b) => b.count - a.count).slice(0, 3);

                  if (topTags.length > 0) {
                    return (
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-muted-foreground mb-2 text-[10px]">
                          Most logged activities
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {topTags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs"
                            >
                              {tag.icon} {tag.name} ({tag.count}x)
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  No entries from last week
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnThisDay;
