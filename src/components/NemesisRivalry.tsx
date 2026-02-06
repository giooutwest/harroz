import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import type { NemesisProfile, NemesisMood, RivalryStats } from "@/hooks/useNemesis";

interface NemesisRivalryProps {
  nemesisProfile: NemesisProfile;
  nemesisTodayMood: NemesisMood | null;
  userTodayRating: number;
  rivalryStats: RivalryStats | null;
}

const WINNING_QUOTES = [
  "They're in your rearview.",
  "Levels to this.",
  "Simply better.",
  "Not even close.",
  "Clear skies for you, storm clouds for them.",
];

const LOSING_QUOTES = [
  "They woke up and chose violence.",
  "Humbling.",
  "A dark day for you.",
  "Scoreboard says it all.",
  "Down bad. Recover tomorrow.",
];

const DRAW_QUOTES = [
  "Two titans locked in battle.",
  "Respect the stalemate.",
  "Mirror match.",
  "Dead even. For now.",
];

const getRandomQuote = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "#ef4444";
  if (rating <= 4) return "#f97316";
  if (rating <= 6) return "#eab308";
  if (rating <= 8) return "#84cc16";
  return "#22c55e";
};

const NemesisRivalry = ({ nemesisProfile, nemesisTodayMood, userTodayRating, rivalryStats }: NemesisRivalryProps) => {
  const differential = nemesisTodayMood ? userTodayRating - nemesisTodayMood.rating : null;
  const nemesisName = nemesisProfile.display_name || nemesisProfile.username || "???";

  const getStatusLabel = () => {
    if (differential === null) return null;
    if (differential > 0) return ["WINNING", "THRIVING", "DOMINATING"][Math.floor(Math.random() * 3)];
    if (differential < 0) return ["LOSING", "IN THE MUD", "DOWN BAD"][Math.floor(Math.random() * 3)];
    return "DRAW";
  };

  const statusLabel = differential !== null
    ? differential > 0 ? "THRIVING" : differential < 0 ? "IN THE MUD" : "DRAW"
    : null;

  const quote = differential !== null
    ? differential > 0 ? getRandomQuote(WINNING_QUOTES)
    : differential < 0 ? getRandomQuote(LOSING_QUOTES)
    : getRandomQuote(DRAW_QUOTES)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full space-y-0"
    >
      {/* A. Header Strip */}
      <div className="bg-foreground/10 border border-foreground/20 p-3 flex items-center gap-2">
        <Swords className="w-4 h-4 text-red-500" />
        <span
          className="text-[10px] text-foreground/60 uppercase tracking-[0.2em]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Nemesis // @{nemesisProfile.username || nemesisName}
        </span>
      </div>

      {/* B. Nemesis Post Card */}
      <div className="border border-foreground/10 border-t-0">
        {nemesisTodayMood ? (
          <div className="relative">
            {nemesisTodayMood.photo_url && (
              <div className="relative">
                <img
                  src={nemesisTodayMood.photo_url}
                  alt="Nemesis mood"
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                {/* Rating badge */}
                <div
                  className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center font-black text-white text-sm"
                  style={{
                    backgroundColor: getMoodColor(nemesisTodayMood.rating),
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {nemesisTodayMood.rating}
                </div>
              </div>
            )}
            {!nemesisTodayMood.photo_url && (
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {nemesisProfile.avatar_url ? (
                    <img src={nemesisProfile.avatar_url} className="w-10 h-10 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 bg-foreground/10 flex items-center justify-center">
                      <Swords className="w-5 h-5 text-foreground/30" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{nemesisName}</p>
                    {nemesisTodayMood.caption && (
                      <p className="text-xs text-foreground/50 mt-0.5">"{nemesisTodayMood.caption}"</p>
                    )}
                  </div>
                </div>
                <div
                  className="w-12 h-12 flex items-center justify-center font-black text-white text-lg"
                  style={{
                    backgroundColor: getMoodColor(nemesisTodayMood.rating),
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {nemesisTodayMood.rating}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Swords className="w-8 h-8 text-foreground/20" />
            </motion.div>
            <p
              className="text-[10px] text-foreground/30 uppercase tracking-[0.2em]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Awaiting intel...
            </p>
            <p className="text-xs text-foreground/20">
              {nemesisName} hasn't logged yet today
            </p>
          </div>
        )}
      </div>

      {/* C. Differential Card */}
      {differential !== null && nemesisTodayMood && (
        <div className="border border-foreground/10 border-t-0 p-4">
          {/* Scores side by side */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-center flex-1">
              <p
                className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                You
              </p>
              <p
                className="text-4xl font-black"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: getMoodColor(userTodayRating),
                }}
              >
                {userTodayRating}
              </p>
            </div>
            <div className="px-4">
              <span
                className="text-foreground/20 text-xs uppercase tracking-wider"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                vs
              </span>
            </div>
            <div className="text-center flex-1">
              <p
                className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {nemesisProfile.username || nemesisName}
              </p>
              <p
                className="text-4xl font-black"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: getMoodColor(nemesisTodayMood.rating),
                }}
              >
                {nemesisTodayMood.rating}
              </p>
            </div>
          </div>

          {/* Differential number */}
          <div className="text-center mb-2">
            <p
              className={`text-2xl font-black ${
                differential > 0 ? "text-green-500" : differential < 0 ? "text-red-500" : "text-amber-500"
              }`}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {differential > 0 ? "+" : ""}{differential} DIFFERENTIAL
            </p>
          </div>

          {/* Status label */}
          <div className="text-center mb-2">
            <span
              className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                differential > 0
                  ? "bg-green-500/10 text-green-500 border border-green-500/30"
                  : differential < 0
                  ? "bg-red-500/10 text-red-500 border border-red-500/30"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
              }`}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Petty quote */}
          {quote && (
            <p className="text-center text-xs text-foreground/40 italic mt-2">
              "{quote}"
            </p>
          )}
        </div>
      )}

      {/* D. Season Record Strip */}
      {rivalryStats && rivalryStats.recentDays.length > 0 && (
        <div className="border border-foreground/10 border-t-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] text-foreground/40 uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              <span className="text-green-500">{rivalryStats.wins}W</span>
              {" - "}
              <span className="text-red-500">{rivalryStats.losses}L</span>
              {" - "}
              <span className="text-foreground/30">{rivalryStats.draws}D</span>
            </span>
          </div>

          {/* Recent pips */}
          <div className="flex items-center gap-1">
            {rivalryStats.recentDays.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-3 ${
                  day.result === "W"
                    ? "bg-green-500"
                    : day.result === "L"
                    ? "bg-red-500"
                    : "bg-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Streak */}
          {rivalryStats.currentStreakCount > 1 && rivalryStats.currentStreakType && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                rivalryStats.currentStreakType === "W"
                  ? "text-green-500"
                  : rivalryStats.currentStreakType === "L"
                  ? "text-red-500"
                  : "text-foreground/30"
              }`}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {rivalryStats.currentStreakCount}{rivalryStats.currentStreakType}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default NemesisRivalry;
