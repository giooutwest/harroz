import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, TrendingUp, TrendingDown, Minus, Calendar, Activity, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import html2canvas from "html2canvas";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface WeeklyRecapProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeeklyRecap = ({ isOpen, onClose }: WeeklyRecapProps) => {
  const { stats, loading } = useWeeklyStats();
  const [exporting, setExporting] = useState(false);
  const recapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getStabilityLabel = (variance: number): string => {
    if (variance < 1) return "Very Stable";
    if (variance < 2) return "Stable";
    if (variance < 4) return "Variable";
    return "Turbulent";
  };

  const getTrendIcon = () => {
    if (!stats) return null;
    switch (stats.moodTrend) {
      case "up":
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case "down":
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getMoodEmoji = (rating: number): string => {
    if (rating <= 2) return "😢";
    if (rating <= 4) return "😕";
    if (rating <= 6) return "😐";
    if (rating <= 8) return "😊";
    return "😄";
  };

  const handleExport = async () => {
    if (!recapRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(recapRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast({ title: "Export failed", variant: "destructive" });
          return;
        }

        // Check if Web Share API is available (mobile)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], "weekly-recap.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: "My Weekly Mood Recap",
            }).catch(() => {
              // Fallback to download if share fails
              downloadImage(blob);
            });
          } else {
            downloadImage(blob);
          }
        } else {
          downloadImage(blob);
        }
      }, "image/png");
    } catch (err) {
      console.error("Export error:", err);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-recap-${format(new Date(), "yyyy-MM-dd")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Saved to downloads!" });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* The shareable card - 9:16 aspect ratio */}
          <div
            ref={recapRef}
            className="relative w-full overflow-hidden rounded-2xl"
            style={{ aspectRatio: "9/16" }}
          >
            {/* Background image with overlay */}
            {stats?.bestDay?.photoUrl ? (
              <>
                <img
                  src={stats.bestDay.photoUrl}
                  alt="Best day"
                  className="absolute inset-0 w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
            )}

            {/* Content */}
            <div className="relative h-full flex flex-col p-6 text-white">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                </div>
              ) : !stats ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <p className="text-white/70 text-lg">No data this week</p>
                    <p className="text-white/50 text-sm mt-2">
                      Start logging your mood to see your weekly recap!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <p className="text-white/60 text-sm font-medium tracking-wider uppercase">
                      Weekly Recap
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "MMM d")} -{" "}
                      {format(new Date(), "MMM d, yyyy")}
                    </p>
                  </div>

                  {/* Main stat - Average mood */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <p className="text-white/50 text-sm mb-2">Average Mood</p>
                    <div className="flex items-center gap-3">
                      <span className="text-7xl font-bold tracking-tight">
                        {stats.averageMood}
                      </span>
                      <span className="text-5xl">{getMoodEmoji(stats.averageMood)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {getTrendIcon()}
                      <span className="text-white/60 text-sm">
                        {stats.moodTrend === "up"
                          ? "Trending up"
                          : stats.moodTrend === "down"
                          ? "Trending down"
                          : "Holding steady"}
                      </span>
                    </div>
                  </div>

                  {/* Secondary stats */}
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    {/* Best Day */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-400" />
                        <span className="text-white/60 text-xs">Best Day</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.bestDay?.rating}/10</p>
                      <p className="text-white/50 text-xs mt-1">
                        {stats.bestDay ? format(parseISO(stats.bestDay.date), "EEE, MMM d") : "-"}
                      </p>
                    </div>

                    {/* Mood Stability */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-white/60 text-xs">Stability</span>
                      </div>
                      <p className="text-2xl font-bold">{getStabilityLabel(stats.moodStability)}</p>
                      <p className="text-white/50 text-xs mt-1">
                        Variance: {stats.moodStability}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 text-center">
                    <p className="text-white/30 text-xs">
                      {stats.totalEntries} {stats.totalEntries === 1 ? "entry" : "entries"} this week
                    </p>
                  </div>

                  {/* App branding */}
                  <div className="mt-4 text-center">
                    <p className="text-white/20 text-xs font-medium tracking-wide">
                      harroz
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Export button */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex gap-3"
            >
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 bg-white text-black hover:bg-white/90 font-medium"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Share to Stories
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WeeklyRecap;
