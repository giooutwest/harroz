import { motion } from "framer-motion";
import { Settings, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import BadgeDisplay from "./BadgeDisplay";

interface ZineProfileViewProps {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  currentStreak: number;
  bestStreak: number;
  totalGoodDays: number;
  totalEntries: number;
  yearlyAverage: number;
  equippedBadges?: string[];
  onEditClick: () => void;
  onSettingsClick: () => void;
}

const ZineProfileView = ({
  displayName,
  username,
  avatarUrl,
  currentStreak,
  bestStreak,
  totalGoodDays,
  totalEntries,
  yearlyAverage,
  equippedBadges = [],
  onEditClick,
  onSettingsClick,
}: ZineProfileViewProps) => {
  // Generate random dossier ID
  const dossierId = `#${Math.floor(1000 + Math.random() * 9000)}`;
  const refCode = `${Math.floor(100 + Math.random() * 900)}-X`;

  // Generate tally marks for streak
  const tallyMarks = "////".repeat(Math.floor(currentStreak / 5)) +
    "/".repeat(currentStreak % 5);

  return (
    <div className="relative min-h-[calc(100vh-140px)] bg-[#f5f0e8] text-black overflow-hidden extend-to-status-bar">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Header metadata */}
      <div className="relative z-10 px-4 pt-4 flex justify-between">
        <div
          className="text-[10px] text-black/40 uppercase tracking-wider"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <div>Ref: {refCode}</div>
          <div>Sec: Unclassified</div>
        </div>
        <div
          className="text-[10px] text-black/40 uppercase tracking-wider text-right"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <div>Dossier_ID: {dossierId}</div>
          <div>Loc: Unknown</div>
        </div>
      </div>

      {/* Profile photo - polaroid style */}
      <div className="relative z-10 flex justify-center mt-4 mb-6">
        <div className="relative">
          {/* Tape decoration */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 bg-[#f5e6c8]/80 z-20"
            style={{ transform: "translateX(-50%) rotate(-5deg)" }}
          />

          {/* Paperclip */}
          <div className="absolute -top-2 -right-4 z-20 text-2xl opacity-60">📎</div>

          {/* Photo frame */}
          <div
            className="bg-white p-2 pb-6 shadow-lg"
            style={{ transform: "rotate(3deg)" }}
          >
            <Avatar className="w-32 h-32 rounded-none">
              <AvatarImage src={avatarUrl || undefined} className="object-cover grayscale" />
              <AvatarFallback className="bg-gray-200 text-gray-500 text-4xl rounded-none">
                {displayName?.charAt(0) || username?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Name section */}
      <div className="relative z-10 px-4">
        <h1
          className="text-5xl font-black uppercase tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            textShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          }}
        >
          {displayName?.split(" ").map((word, i) => (
            <span key={i} className="block">{word}</span>
          )) || "Agent"}
        </h1>

        <p
          className="text-sm text-black/50 mt-2 flex items-center gap-2"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          @{username || "unknown"}
          {equippedBadges.length > 0 && (
            <BadgeDisplay badgeIds={equippedBadges} size="md" />
          )}
        </p>

        <button
          onClick={onEditClick}
          className="mt-2 text-[#2563eb] hover:underline"
          style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px" }}
        >
          [MODIFY_DATA]
        </button>
      </div>

      {/* Streak section */}
      <div className="relative z-10 px-4 mt-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-orange-400" />
          <span
            className="text-[10px] text-black/40 uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Status Report: Streak
          </span>
        </div>

        <div className="flex items-baseline gap-4">
          <h2
            className="text-6xl font-black tracking-tighter"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: "3px 3px 0 rgba(0,0,0,0.1)",
            }}
          >
            {currentStreak} Days
          </h2>
          <span
            className="text-2xl text-black/30"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {tallyMarks || "—"}
          </span>
        </div>

        <p
          className="text-sm text-orange-500 mt-1 italic flex items-center gap-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <Flame className="w-4 h-4" />
          Keep the momentum!
        </p>
      </div>

      {/* Stats grid */}
      <div className="relative z-10 px-4 mt-8 grid grid-cols-2 gap-4">
        {/* Record High */}
        <div className="border-l-2 border-orange-300 pl-3">
          <div className="flex items-center gap-1 mb-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span
              className="text-[10px] text-black/40 uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Record_High
            </span>
          </div>
          <p
            className="text-2xl italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {bestStreak} days
          </p>
          <p
            className="text-[8px] text-black/30 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Personal Best // Archived
          </p>
        </div>

        {/* Conditions */}
        <div className="text-right">
          <span
            className="text-[10px] text-black/40 uppercase tracking-wider"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Conditions ☀️
          </span>
          <div className="bg-white border border-black/10 p-3 mt-1 inline-block">
            <span
              className="text-3xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {totalGoodDays}
            </span>
            <p
              className="text-[10px] text-orange-500 uppercase"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Sunny Days
            </p>
          </div>
        </div>
      </div>

      {/* Average */}
      <div className="relative z-10 px-4 mt-6">
        <div className="flex items-center gap-2 border-l-2 border-orange-400 pl-3">
          <span className="text-orange-500 text-xl">📈</span>
          <div>
            <span
              className="text-[10px] text-black/40 uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Avg_Weather_IDX
            </span>
            <p
              className="text-3xl font-bold text-[#2563eb]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {yearlyAverage.toFixed(1)}
            </p>
            <p
              className="text-[10px] text-black/30"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Based on {totalEntries} check-in{totalEntries !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* TOP SECRET stamp */}
      <div className="relative z-10 flex justify-center mt-6">
        <div
          className="px-6 py-2 border-2 border-red-400 text-red-400 uppercase tracking-widest"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "14px",
            transform: "rotate(-5deg)",
          }}
        >
          Top Secret
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-4 mt-8 pb-8 flex justify-between items-center border-t border-black/10 pt-4">
        <div>
          <p
            className="text-[10px] text-black/40 uppercase tracking-wider"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Authorized By:
          </p>
          <p
            className="text-lg font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            [Redacted]
          </p>
          <p
            className="text-[8px] text-black/30"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            _system_ready
          </p>
        </div>

        <motion.button
          onClick={onSettingsClick}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-black/5 rounded-full hover:bg-black/10 transition-colors"
        >
          <Settings className="w-5 h-5 text-black/60" />
        </motion.button>
      </div>
    </div>
  );
};

export default ZineProfileView;
