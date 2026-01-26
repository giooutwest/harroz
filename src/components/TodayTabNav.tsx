import { motion } from "framer-motion";
import { Camera, BookOpen, Lock } from "lucide-react";

export type TodaySection = "post" | "journal";

interface TodayTabNavProps {
  activeSection: TodaySection;
  onSectionChange: (section: TodaySection) => void;
  isJournalLocked?: boolean;
  isPixelTheme?: boolean;
}

const TodayTabNav = ({
  activeSection,
  onSectionChange,
  isJournalLocked = true,
  isPixelTheme = false
}: TodayTabNavProps) => {
  return (
    <div className={`flex bg-secondary p-1 mb-6 ${isPixelTheme ? "" : "rounded-full"}`}>
      {/* Mood Post button */}
      <button
        onClick={() => onSectionChange("post")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 relative transition-colors ${
          activeSection === "post"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        } ${isPixelTheme ? "" : "rounded-full"}`}
      >
        {activeSection === "post" && (
          <motion.div
            layoutId="todayNavIndicator"
            className={`absolute inset-0 bg-background shadow-sm ${isPixelTheme ? "" : "rounded-full"}`}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Camera className={`w-4 h-4 relative z-10 ${isPixelTheme ? "" : ""}`} />
        <span className={`relative z-10 font-medium ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
          Mood Post
        </span>
      </button>

      {/* Private Journal button */}
      <button
        onClick={() => onSectionChange("journal")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 relative transition-colors ${
          activeSection === "journal"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        } ${isPixelTheme ? "" : "rounded-full"}`}
      >
        {activeSection === "journal" && (
          <motion.div
            layoutId="todayNavIndicator"
            className={`absolute inset-0 bg-background shadow-sm ${isPixelTheme ? "" : "rounded-full"}`}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <BookOpen className={`w-4 h-4 relative z-10`} />
        <span className={`relative z-10 font-medium ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
          Journal
        </span>
        {isJournalLocked && (
          <Lock className="w-3 h-3 relative z-10 text-muted-foreground" />
        )}
      </button>
    </div>
  );
};

export default TodayTabNav;
