import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Get day of week letter (M, T, W, T, F, S, S)
const getDayLetter = (dateStr: string): string => {
  const date = new Date(dateStr + "T12:00:00");
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return days[date.getDay()];
};
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/hooks/useTimeWindow";
import CalendarDayDetail from "./CalendarDayDetail";
import FriendProfileModal from "./FriendProfileModal";
import PinEntryModal from "./PinEntryModal";
import JournalView from "./JournalView";
import { useJournalPin } from "@/hooks/useJournalPin";
import { useJournalEntries, useJournalEntry } from "@/hooks/useJournalEntry";

// --- SNAKE PATH MATH ---
// This calculates the x/y position for any day index automatically.
const getSnakePosition = (index: number) => {
  const rowHeight = 100; // Vertical distance between days
  const xAmplitude = 120; // How wide the snake curves (left/right)
  const xOffset = 0; // Center offset
  
  // Vertical position (Y)
  const top = 60 + (index * rowHeight);

  // Horizontal position (X) using a Sine wave
  // This creates a smooth S-curve: Left -> Right -> Left
  // We use Math.sin to oscillate between -1 and 1
  const xPeriod = 8; // How many days to complete one full Left-Right-Left cycle
  const x = xOffset + (Math.sin((index / xPeriod) * Math.PI * 2) * xAmplitude);

  // Rotation follows the curve
  const rotate = Math.cos((index / xPeriod) * Math.PI * 2) * 15;

  return { 
    left: `calc(50% + ${x}px)`, 
    top: `${top}px`, 
    rotate: rotate 
  };
};

interface MoodEntry {
  date: string;
  rating: number;
  note: string | null;
  photo_url: string | null;
  photo_signed_url?: string | null;
  caption: string | null;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "#ef4444"; 
  if (rating <= 4) return "#f97316"; 
  if (rating <= 6) return "#eab308"; 
  if (rating <= 8) return "#84cc16"; 
  return "#22c55e"; 
};

type ViewMode = "moods" | "journal";

