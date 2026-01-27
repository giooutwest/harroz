import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  isMine: boolean;
  isPixelTheme?: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceMessage = ({ audioUrl, duration, isMine, isPixelTheme = false }: VoiceMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audioUrl);

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    audioRef.current.onloadedmetadata = () => {
      // Duration is already provided, but we could use this as fallback
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      // Update progress
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration || duration;
          setProgress((current / total) * 100);
          setCurrentTime(Math.floor(current));
        }
      }, 100);
    }
  };

  // Generate waveform bars (static visualization)
  const waveformBars = Array.from({ length: 25 }, (_, i) => {
    const height = Math.sin((i / 25) * Math.PI) * 0.6 + Math.random() * 0.4;
    return Math.max(0.2, height);
  });

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center ${
          isMine ? "bg-primary-foreground/20" : "bg-primary/20"
        } ${isPixelTheme ? "" : "rounded-full"}`}
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isMine ? "text-primary-foreground" : "text-primary"}`} />
        ) : (
          <Play className={`w-4 h-4 ${isMine ? "text-primary-foreground" : "text-primary"}`} />
        )}
      </button>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-0.5 h-8 relative">
        {waveformBars.map((height, index) => {
          const isActive = (index / waveformBars.length) * 100 <= progress;
          return (
            <motion.div
              key={index}
              className={`w-1 rounded-full transition-colors ${
                isActive
                  ? isMine
                    ? "bg-primary-foreground"
                    : "bg-primary"
                  : isMine
                  ? "bg-primary-foreground/40"
                  : "bg-muted-foreground/40"
              }`}
              style={{ height: `${height * 28}px` }}
              animate={isPlaying && isActive ? { scaleY: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.2, repeat: isPlaying ? Infinity : 0 }}
            />
          );
        })}
      </div>

      {/* Duration/Time */}
      <span
        className={`text-[10px] font-mono min-w-[35px] text-right ${
          isMine ? "text-primary-foreground/70" : "text-muted-foreground"
        }`}
      >
        {isPlaying ? formatDuration(currentTime) : formatDuration(duration)}
      </span>
    </div>
  );
};

export default VoiceMessage;
