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
    "#cc0000", "#dd2200", "#dd4400", "#cc7700", "#bbaa00",
    "#88bb00", "#55aa00", "#229900", "#008800", "#006600",
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
          className="win98-window"
          style={{ padding: 0 }}
        >
          <div
            className="win98-titlebar"
            style={{ height: 18, fontSize: 10, padding: "1px 4px" }}
          >
            <span>👤 {entry.username}</span>
          </div>
          <div style={{ padding: "6px 10px 8px", background: "#C0C0C0" }}>
            <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 2 }}>
              {entry.display_name}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>
              {dateStr} · {timeStr}
            </div>
            {entry.transcript && (
              <button
                className="win98-btn"
                style={{ fontSize: 10, minWidth: 60, height: 18, padding: "0 6px" }}
                onClick={() => setShowTranscript(s => !s)}
              >
                {showTranscript ? "▲ Hide" : "▼ Transcript"}
              </button>
            )}
            {showTranscript && entry.transcript && (
              <div
                className="win98-sunken"
                style={{
                  marginTop: 6,
                  padding: "4px 6px",
                  fontSize: 10,
                  maxHeight: 80,
                  overflowY: "auto",
                  background: "#ffffff",
                  maxWidth: 220,
                  lineHeight: 1.4,
                }}
              >
                {entry.transcript}
              </div>
            )}
          </div>
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
          className="win98-window"
          style={{ padding: 0, width: 64 }}
        >
          <div
            className="win98-titlebar"
            style={{ height: 18, fontSize: 9, padding: "1px 4px", justifyContent: "center" }}
          >
            DAY SCORE
          </div>
          <div
            style={{
              background: getRatingColor(entry.rating),
              color: "#ffffff",
              fontFamily: "'VT323', monospace",
              fontSize: 40,
              lineHeight: 1,
              textAlign: "center",
              padding: "4px 0",
            }}
          >
            {entry.rating}
            <div style={{ fontSize: 12 }}>/ 10</div>
          </div>
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
          background: "#C0C0C0",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="win98-window" style={{ padding: "16px 24px" }}>
          <div className="win98-titlebar">📡 DayLog 98 — Loading Feed...</div>
          <div style={{ padding: 12 }}>
            <div className="win98-progress-bar" style={{ width: 200, height: 18 }} />
            <div style={{ marginTop: 8, fontSize: 11, textAlign: "center" }}>
              Fetching today's entries...
            </div>
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
          background: "#C0C0C0",
          padding: 24,
        }}
      >
        <div className="win98-window" style={{ width: "100%", maxWidth: 300 }}>
          <div className="win98-titlebar">📭 No Entries Today</div>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 11, marginBottom: 12 }}>
              None of your friends have posted today yet.<br />
              Check back later!
            </p>
            <button className="win98-btn" onClick={loadFeed}>
              🔄 Refresh
            </button>
          </div>
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
        className="win98-taskbar"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          justifyContent: "space-between",
          background: "rgba(192,192,192,0.95)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'VT323', monospace", fontSize: 16 }}>
          <span>📹</span>
          <span>DAYLOG 98</span>
          <span style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif', fontSize: 10, color: "#444" }}>
            — Friends Feed
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Entry counter */}
          <div
            className="win98-sunken"
            style={{ padding: "1px 6px", fontSize: 10, background: "#fff" }}
          >
            {activeIndex + 1} / {entries.length}
          </div>

          {/* Profile / Start button */}
          <button
            className="win98-btn"
            onClick={onOpenProfile}
            style={{ fontSize: 12, padding: "2px 8px", height: 22, minWidth: 0 }}
            title="Profile & Analytics"
          >
            🪟 Start
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedState;