const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moods, setMoods] = useState<Record<string, MoodEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("moods");
  const [showPinModal, setShowPinModal] = useState(false);
  const [isJournalUnlocked, setIsJournalUnlocked] = useState(false);
  const [selectedJournalDate, setSelectedJournalDate] = useState<string | null>(null);
  const [pendingJournalDate, setPendingJournalDate] = useState<string | null>(null);

  const { user } = useAuth();
  const journalPin = useJournalPin();
  const { entries: journalEntries } = useJournalEntries(
    currentDate.getFullYear(),
    currentDate.getMonth()
  );
  const selectedJournalEntry = useJournalEntry(selectedJournalDate || undefined);

  useEffect(() => {
    if (user) fetchMoods();
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
      for (const m of data) {
        let signedUrl: string | null = null;
        if (m.photo_url) {
          const { data: signedData } = await supabase.storage.from('mood-photos').createSignedUrl(m.photo_url, 3600);
          signedUrl = signedData?.signedUrl || null;
        }
        moodMap[m.date] = { 
          date: m.date, rating: m.rating, note: m.note || null, photo_url: m.photo_url, photo_signed_url: signedUrl, caption: m.caption 
        };
      }
      setMoods(moodMap);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const formatDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };

  // --- NAVIGATION ---
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "journal" && !isJournalUnlocked) {
      setShowPinModal(true);
    } else {
      setViewMode(mode);
    }
  };

  const handlePinSuccess = () => {
    setIsJournalUnlocked(true);
    setViewMode("journal");
    if (pendingJournalDate) {
      setSelectedJournalDate(pendingJournalDate);
      setPendingJournalDate(null);
    }
  };

  const handleDayClick = (dateStr: string) => {
    const isFuture = dateStr > getLocalDateString();
    if (isFuture) return;

    if (viewMode === "moods") {
      setSelectedDate(dateStr);
    } else {
      if (!isJournalUnlocked) {
        setPendingJournalDate(dateStr);
        setShowPinModal(true);
      } else {
        setSelectedJournalDate(dateStr);
      }
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const yearNum = currentDate.getFullYear();
  const totalDays = getDaysInMonth();
  const today = getLocalDateString();

  return (
    <div className="relative min-h-screen text-white overflow-hidden flex flex-col extend-to-status-bar"
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)",
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* --- HEADER (Fixed at top) --- */}
      <div className="relative z-30 px-6 pt-12 pb-4 flex justify-between items-start bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
            {/* Navigation Arrows */}
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div>
                <h1 className="text-6xl font-black tracking-tighter leading-none mix-blend-difference">
                    {monthName}
                </h1>
                <h2 
                    className="text-3xl font-bold tracking-tight text-transparent"
                    style={{ WebkitTextStroke: "1px rgba(255,255,255,0.5)" }}
                >
                    {yearNum}
                </h2>
            </div>

            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      <div className="flex-1 relative overflow-y-auto pb-32">
          
          {/* --- TOGGLES (Sticky-ish) --- */}
          <div className="sticky top-4 w-full flex justify-center gap-4 z-20 pointer-events-none mb-10">
            {/* MOODS BUTTON */}
            <button 
            onClick={() => handleViewModeChange("moods")}
            className={`pointer-events-auto transition-all duration-300 ${viewMode === 'moods' ? 'scale-110 opacity-100' : 'opacity-40 scale-90'}`}
            >
            <div className="relative">
                <span className="absolute inset-0 text-cyan-400 blur-[2px] opacity-70">MOODS</span>
                <span className="relative text-3xl font-black tracking-widest text-white mix-blend-overlay">MOODS</span>
            </div>
            </button>

            {/* JRNL BUTTON */}
            <button 
            onClick={() => handleViewModeChange("journal")}
            className={`pointer-events-auto transition-all duration-300 ${viewMode === 'journal' ? 'scale-110 opacity-100' : 'opacity-40 scale-90'}`}
            >
            <div className="border border-white px-4 py-1 rotate-[-2deg] backdrop-blur-sm bg-black/30">
                <span className="text-2xl font-mono font-bold tracking-widest">
                JRNL
                </span>
            </div>
            </button>
          </div>

          {/* --- THE SNAKE PATH --- */}
          {/* Height is calculated dynamically based on days - capped to not scroll past last day */}
          <div
            className="relative w-full"
            style={{ height: `${totalDays * 100 + 80}px` }}
          >
            {/* Background Path Line */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
                {/* Dynamically draw the line through the centers of our calculated positions */}
                <path 
                d={(() => {
                    let d = `M 50% 60 `; // Start at first day
                    for (let i = 1; i < totalDays; i++) {
                        const pos = getSnakePosition(i);
                        // Convert percentage left/top to SVG coordinates is tricky without fixed width.
                        // So for the background line, we'll just use a simple repeated pattern or omit it 
                        // to avoid complexity errors. 
                        // Instead, let's use a simpler static dashed line down the middle for structure
                    }
                    return ""; 
                })()}
                fill="none" 
                stroke="white" 
                />
                {/* Simple center guide line instead of complex curve for safety */}
                <path d={`M 50% 0 V ${totalDays * 100 + 200}`} stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            </svg>

            {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const pos = getSnakePosition(i); // Use our new Snake Math
            const dateStr = formatDate(dayNum);
            const mood = moods[dateStr];
            const hasJournal = !!journalEntries[dateStr];
            const isToday = dateStr === today;
            const isFuture = dateStr > today;

            return (
                <motion.button
                key={dayNum}
                onClick={() => handleDayClick(dateStr)}
                disabled={isFuture}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: isFuture ? 0.3 : 1, scale: 1 }}
                transition={{ delay: i * 0.02 }} // Faster stagger
                style={{
                    position: "absolute",
                    left: pos.left,
                    top: pos.top,
                    rotate: `${pos.rotate}deg`,
                    marginLeft: "-24px", // Center the 48px button
                }}
                className="flex flex-col items-center justify-center group z-10"
                >
                <div className={`
                    relative flex flex-col items-center justify-center w-12 h-20
                    transition-transform duration-200 group-active:scale-95
                `}>
                    {/* Day Letter */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-cyan-400' : 'text-zinc-500'}`}
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {getDayLetter(dateStr)}
                    </span>
                    {/* Day Number */}
                    <span className={`text-2xl font-bold ${isToday ? 'text-cyan-400' : 'text-zinc-400'}`}>
                    {String(dayNum).padStart(2, '0')}
                    </span>

                    {/* Mood Background */}
                    {viewMode === "moods" && mood && (
                    <div 
                        className="absolute inset-0 -z-10 rotate-3 rounded-sm border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                        style={{ backgroundColor: getMoodColor(mood.rating) }}
                    />
                    )}

                    {/* Journal Indicator */}
                    {viewMode === "journal" && hasJournal && (
                    <div className="absolute -bottom-2 w-full h-[2px] bg-white shadow-[0_0_8px_white]" />
                    )}
                </div>
                </motion.button>
            );
            })}
         </div>

      </div>


      {/* --- MODALS --- */}
      <CalendarDayDetail
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ""}
        onFriendClick={(id) => setSelectedFriendId(id)}
      />

      <FriendProfileModal
        friendId={selectedFriendId}
        onClose={() => setSelectedFriendId(null)}
      />

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPendingJournalDate(null);
        }}
        onSuccess={handlePinSuccess}
        mode={journalPin.hasPin ? "verify" : "setup"}
        verifyPin={journalPin.verifyPin}
        setupPin={journalPin.setupPin}
      />

      <JournalView
        isOpen={!!selectedJournalDate && isJournalUnlocked}
        entry={selectedJournalEntry.entry}
        onClose={() => setSelectedJournalDate(null)}
        canEdit={selectedJournalEntry.canEdit}
      />

    </div>
  );
};

export default CalendarTab;