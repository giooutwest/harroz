import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { differenceInSeconds, setHours, setMinutes, setSeconds, addDays, isBefore } from "date-fns";

interface YesterdayMood {
  id: string;
  rating: number;
  photo_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  date?: string;
}

interface ZineLockedViewProps {
  displayName: string | null;
  yesterdaysMood: YesterdayMood | null;
  onYesterdayClick?: () => void;
  onOpenFitCheckCamera?: () => void;
}

const ZineLockedView = ({
  displayName,
  yesterdaysMood,
  onYesterdayClick
}: ZineLockedViewProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Calculate time until 9 PM
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let target = setSeconds(setMinutes(setHours(now, 21), 0), 0);

      // If it's past 9 PM, target is tomorrow
      if (isBefore(target, now)) {
        target = addDays(target, 1);
      }

      const diff = differenceInSeconds(target, now);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-140px)] w-full max-w-md mx-auto px-4 pt-2 pb-8 overflow-hidden bg-background">
      {/* Noise overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.08] noise-overlay mix-blend-overlay" />

      {/* Header section */}
      <header className="relative w-full z-10 mb-2">
        {/* ROZ title - large and bold */}
        <h1
          className="text-[7rem] leading-[0.85] font-display text-foreground tracking-[-0.04em] select-none"
          style={{ fontFamily: "'Abril Fatface', serif" }}
        >
          ROZ
        </h1>

        {/* Greeting with shadow effect */}
        <div className="relative -mt-2 ml-1">
          <span
            className="absolute top-[2px] left-[2px] text-3xl font-bold text-muted-foreground/20"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Hi, {displayName || "there"}!
          </span>
          <span
            className="relative text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Hi, {displayName || "there"}!
          </span>
        </div>

        {/* Lock button - glass effect */}
        <motion.div
          className="absolute top-4 right-0"
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
            <Lock className="w-5 h-5 text-foreground/60" />
            {/* Glass reflection */}
            <div className="absolute top-1 left-2 w-4 h-4 rounded-full bg-white/20 blur-sm" />
          </div>
        </motion.div>
      </header>

      {/* Countdown section */}
      <div className="relative z-10 mt-1 mb-6">
        <div
          className="text-[10px] tracking-[0.2em] text-[#C5A059] mb-1 uppercase"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Until 21:00 Opening
        </div>
        <div className="relative">
          {/* Glitch layers */}
          <span
            className="absolute top-0 left-0 text-[4rem] font-bold tracking-tight leading-none text-[#D93025] opacity-80"
            style={{
              fontFamily: "'Space Mono', monospace",
              transform: 'translate(-2px, 0)',
              clipPath: 'inset(0 0 50% 0)'
            }}
          >
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
          <span
            className="absolute top-0 left-0 text-[4rem] font-bold tracking-tight leading-none text-[#C5A059] opacity-80"
            style={{
              fontFamily: "'Space Mono', monospace",
              transform: 'translate(2px, 0)',
              clipPath: 'inset(50% 0 0 0)'
            }}
          >
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
          {/* Main text */}
          <span
            className="relative text-[4rem] font-bold tracking-tight leading-none text-foreground"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </div>
      </div>

      {/* Yesterday's mood polaroid */}
      {yesterdaysMood && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 flex justify-center"
          onClick={onYesterdayClick}
        >
          {/* Decorative squiggle */}
          <div className="absolute -top-8 -left-2 z-20 w-20 h-20 pointer-events-none opacity-20">
            <svg className="w-full h-full stroke-foreground fill-none" strokeWidth="1.5" viewBox="0 0 100 100">
              <path d="M20,50 Q35,20 50,50 T80,50" />
              <path d="M25,60 Q40,30 55,60 T85,60" />
            </svg>
          </div>

          {/* Polaroid frame */}
          <div
            className="bg-[#f5f5f0] p-3 pt-3 pb-8 shadow-2xl cursor-pointer transform hover:rotate-0 transition-transform duration-300"
            style={{
              width: '280px',
              transform: 'rotate(-1deg)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Header */}
            <div
              className="text-[10px] text-black/80 mb-2 flex justify-between uppercase tracking-[0.15em]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              <span>Yesterday's Mood</span>
              <span>{yesterdaysMood.rating}/10</span>
            </div>

            {/* Photo container */}
            <div className="relative overflow-hidden bg-[#d4d4c8] aspect-square">
              {yesterdaysMood.photo_url ? (
                <img
                  src={yesterdaysMood.photo_url}
                  alt="Yesterday's mood"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#d4d4c8]">
                  <span
                    className="text-7xl text-black/20"
                    style={{ fontFamily: "'Abril Fatface', serif" }}
                  >
                    {yesterdaysMood.rating}
                  </span>
                </div>
              )}

              {/* JOURNAL overlay text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h2
                  className="text-5xl tracking-[0.3em] uppercase text-[#C5A059]/70 mix-blend-multiply"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 400,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Journal
                </h2>
              </div>
            </div>

            {/* Likes/comments footer */}
            <div
              className="absolute bottom-2 left-3 right-3 flex justify-center"
            >
              <span
                className="text-[9px] text-black/60 uppercase tracking-[0.1em]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {yesterdaysMood.likes_count} Likes / {yesterdaysMood.comments_count} Comments
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* No yesterday's mood placeholder */}
      {!yesterdaysMood && (
        <div className="relative z-10 flex justify-center">
          <div
            className="bg-[#f5f5f0] p-3 pt-3 pb-8 shadow-2xl"
            style={{
              width: '280px',
              transform: 'rotate(-1deg)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div
              className="text-[10px] text-black/80 mb-2 uppercase tracking-[0.15em]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Yesterday's Mood
            </div>
            <div className="relative overflow-hidden bg-[#d4d4c8] aspect-square flex items-center justify-center">
              <span
                className="text-sm text-black/40 uppercase tracking-widest"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                No entry
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer navigation has been removed to prevent duplication */}
    </div>
  );
};

export default ZineLockedView;