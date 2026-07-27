import { useState, useRef, useEffect } from "react";

interface ReviewStateProps {
  videoUrl: string;
  onRetake: () => void;
  onConfirm: () => void;
}

const ReviewState = ({ videoUrl, onRetake, onConfirm }: ReviewStateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [videoUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <video
        ref={videoRef}
        src={videoUrl}
        onClick={togglePlay}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        playsInline
        loop
      />

      {/* Pause indicator */}
      {!isPlaying && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.2)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 60, opacity: 0.8 }}>▶</span>
        </div>
      )}

      {/* Top label */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.5,
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          Review your entry
        </div>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)",
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
          display: "flex",
          gap: 12,
          zIndex: 5,
        }}
      >
        <button
          className="journal-btn"
          onClick={onRetake}
          style={{
            flex: 1,
            height: 48,
            fontSize: 14,
            background: "rgba(255,255,255,0.1)",
            borderColor: "rgba(255,255,255,0.2)",
            color: "#fff",
          }}
        >
          Retake
        </button>
        <button
          className="journal-btn journal-btn-primary"
          onClick={onConfirm}
          style={{ flex: 1, height: 48, fontSize: 14 }}
        >
          Use this
        </button>
      </div>
    </div>
  );
};

export default ReviewState;
