import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music } from "lucide-react";

interface MusicPlayerProps {
  songTitle: string;
  songArtist: string;
  previewUrl: string | null;
}

const MusicPlayer = ({ songTitle, songArtist, previewUrl }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create audio element
    if (previewUrl) {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(pct);
        }
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [previewUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const displayText = `${songArtist} - ${songTitle}`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/50">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={!previewUrl}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          previewUrl
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Marquee Text */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center gap-2">
          <Music className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className="overflow-hidden flex-1">
            <motion.div
              ref={marqueeRef}
              className="whitespace-nowrap text-sm text-foreground"
              animate={
                isPlaying
                  ? {
                      x: ["0%", "-50%"],
                    }
                  : { x: "0%" }
              }
              transition={
                isPlaying
                  ? {
                      x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: Math.max(displayText.length * 0.2, 5),
                        ease: "linear",
                      },
                    }
                  : {}
              }
            >
              <span>{displayText}</span>
              {isPlaying && (
                <>
                  <span className="mx-8">•</span>
                  <span>{displayText}</span>
                </>
              )}
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayer;
