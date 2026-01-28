import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Heart, MessageCircle } from "lucide-react";
import { differenceInSeconds, setHours, setMinutes, setSeconds, addDays, isBefore } from "date-fns";
import FitCheckChallenge from "./FitCheckChallenge";

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
  isPixelTheme?: boolean;
}

const ZineLockedView = ({
  displayName,
  yesterdaysMood,
  onYesterdayClick,
  onOpenFitCheckCamera,
  isPixelTheme = false
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

  // Don't render zine style for pixel theme
  if (isPixelTheme) {
    return null; // Let TodayTab handle pixel theme
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] w-full max-w-md mx-auto px-4 py-2 overflow-hidden bg-background">
      {/* Noise overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15] noise-overlay mix-blend-overlay" />

      {/* Header with ROZ title */}
      <header className="relative w-full h-[18vh] z-10">
        <h1 className="absolute -top-4 -left-4 text-[8rem] leading-[0.8] font-display text-foreground tracking-tighter opacity-100 select-none">
          ROZ
        </h1>
        <div className="absolute bottom-4 left-2 w-full">
          <span className="absolute top-1 left-0 font-serif-zine text-4xl font-bold text-muted-foreground/30 blur-sm">
            Hi, {displayName || "there"}!
          </span>
          <span className="relative font-serif-zine text-4xl font-bold text-foreground">
            Hi, {displayName || "there"}!
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-grow flex flex-col items-center justify-center -mt-4 z-10">
        {/* Countdown section */}
        <div className="w-full flex flex-col items-start mb-8 px-2 transform -rotate-1">
          <div className="font-mono-zine text-[10px] tracking-[0.3em] text-red-500 mb-1 font-bold uppercase">
            Until 21:00 Opening
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-mono-zine text-6xl font-bold text-foreground tracking-tighter leading-none glitch-text">
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
            <span className="font-mono-zine text-xl text-foreground/40 animate-pulse">_</span>
          </div>
          <div className="w-full h-[1px] jagged-line text-foreground/20 mt-2" />
        </div>

        {/* Lock button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="absolute top-0 right-0 group"
        >
          <div className="relative w-14 h-14 rounded-full bg-foreground/10 backdrop-blur-md border border-foreground/30 flex items-center justify-center shadow-lg">
            <Lock className="w-5 h-5 text-foreground opacity-80" />
            <div className="absolute inset-0 rounded-full border border-foreground/20 blur-[2px]" />
          </div>
        </motion.button>

        {/* Yesterday's mood polaroid card */}
        {yesterdaysMood && (
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            whileHover={{ rotate: 0, scale: 1.02 }}
            transition={{ duration: 0.5 }}
            className="relative cursor-pointer group"
            onClick={onYesterdayClick}
          >
            {/* Decorative squiggle */}
            <div className="absolute -top-6 -left-6 z-20 w-24 h-24 pointer-events-none opacity-30">
              <svg className="w-full h-full stroke-foreground fill-none stroke-2" viewBox="0 0 100 100">
                <path d="M10,50 Q30,10 50,50 T90,50 M20,60 Q40,20 60,60 T100,60" />
              </svg>
            </div>

            {/* Polaroid frame */}
            <div className="bg-white p-3 pt-4 pb-10 shadow-2xl relative w-[16rem]">
              <div className="font-mono-zine text-[10px] text-black mb-2 flex justify-between uppercase tracking-widest">
                <span>Yesterday's Mood</span>
                <span>{yesterdaysMood.rating}/10</span>
              </div>

              <div className="relative overflow-hidden bg-gray-200 aspect-[4/5]">
                {yesterdaysMood.photo_url ? (
                  <img
                    src={yesterdaysMood.photo_url}
                    alt="Yesterday's mood"
                    className="w-full h-full object-cover grayscale-[0.3] contrast-110 sepia-[0.1]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                    <span className="text-6xl font-display text-gray-500">{yesterdaysMood.rating}</span>
                  </div>
                )}
                {/* Overlay text */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                  <h2 className="text-4xl font-display text-white tracking-widest uppercase drop-shadow-xl transform scale-y-110 mix-blend-overlay opacity-90 group-hover:scale-110 transition-transform duration-300">
                    Journal
                  </h2>
                </div>
              </div>

              {/* Likes/comments */}
              <div className="absolute bottom-2 right-3">
                <div className="font-mono-zine text-[9px] text-black/70 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {yesterdaysMood.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {yesterdaysMood.comments_count}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Fit Check Challenge */}
        <div className="w-full mt-6 px-2">
          <FitCheckChallenge
            isPixelTheme={false}
            onOpenCamera={onOpenFitCheckCamera}
          />
        </div>
      </main>

      {/* Scattered navigation - hidden for now since we have bottom nav */}
      {/* This could be enabled as an alternative navigation style */}
    </div>
  );
};

export default ZineLockedView;
