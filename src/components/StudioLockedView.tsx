import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Lock, Heart, MessageCircle, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStreak } from "@/hooks/useStreak";
import { useThemeContent } from "@/hooks/useThemeContent";
import FitCheckChallenge from "./FitCheckChallenge";

interface YesterdayMood {
  id: string;
  rating: number;
  photo_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
}

interface StudioLockedViewProps {
  displayName: string | null;
  yesterdaysMood: YesterdayMood | null;
  onYesterdayClick?: () => void;
  onOpenFitCheckCamera?: () => void;
  onSettingsClick?: () => void;
}

const getMoodLabel = (rating: number): string => {
  if (rating <= 2) return "Stormy";
  if (rating <= 4) return "Rainy";
  if (rating <= 6) return "Cloudy";
  if (rating <= 8) return "Partly sunny";
  return "Bright & sunny";
};

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const StudioLockedView = ({
  displayName,
  yesterdaysMood,
  onYesterdayClick,
  onOpenFitCheckCamera,
  onSettingsClick,
}: StudioLockedViewProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const { currentStreak } = useStreak();
  const content = useThemeContent();

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(21, 0, 0, 0);
      if (now >= target) {
        target.setDate(target.getDate() + 1);
      }
      const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      return {
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      };
    };

    setTimeLeft(calculate());
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 py-8 pb-32 bg-background relative">
      {/* Settings */}
      <button
        onClick={onSettingsClick}
        className="absolute top-6 right-6 p-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center text-center"
      >
        {/* Greeting */}
        <h2 className="text-2xl font-bold tracking-tight mb-1">
          {displayName ? `Hi, ${displayName}` : "Hi there"}
        </h2>

        {currentStreak > 0 && (
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 border-orange-100 rounded-full"
          >
            <Flame className="w-3 h-3 fill-orange-500" />
            <span className="font-bold">{currentStreak} Day Streak</span>
          </Badge>
        )}

        {/* Countdown Card */}
        <div className="w-full bg-card rounded-2xl border border-border p-6 mb-4 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Opens at 9 PM</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold tracking-tight tabular-nums">{pad(timeLeft.hours)}</span>
              <span className="text-xs text-muted-foreground mt-1">hours</span>
            </div>
            <span className="text-3xl font-light text-muted-foreground -mt-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold tracking-tight tabular-nums">{pad(timeLeft.minutes)}</span>
              <span className="text-xs text-muted-foreground mt-1">min</span>
            </div>
            <span className="text-3xl font-light text-muted-foreground -mt-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold tracking-tight tabular-nums">{pad(timeLeft.seconds)}</span>
              <span className="text-xs text-muted-foreground mt-1">sec</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">{content.lockedMessage}</p>
        </div>

        {/* Yesterday's Mood Card */}
        {yesterdaysMood && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={onYesterdayClick}
            className="w-full bg-card rounded-2xl border border-border overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-4"
          >
            <div className="px-4 py-3 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground">Yesterday</span>
            </div>
            {yesterdaysMood.photo_url && (
              <img
                src={yesterdaysMood.photo_url}
                alt="Yesterday's mood"
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMoodColor(yesterdaysMood.rating) }}
                />
                <span className="text-sm font-medium">
                  {getMoodLabel(yesterdaysMood.rating)} ({yesterdaysMood.rating}/10)
                </span>
              </div>
              {yesterdaysMood.caption && (
                <p className="text-sm text-muted-foreground italic mb-3">
                  "{yesterdaysMood.caption}"
                </p>
              )}
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">{yesterdaysMood.likes_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{yesterdaysMood.comments_count}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Fit Check Challenge */}
        <div className="w-full">
          <FitCheckChallenge onOpenCamera={() => onOpenFitCheckCamera?.()} />
        </div>
      </motion.div>
    </div>
  );
};

export default StudioLockedView;
