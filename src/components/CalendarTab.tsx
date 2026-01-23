import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/hooks/useTimeWindow";
import CalendarDayDetail from "./CalendarDayDetail";
import FriendProfileModal from "./FriendProfileModal"; // 1. Import the Modal

interface MoodEntry {
  date: string;
  rating: number;
  note: string | null;
  photo_url: string | null;
  photo_signed_url?: string | null;
  caption: string | null;
}

interface CalendarTabProps {
  isPixelTheme?: boolean;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const CalendarTab = ({ isPixelTheme = false }: CalendarTabProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moods, setMoods] = useState<Record<string, MoodEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null); // 2. State for popup
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMoods();
    }
  }, [currentDate, user]);

  const fetchMoods = async () => {
    if (!user) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month + 1, 0);
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('moods')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (data) {
      const moodMap: Record<string, MoodEntry> = {};
      
      // Generate signed URLs for photos
      for (const m of data) {
        let signedUrl: string | null = null;
        if (m.photo_url) {
          const { data: signedData } = await supabase.storage
            .from('mood-photos')
            .createSignedUrl(m.photo_url, 3600);
          signedUrl = signedData?.signedUrl || null;
        }
        
        moodMap[m.date] = { 
          date: m.date, 
          rating: m.rating, 
          note: m.note,
          photo_url: m.photo_url,
          photo_signed_url: signedUrl,
          caption: m.caption
        };
      }
      setMoods(moodMap);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const days = getDaysInMonth();
  const today = getLocalDateString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigateMonth(-1)}
          className={`p-2 hover:bg-secondary/80 transition-colors touch-manipulation ${isPixelTheme ? "bg-secondary" : "rounded-full bg-secondary"}`}
        >
          <ChevronLeft className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"}`} />
        </motion.button>
        
        <motion.h2 
          key={monthYear}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-bold ${isPixelTheme ? "text-sm" : "text-lg"}`}
        >
          {monthYear}
        </motion.h2>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigateMonth(1)}
          className={`p-2 hover:bg-secondary/80 transition-colors touch-manipulation ${isPixelTheme ? "bg-secondary" : "rounded-full bg-secondary"}`}
        >
          <ChevronRight className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"}`} />
        </motion.button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day, i) => (
          <div key={`${day}-${i}`} className={`text-center text-muted-foreground font-medium py-1 ${isPixelTheme ? "text-[10px]" : "text-xs"}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <motion.div 
        key={monthYear}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-7 gap-1"
      >
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = formatDate(day);
          const mood = moods[dateStr];
          const isToday = dateStr === today;
          const isFuture = dateStr > today;

          return (
            <motion.button
              key={dateStr}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isFuture && setSelectedDate(dateStr)}
              disabled={isFuture}
              className={`aspect-square flex flex-col items-center justify-center touch-manipulation relative ${
                isFuture ? "opacity-30" : ""
              } ${isPixelTheme ? "" : "rounded-lg"}`}
            >
              {/* Day number */}
              <span className={`font-medium ${mood ? "text-foreground" : "text-muted-foreground"} ${isPixelTheme ? "text-sm" : "text-base"}`}>
                {day}
              </span>
              
              {/* Mood indicator dot */}
              {mood && (
                <div 
                  className={`mt-0.5 ${isPixelTheme ? "w-2 h-2" : "w-2.5 h-2.5 rounded-full"}`}
                  style={{ backgroundColor: getMoodColor(mood.rating) }}
                />
              )}
              
              {/* Today indicator */}
              {isToday && (
                <div className={`absolute inset-0 border-2 border-primary pointer-events-none ${isPixelTheme ? "" : "rounded-lg"}`} />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Timezone indicator */}
      <div className="mt-4 text-center">
        <span className={`text-muted-foreground ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
          🕐 {timezone}
        </span>
      </div>

      {/* Full legend showing all mood ranges */}
      <div className="mt-4 bg-card border border-border p-4" style={{ borderRadius: isPixelTheme ? "0" : "1rem" }}>
        <p className={`text-center text-muted-foreground mb-3 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
          Mood Legend
        </p>
        <div className="grid grid-cols-5 gap-2">
          {[
            { range: "0-2", label: "Stormy", emoji: "🌧️", rating: 1 },
            { range: "3-4", label: "Rainy", emoji: "🌦️", rating: 3 },
            { range: "5-6", label: "Cloudy", emoji: "⛅", rating: 5 },
            { range: "7-8", label: "Sunny", emoji: "🌤️", rating: 7 },
            { range: "9-10", label: "Bright", emoji: "☀️", rating: 9 },
          ].map((item) => (
            <div key={item.range} className="flex flex-col items-center gap-1">
              <div 
                className={`w-4 h-4 ${isPixelTheme ? "" : "rounded-full"}`}
                style={{ backgroundColor: getMoodColor(item.rating) }}
              />
              <span className={`${isPixelTheme ? "text-[6px]" : "text-[10px]"}`}>{item.emoji}</span>
              <span className={`text-muted-foreground ${isPixelTheme ? "text-[5px]" : "text-[8px]"}`}>
                {item.range}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail modal - PASSING THE CLICK HANDLER HERE */}
      <CalendarDayDetail
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ""}
        isPixelTheme={isPixelTheme}
        onFriendClick={(id) => setSelectedFriendId(id)} // 3. Pass the handler down
      />

      {/* Profile Modal - ACTUALLY RENDER THE POPUP */}
      <FriendProfileModal
        friendId={selectedFriendId}
        onClose={() => setSelectedFriendId(null)}
        isPixelTheme={isPixelTheme}
      />
    </div>
  );
};

export default CalendarTab;