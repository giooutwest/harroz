import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TagWithMood {
  id: string;
  name: string;
  icon: string;
  count: number;
  avgMood: number;
  moodTrend: "up" | "down" | "neutral";
  type: "default" | "custom";
}

interface DayActivity {
  date: Date;
  dayName: string;
  mood: number | null;
  tags: { name: string; icon: string }[];
}

interface TagActivityChartProps {
  isPixelTheme?: boolean;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const TagActivityChart = ({ isPixelTheme = false }: TagActivityChartProps) => {
  const [tagStats, setTagStats] = useState<TagWithMood[]>([]);
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);
  const [activeView, setActiveView] = useState<"correlation" | "weekly">("correlation");
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { user } = useAuth();

  const borderRadius = isPixelTheme ? "0" : undefined;

  useEffect(() => {
    if (user) {
      fetchTagActivityData();
    }
  }, [user]);

  const fetchTagActivityData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get moods from the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data: moods } = await supabase
        .from("moods")
        .select("id, rating, created_at, date")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (!moods || moods.length === 0) {
        setHasData(false);
        setIsLoading(false);
        return;
      }

      // Get all mood tags for these moods
      const moodIds = moods.map(m => m.id);
      const { data: moodTags } = await supabase
        .from("mood_routine_tags")
        .select("mood_id, tag_id, tag_type")
        .in("mood_id", moodIds);

      // Fetch default and custom tags
      const { data: defaultTags } = await supabase
        .from("default_routine_tags")
        .select("id, name, icon");

      const { data: customTags } = await supabase
        .from("user_routine_tags")
        .select("id, name, icon")
        .eq("user_id", user.id);

      // Build tag lookup
      const tagLookup: { [key: string]: { name: string; icon: string; type: "default" | "custom" } } = {};
      defaultTags?.forEach(t => {
        tagLookup[`default-${t.id}`] = { name: t.name, icon: t.icon, type: "default" };
      });
      customTags?.forEach(t => {
        tagLookup[`custom-${t.id}`] = { name: t.name, icon: t.icon, type: "custom" };
      });

      // Calculate tag statistics
      const tagMoodMap: { [key: string]: { moods: number[]; tag: { name: string; icon: string; type: "default" | "custom" } } } = {};

      moodTags?.forEach(mt => {
        const key = `${mt.tag_type}-${mt.tag_id}`;
        const tagInfo = tagLookup[key];
        if (!tagInfo) return;

        const mood = moods.find(m => m.id === mt.mood_id);
        if (!mood) return;

        if (!tagMoodMap[key]) {
          tagMoodMap[key] = { moods: [], tag: tagInfo };
        }
        tagMoodMap[key].moods.push(mood.rating);
      });

      // Calculate stats for each tag
      const stats: TagWithMood[] = Object.entries(tagMoodMap).map(([key, data]) => {
        const avgMood = data.moods.reduce((a, b) => a + b, 0) / data.moods.length;
        const overallAvg = moods.reduce((a, b) => a + b.rating, 0) / moods.length;

        let moodTrend: "up" | "down" | "neutral" = "neutral";
        if (avgMood > overallAvg + 0.5) moodTrend = "up";
        else if (avgMood < overallAvg - 0.5) moodTrend = "down";

        return {
          id: key,
          name: data.tag.name,
          icon: data.tag.icon,
          count: data.moods.length,
          avgMood: Math.round(avgMood * 10) / 10,
          moodTrend,
          type: data.tag.type
        };
      }).sort((a, b) => b.count - a.count);

      setTagStats(stats);

      // Build weekly activity view
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const weekData: DayActivity[] = daysOfWeek.map(day => {
        const dayMood = moods.find(m => {
          const moodDate = new Date(m.date || m.created_at);
          return isSameDay(moodDate, day);
        });

        const dayTags: { name: string; icon: string }[] = [];
        if (dayMood) {
          const moodTagsForDay = moodTags?.filter(mt => mt.mood_id === dayMood.id) || [];
          moodTagsForDay.forEach(mt => {
            const key = `${mt.tag_type}-${mt.tag_id}`;
            const tagInfo = tagLookup[key];
            if (tagInfo) {
              dayTags.push({ name: tagInfo.name, icon: tagInfo.icon });
            }
          });
        }

        return {
          date: day,
          dayName: format(day, "EEE"),
          mood: dayMood?.rating || null,
          tags: dayTags
        };
      });

      setWeekActivity(weekData);
      setHasData(stats.length > 0);
    } catch (error) {
      console.error("Error fetching tag activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`p-4 bg-card border border-border ${isPixelTheme ? "" : "rounded-2xl"}`} style={{ borderRadius }}>
        <div className="animate-pulse">
          <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={`p-4 bg-card border border-border text-center ${isPixelTheme ? "" : "rounded-2xl"}`} style={{ borderRadius }}>
        <Activity className={`${isPixelTheme ? "w-8 h-8" : "w-12 h-12"} mx-auto mb-3 text-muted-foreground`} />
        <h3 className={`font-semibold mb-1 ${isPixelTheme ? "text-xs" : "text-sm"}`}>Activity Insights</h3>
        <p className={`text-muted-foreground ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
          Start tagging your activities to see how they affect your mood!
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = tagStats.slice(0, 6).map(tag => ({
    name: tag.icon,
    fullName: tag.name,
    count: tag.count,
    avgMood: tag.avgMood,
    color: getMoodColor(tag.avgMood)
  }));

  return (
    <div className={`p-4 bg-card border border-border ${isPixelTheme ? "" : "rounded-2xl"}`} style={{ borderRadius }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-primary`} />
          <h3 className={`font-semibold ${isPixelTheme ? "text-xs" : "text-sm"}`}>Activity Insights</h3>
        </div>

        {/* View Toggle */}
        <div className="flex bg-secondary p-0.5" style={{ borderRadius }}>
          <button
            onClick={() => setActiveView("correlation")}
            className={`px-2 py-1 transition-colors ${
              activeView === "correlation" ? "bg-primary text-primary-foreground" : ""
            } ${isPixelTheme ? "text-[8px]" : "text-xs"}`}
            style={{ borderRadius }}
          >
            Mood Impact
          </button>
          <button
            onClick={() => setActiveView("weekly")}
            className={`px-2 py-1 transition-colors ${
              activeView === "weekly" ? "bg-primary text-primary-foreground" : ""
            } ${isPixelTheme ? "text-[8px]" : "text-xs"}`}
            style={{ borderRadius }}
          >
            This Week
          </button>
        </div>
      </div>

      {activeView === "correlation" ? (
        <div>
          {/* Bar chart showing tag usage and avg mood */}
          <div className="h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide domain={[0, 'dataMax + 2']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={`bg-card border border-border p-2 shadow-lg ${isPixelTheme ? "" : "rounded-lg"}`}>
                          <p className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                            {data.name} {data.fullName}
                          </p>
                          <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>
                            {data.count} times • Avg mood: {data.avgMood}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={isPixelTheme ? 0 : [4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tag correlation list */}
          <div className="space-y-2">
            <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>
              How activities affect your mood:
            </p>
            {tagStats.slice(0, 5).map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-2 bg-secondary/50 ${
                  isPixelTheme ? "" : "rounded-lg"
                }`}
                style={{ borderRadius }}
              >
                <div className="flex items-center gap-2">
                  <span className={isPixelTheme ? "text-sm" : "text-base"}>{tag.icon}</span>
                  <span className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                    {tag.name}
                  </span>
                  <span className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>
                    ({tag.count}x)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${isPixelTheme ? "text-[8px]" : "text-xs"}`}
                    style={{ color: getMoodColor(tag.avgMood) }}
                  >
                    {tag.avgMood}
                  </span>
                  {tag.moodTrend === "up" && (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  )}
                  {tag.moodTrend === "down" && (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  {tag.moodTrend === "neutral" && (
                    <Minus className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Insight */}
          {tagStats.length > 0 && tagStats[0].moodTrend === "up" && (
            <div
              className={`mt-3 p-2 bg-green-500/10 border border-green-500/20 ${
                isPixelTheme ? "" : "rounded-lg"
              }`}
              style={{ borderRadius }}
            >
              <p className={`text-green-600 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                💡 You tend to feel better on days you {tagStats[0].name.toLowerCase()}!
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Weekly grid view */}
          <div className="grid grid-cols-7 gap-1">
            {weekActivity.map((day, index) => (
              <motion.div
                key={day.dayName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col items-center"
              >
                <span className={`text-muted-foreground mb-1 ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>
                  {day.dayName}
                </span>
                <div
                  className={`w-full aspect-square flex flex-col items-center justify-center p-1 ${
                    day.mood ? "" : "bg-secondary/30"
                  } ${isPixelTheme ? "" : "rounded-lg"}`}
                  style={{
                    borderRadius,
                    backgroundColor: day.mood ? getMoodColor(day.mood) + "20" : undefined,
                    borderWidth: 2,
                    borderColor: day.mood ? getMoodColor(day.mood) : "transparent"
                  }}
                >
                  {day.mood ? (
                    <>
                      <span className={`font-bold ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                        {day.mood}
                      </span>
                      <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                        {day.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[8px]">{tag.icon}</span>
                        ))}
                        {day.tags.length > 3 && (
                          <span className="text-[6px] text-muted-foreground">+{day.tags.length - 3}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-[8px]"}`}>
                      -
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {weekActivity
              .flatMap(d => d.tags)
              .filter((tag, i, arr) => arr.findIndex(t => t.name === tag.name) === i)
              .slice(0, 5)
              .map((tag, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 bg-secondary ${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}
                  style={{ borderRadius }}
                >
                  {tag.icon} {tag.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagActivityChart;
