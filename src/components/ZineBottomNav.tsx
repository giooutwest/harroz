import { motion } from "framer-motion";

type TabId = "today" | "calendar" | "stats" | "friends" | "messages";

interface ZineBottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const ZineBottomNav = ({ activeTab, onTabChange }: ZineBottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />

      <div className="relative px-4 pt-6 pb-4">
        {/* First row */}
        <div className="flex items-end justify-between mb-3">
          {/* Calendar - black button */}
          <motion.button
            onClick={() => onTabChange("calendar")}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeTab === "calendar"
                ? "bg-white text-black"
                : "bg-black text-white border border-white/30"
            }`}
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Calendar
          </motion.button>

          {/* Friends - cursive */}
          <motion.button
            onClick={() => onTabChange("friends")}
            whileTap={{ scale: 0.95 }}
            className={`text-2xl transition-all ${
              activeTab === "friends"
                ? "text-white"
                : "text-white/50 hover:text-white/80"
            }`}
            style={{
              fontFamily: "'Great Vibes', cursive",
              transform: "rotate(-2deg)"
            }}
          >
            Friends
          </motion.button>
        </div>

        {/* Second row */}
        <div className="flex items-end justify-between">
          {/* Today - bold serif */}
          <motion.button
            onClick={() => onTabChange("today")}
            whileTap={{ scale: 0.95 }}
            className={`text-4xl font-bold transition-all ${
              activeTab === "today"
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Today
          </motion.button>

          {/* You - italic gold */}
          <motion.button
            onClick={() => onTabChange("stats")}
            whileTap={{ scale: 0.95 }}
            className={`text-3xl italic transition-all ${
              activeTab === "stats"
                ? "text-[#C5A059]"
                : "text-[#C5A059]/50 hover:text-[#C5A059]/80"
            }`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            You
          </motion.button>

          {/* Messages - red tape */}
          <motion.button
            onClick={() => onTabChange("messages")}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] shadow-md transition-all ${
              activeTab === "messages"
                ? "bg-[#C62828] text-white"
                : "bg-[#C62828]/60 text-white/80 hover:bg-[#C62828]/80"
            }`}
            style={{
              fontFamily: "'Space Mono', monospace",
              transform: "rotate(-3deg)"
            }}
          >
            Messages
          </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default ZineBottomNav;
