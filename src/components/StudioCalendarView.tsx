import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocalDateString } from "@/hooks/useTimeWindow";

interface MoodEntry {
  date: string;
  rating: number;
  note: string | null;
  photo_url: string | null;
  photo_signed_url?: string | null;
  caption: string | null;
  isTagged?: boolean;
  taggedByUser?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
  };
}

type ViewMode = "moods" | "journal";

interface StudioCalendarViewProps {
  currentDate: Date;
  moods: Record<string, MoodEntry>;
  nemesisMoods: Record<string, number>;
  journalEntries: Record<string, any>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateMonth: (direction: number) => void;
  onDayClick: (dateStr: string) => void;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "#ef4444";
  if (rating <= 4) return "#f97316";
  if (rating <= 6) return "#eab308";
  if (rating <= 8) return "#84cc16";
  return "#22c55e";
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const StudioCalendarView = ({
  currentDate,
  moods,
  nemesisMoods,
  journalEntries,
  viewMode,
  onViewModeChange,
  onNavigateMonth,
  onDayClick,
}: StudioCalendarViewProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = getLocalDateString();

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });

  const formatDate = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    return `${year}-${m}-${String(day).padStart(2, "0")}`;
  };

  // Build grid cells: empty cells for offset + day cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="min-h-screen bg-background text-foreground px-5 pt-12 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigateMonth(-1)}
          className="p-2 rounded-2xl hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{monthName}</h1>
          <p className="text-sm text-muted-foreground">{year}</p>
        </div>
        <button
          onClick={() => onNavigateMonth(1)}
          className="p-2 rounded-2xl hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex bg-secondary rounded-xl p-1 gap-1">
          <button
            onClick={() => onViewModeChange("moods")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "moods"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Moods
          </button>
          <button
            onClick={() => onViewModeChange("journal")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "journal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Journal
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dayNum, i) => {
          if (dayNum === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = formatDate(dayNum);
          const mood = moods[dateStr];
          const nemRating = nemesisMoods[dateStr];
          const hasJournal = !!journalEntries[dateStr];
          const isToday = dateStr === today;
          const isFuture = dateStr > today;

          return (
            <motion.button
              key={dayNum}
              onClick={() => onDayClick(dateStr)}
              disabled={isFuture}
              initial={{ opacity: 0 }}
              animate={{ opacity: isFuture ? 0.3 : 1 }}
              transition={{ delay: i * 0.01 }}
              className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-colors ${
                isToday
                  ? "ring-2 ring-primary/30 bg-secondary/50"
                  : "hover:bg-secondary/50"
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  isToday ? "text-foreground font-bold" : "text-foreground/80"
                }`}
              >
                {dayNum}
              </span>

              {/* Mood indicator dot */}
              {viewMode === "moods" && mood && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getMoodColor(mood.rating) }}
                  />
                  {nemRating !== undefined && (
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-60"
                      style={{ backgroundColor: getMoodColor(nemRating) }}
                    />
                  )}
                </div>
              )}

              {/* Tagged indicator */}
              {viewMode === "moods" && mood?.isTagged && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}

              {/* Journal indicator */}
              {viewMode === "journal" && hasJournal && (
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-0.5" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StudioCalendarView;
