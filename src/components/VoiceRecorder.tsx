import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause, Trash2, Send, X } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isPixelTheme?: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceRecorder = ({ onSend, onCancel, isPixelTheme = false }: VoiceRecorderProps) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioUrl,
    audioBlob,
    waveformData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error
  } = useVoiceRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const borderRadius = isPixelTheme ? "0" : undefined;

  // Start recording immediately when component mounts
  useEffect(() => {
    startRecording();
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
    }
  };

  const handleDiscard = () => {
    clearRecording();
    onCancel();
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-xl">
        <span className={`text-destructive ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
          {error}
        </span>
        <button onClick={onCancel} className="p-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`flex items-center gap-3 p-3 bg-card border border-border ${isPixelTheme ? "" : "rounded-xl"}`}
      style={{ borderRadius }}
    >
      {isRecording && !audioUrl ? (
        <>
          {/* Recording state */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />

          {/* Waveform visualization */}
          <div className="flex-1 h-10 flex items-center gap-0.5 overflow-hidden">
            {waveformData.length > 0 ? (
              waveformData.map((value, index) => (
                <motion.div
                  key={index}
                  className="w-1 bg-primary rounded-full"
                  style={{ height: `${Math.max(4, value * 40)}px` }}
                  initial={{ height: 4 }}
                  animate={{ height: `${Math.max(4, value * 40)}px` }}
                  transition={{ duration: 0.1 }}
                />
              ))
            ) : (
              // Static bars while initializing
              Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-muted-foreground/30 rounded-full"
                />
              ))
            )}
          </div>

          {/* Duration */}
          <span className={`font-mono text-foreground min-w-[45px] ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
            {formatDuration(duration)}
          </span>

          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className={`p-2 bg-secondary hover:bg-secondary/80 transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Stop */}
          <button
            onClick={stopRecording}
            className={`p-2 bg-red-500 text-white hover:bg-red-600 transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Cancel */}
          <button
            onClick={handleDiscard}
            className={`p-2 text-muted-foreground hover:text-foreground transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : audioUrl ? (
        <>
          {/* Playback state */}
          <button
            onClick={handlePlayPause}
            className={`p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Static waveform preview */}
          <div className="flex-1 h-8 flex items-center gap-0.5 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full ${isPlaying ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                style={{ height: `${Math.random() * 24 + 8}px` }}
              />
            ))}
          </div>

          {/* Duration */}
          <span className={`font-mono text-foreground min-w-[45px] ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
            {formatDuration(duration)}
          </span>

          {/* Discard */}
          <button
            onClick={handleDiscard}
            className={`p-2 text-destructive hover:text-destructive/80 transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            className={`p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${isPixelTheme ? "" : "rounded-full"}`}
            style={{ borderRadius }}
          >
            <Send className="w-4 h-4" />
          </button>
        </>
      ) : null}
    </motion.div>
  );
};

export default VoiceRecorder;
