import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User } from "lucide-react"; // Icons for 'FRNDS' and 'YOU'
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/hooks/useTimeWindow";
import CalendarDayDetail from "./CalendarDayDetail";
import FriendProfileModal from "./FriendProfileModal";
import PinEntryModal from "./PinEntryModal";
import JournalView from "./JournalView";
import { useJournalPin } from "@/hooks/useJournalPin";
import { useJournalEntries, useJournalEntry } from "@/hooks/useJournalEntry";

// --- COORDINATE MAPPING FOR THE "WINDING PATH" ---
// These approximate the snake path from your image
const DAY_POSITIONS = [
  { left: "10%", top: "12%", rotate: -5 },  // 1
  { left: "28%", top: "12%", rotate: 2 },   // 2
  { left: "55%", top: "14%", rotate: 5 },   // 3
  { left: "75%", top: "20%", rotate: 10 },  // 4
  { left: "65%", top: "28%", rotate: -2 },  // 5
  { left: "25%", top: "32%", rotate: -8 },  // 6
  { left: "10%", top: "40%", rotate: -5 },  // 7
  { left: "15%", top: "50%", rotate: 5 },   // 8 - Near Moods
  { left: "75%", top: "48%", rotate: 10 },  // 9 - Near Jrnl
  { left: "85%", top: "58%", rotate: 5 },   // 10
  { left: "60%", top: "62%", rotate: -5 },  // 11
  { left: "40%", top: "68%", rotate: 2 },   // 12
  { left: "15%", top: "72%", rotate: -10 }, // 13
  { left: "25%", top: "80%", rotate: 5 },   // 14
  { left: "55%", top: "78%", rotate: -2 },  // 15
  { left: "75%", top: "85%", rotate: 8 },   // 16
  { left: "50%", top: "92%", rotate: 0 },   // 17
  // ... Loop or extend for 31 days. For this demo, I'll map the rest dynamically or wrap around.
];

// Helper to get position for any day index (0-30)
const getPosition = (index: number) => {
  if (index < DAY_POSITIONS.length) return DAY_POSITIONS[index];
  // Simple fallback logic for days 18-31 to keep winding down
  const baseTop = 92 + (index - 16) * 8; 
  const isEvenRow = Math.floor((index - 17) / 4) % 2 === 0;
  const leftPos = isEvenRow ? 20 + ((index % 4) * 20) : 80 - ((index % 4) * 20);
  return { left: `${leftPos}%`, top: `${baseTop}%`, rotate: (index % 2 === 0 ? -5 : 5) };
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
  if (rating <= 2) return "#ef4444"; // Red
  if (rating <= 4) return "#f97316"; // Orange
  if (rating <= 6) return "#eab308"; // Yellow
  if (rating <= 8) return "#84cc16"; // Lime
  return "#22c55e"; // Green
};

type ViewMode = "moods" | "journal";

const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moods, setMoods] = useState<Record<string, MoodEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // View & Lock State
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

  // --- HANDLERS ---
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
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden pb-32">
      
      {/* --- BACKGROUND DASHED LINE (SVG) --- */}
      {/* This draws the winding path behind the numbers */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <path 
          d="M 40 100 Q 100 100 120 150 T 200 200 T 300 300 T 100 400 T 50 500 T 300 600" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeDasharray="8 8"
        />
        {/* Note: A real implementation would generate this path D based on the day coordinates dynamically */}
      </svg>

      {/* --- HEADER --- */}
      <div className="relative z-10 px-6 pt-12 flex justify-between items-start">
        <div>
          <h1 className="text-8xl font-black tracking-tighter leading-none mix-blend-difference">
            {monthName}
          </h1>
          <h2 
            className="text-5xl font-bold tracking-tight text-transparent ml-2"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.5)" }}
          >
            {yearNum}
          </h2>
        </div>
        
        {/* Friends Icon (Top Right) */}
        <div className="flex flex-col items-center gap-1 opacity-70">
          <span className="font-handwriting text-xs -rotate-6">FRNDS</span>
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* --- CENTER TOGGLES (Floating) --- */}
      <div className="absolute top-[35%] left-0 w-full flex flex-col items-center justify-center gap-4 z-20 pointer-events-none">
        
        {/* MOODS BUTTON */}
        <button 
          onClick={() => handleViewModeChange("moods")}
          className={`pointer-events-auto transition-all duration-300 ${viewMode === 'moods' ? 'scale-110 opacity-100' : 'opacity-40 scale-90'}`}
        >
          <div className="relative">
            <span className="absolute inset-0 text-cyan-400 blur-[2px] opacity-70">MOODS</span>
            <span className="relative text-5xl font-black tracking-widest text-white mix-blend-overlay">MOODS</span>
            {/* Glitch Effect Bars */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-cyan-500/50 -translate-x-1" />
          </div>
        </button>

        {/* JRNL BUTTON */}
        <button 
          onClick={() => handleViewModeChange("journal")}
          className={`pointer-events-auto transition-all duration-300 ${viewMode === 'journal' ? 'scale-110 opacity-100' : 'opacity-40 scale-90'}`}
        >
          <div className="border-2 border-white px-6 py-2 rotate-[-2deg] backdrop-blur-sm bg-black/30">
             <span className="text-4xl font-mono font-bold tracking-widest" style={{ textShadow: "0 0 10px white" }}>
               JRNL
             </span>
          </div>
        </button>

      </div>

      {/* --- DAYS (Winding Path) --- */}
      <div className="relative w-full h-[150vh] mt-10 z-10">
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const pos = getPosition(i);
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
              transition={{ delay: i * 0.03 }}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                rotate: `${pos.rotate}deg`,
              }}
              className="flex flex-col items-center justify-center group"
            >
              <div className={`
                 relative flex items-center justify-center w-12 h-16
                 transition-transform duration-200 group-active:scale-95
              `}>
                {/* Day Number */}
                <span className={`text-2xl font-bold ${isToday ? 'text-cyan-400' : 'text-zinc-400'}`}>
                  {String(dayNum).padStart(2, '0')}
                </span>

                {/* Mood Background (If exists) */}
                {viewMode === "moods" && mood && (
                   <div className="absolute inset-0 -z-10 bg-zinc-800/80 rotate-3 rounded-sm border border-white/10" />
                )}

                {/* Journal Indicator (If exists) */}
                {viewMode === "journal" && hasJournal && (
                   <div className="absolute -bottom-2 w-full h-[2px] bg-white shadow-[0_0_8px_white]" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* --- FOOTER ICON --- */}
      <div className="fixed bottom-24 left-6 flex flex-col items-center gap-1 opacity-70 z-30">
         <User className="w-8 h-8" />
         <span className="font-handwriting text-xs -rotate-6">YOU</span>
      </div>

      {/* --- MODALS (Fixed Props) --- */}
      {/* Note: I removed isPixelTheme from these calls to fix your error */}
      
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