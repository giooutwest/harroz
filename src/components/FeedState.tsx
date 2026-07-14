import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeedEntry {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  rating: number;
  video_url: string;
  thumbnail_url: string;
  created_at: string;
  transcript?: string;
}

interface FeedStateProps {
  currentUserId: string;
  onOpenProfile: () => void;
}

function getRatingColor(r: number): string {
  const colors = [
    "#A8523F", "#AD5C42", "#B26647", "#B4744C", "#B08255",
    "#A38F5E", "#909A66", "#7CA26C", "#6B9670", "#5E8A6A",
  ];
  return colors[Math.min(Math.max(r, 1), 10) - 1];
}

const VideoCard = ({ entry, isActive }: { entry: FeedEntry; isActive: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      v.pause();
      v.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

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

  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="snap-item"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
        flexShrink: 0,
      }}
      onClick={togglePlay}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={entry.video_url}
        poster={entry.thumbnail_url}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        playsInline
        loop
        preload="metadata"
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

      {/* User info dialog box (bottom-left) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 16,
          zIndex: 3,
          maxWidth: "70%",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            background: "rgba(20,17,14,0.55)",
            backdropFilter: "blur(8px)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "10px 14px",
            maxWidth: 240,
          }}
        >
          <div className="font-journal-display" style={{ fontWeight: 600, fontSize: 15, color: "#fff", marginBottom: 2 }}>
            {entry.display_name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
            {dateStr} · {timeStr}
          </div>
          {entry.transcript && (
            <button
              className="journal-btn"
              style={{
                fontSize: 11,
                height: 24,
                padding: "0 10px",
                background: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
                color: "#fff",
              }}
              onClick={() => setShowTranscript(s => !s)}
            >
              {showTranscript ? "Hide" : "Transcript"}
            </button>
          )}
          {showTranscript && entry.transcript && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                fontSize: 12,
                maxHeight: 100,
                overflowY: "auto",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                maxWidth: 220,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              {entry.transcript}
            </div>
          )}
        </div>
      </div>

      {/* Rating badge (right side) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          zIndex: 3,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: getRatingColor(entry.rating),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          <span className="font-journal-display" style={{ color: "#fff", fontSize: 20, fontWeight: 600, lineHeight: 1 }}>
            {entry.rating}
          </span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 9 }}>/ 10</span>
        </div>
      </div>
    </div>
  );
};

const FeedState = ({ currentUserId, onOpenProfile }: FeedStateProps) => {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeed();
  }, [currentUserId]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      // Get friend IDs
      const { data: friendships } = await (supabase as any)
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      const friendIds: string[] = (friendships || []).map((f: any) =>
        f.requester_id === currentUserId ? f.addressee_id : f.requester_id
      );

      // Include self + friends
      const allIds = [currentUserId, ...friendIds];

      // Get today's entries from everyone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: videoEntries } = await (supabase as any)
        .from("video_entries")
        .select(`
          id, user_id, rating, video_url, thumbnail_url, created_at, transcript,
          profiles!inner(display_name, username)
        `)
        .in("user_id", allIds)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      const mapped: FeedEntry[] = (videoEntries || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        display_name: e.profiles?.display_name ?? "Unknown",
        username: e.profiles?.username ?? "unknown",
        rating: e.rating,
        video_url: e.video_url,
        thumbnail_url: e.thumbnail_url,
        created_at: e.created_at,
        transcript: e.transcript,
      }));

      setEntries(mapped);
    } catch (err) {
      console.error("Feed load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(idx);
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(var(--paper))",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="journal-card" style={{ padding: "20px 28px", alignItems: "center" }}>
          <div className="journal-progress-bar" style={{ width: 180, height: 4 }} />
          <div style={{ marginTop: 12, fontSize: 13, textAlign: "center", color: "hsl(var(--ink-soft))" }}>
            Fetching today's entries...
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(var(--paper))",
          padding: 24,
        }}
      >
        <div className="journal-card" style={{ width: "100%", maxWidth: 300, padding: 28, textAlign: "center" }}>
          <div className="font-journal-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Nothing here yet
          </div>
          <p style={{ fontSize: 13, color: "hsl(var(--ink-soft))", marginBottom: 16, lineHeight: 1.5 }}>
            None of your friends have posted today yet. Check back later.
          </p>
          <button className="journal-btn" onClick={loadFeed}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="snap-container"
        onScroll={handleScroll}
        style={{ position: "absolute", inset: 0 }}
      >
        {entries.map((entry, i) => (
          <VideoCard key={entry.id} entry={entry} isActive={i === activeIndex} />
        ))}
      </div>

      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)",
        }}
      >
        <div className="font-journal-display" style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
          Daylog
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Entry counter */}
          <div
            style={{
              padding: "3px 10px",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 999,
            }}
          >
            {activeIndex + 1} / {entries.length}
          </div>

          {/* Profile button */}
          <button
            onClick={onOpenProfile}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Profile & Analytics"
          >
            ⚬
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedState;
