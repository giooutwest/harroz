import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CameraState from "@/components/CameraState";
import RatingState from "@/components/RatingState";
import FeedState from "@/components/FeedState";
import ProfileWindow from "@/components/ProfileWindow";

type AppState = "camera" | "rating" | "feed";

interface RecordingData {
  videoBlob: Blob;
  audioBlob: Blob;
  thumbnailBlob: Blob;
  thumbnailUrl: string; // local object URL for display
}

interface UserProfile {
  id: string;
  display_name: string;
  username: string;
}

// Upload a blob to a Supabase Storage bucket, return public URL
async function uploadBlob(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

const Index = () => {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState>("camera");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      loadProfile(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        setAuthLoading(false);
        return;
      }
      loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setProfile({ id: userId, display_name: data.display_name ?? "User", username: data.username ?? "user" });
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // ── Camera → Rating transition ───────────────────────────────────────────────
  const handleRecordingComplete = useCallback((videoBlob: Blob, audioBlob: Blob, thumbnailBlob: Blob) => {
    const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
    setRecording({ videoBlob, audioBlob, thumbnailBlob, thumbnailUrl });
    setAppState("rating");
  }, []);

  // ── Rating → Feed transition (with upload + DB write) ────────────────────────
  const handleRatingSubmit = useCallback(async (rating: number) => {
    if (!recording || !profile) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const uid = profile.id;
      const basePath = `${uid}/${dateStr}_${Date.now()}`;

      // Upload video + audio + thumbnail in parallel
      const [videoUrl, audioUrl, thumbnailUrl] = await Promise.all([
        uploadBlob("videos", `${basePath}.webm`, recording.videoBlob, "video/webm"),
        uploadBlob("audio", `${basePath}.webm`, recording.audioBlob, "audio/webm"),
        uploadBlob("thumbnails", `${basePath}.jpg`, recording.thumbnailBlob, "image/jpeg"),
      ]);

      // Insert DB row
      await (supabase as any).from("video_entries").insert({
        user_id: uid,
        rating,
        video_url: videoUrl,
        audio_url: audioUrl,
        thumbnail_url: thumbnailUrl,
        entry_date: now.toISOString().slice(0, 10),
      });

      // Revoke the object URL
      URL.revokeObjectURL(recording.thumbnailUrl);
      setRecording(null);

      // Transition to feed
      setAppState("feed");
    } catch (err: any) {
      console.error("Submit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [recording, profile]);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#008080",
          fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
          fontSize: 11,
        }}
      >
        <div className="win98-window" style={{ width: 260 }}>
          <div className="win98-titlebar">
            <span>📹</span>
            <span>DayLog 98 — Starting Up</span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="win98-progress-bar" style={{ width: "100%", height: 18, marginBottom: 8 }} />
            <div style={{ textAlign: "center", fontSize: 11 }}>Please wait...</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main app shell ──────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100dvh",
        background: "#000",
        overflow: "hidden",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
      }}
    >
      {/* STATE: Camera */}
      {appState === "camera" && (
        <CameraState onRecordingComplete={handleRecordingComplete} />
      )}

      {/* STATE: Rating */}
      {appState === "rating" && recording && (
        <RatingState
          thumbnailUrl={recording.thumbnailUrl}
          onSubmit={handleRatingSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* STATE: Feed */}
      {appState === "feed" && profile && (
        <FeedState
          currentUserId={profile.id}
          onOpenProfile={() => setShowProfile(true)}
        />
      )}

      {/* Floating Profile / Start Menu window */}
      {showProfile && profile && (
        <ProfileWindow
          userId={profile.id}
          displayName={profile.display_name}
          username={profile.username}
          onClose={() => setShowProfile(false)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Global Start button (visible in camera + rating states) */}
      {appState !== "feed" && profile && (
        <button
          className="win98-btn"
          onClick={() => setShowProfile(p => !p)}
          style={{
            position: "fixed",
            bottom: 6,
            left: 6,
            zIndex: 500,
            fontFamily: "'VT323', monospace",
            fontSize: 14,
            height: 24,
            padding: "0 10px",
            background: "rgba(192,192,192,0.92)",
          }}
          title="Profile & Analytics"
        >
          🪟 Start
        </button>
      )}

      {/* State indicator dots (camera / rating states) */}
      {appState !== "feed" && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            zIndex: 500,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          {(["camera", "rating", "feed"] as AppState[]).map(s => (
            <div
              key={s}
              style={{
                width: 8,
                height: 8,
                background: appState === s ? "#ffffff" : "rgba(255,255,255,0.3)",
                boxShadow: appState === s ? "0 0 4px #fff" : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
