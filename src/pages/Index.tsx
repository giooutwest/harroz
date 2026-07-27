import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CameraState from "@/components/CameraState";
import RatingState, { SelectedSong } from "@/components/RatingState";
import FeedState from "@/components/FeedState";
import ProfileWindow from "@/components/ProfileWindow";

// Matches the existing entry_date convention used when writing video_entries below.
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type AppState = "camera" | "rating" | "feed";

interface RecordingData {
  videoBlob: Blob;
  audioBlob: Blob;
  thumbnailBlob: Blob;
  thumbnailUrl: string;
  videoMime: string;
  audioMime: string;
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
  const [viewDate, setViewDate] = useState<string>(todayDateString());

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

      // Only one entry per day is allowed — skip straight to the feed if today's is already saved
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: todayEntry } = await (supabase as any)
        .from("video_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("entry_date", todayStr)
        .maybeSingle();
      if (todayEntry) {
        setAppState("feed");
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
  const handleRecordingComplete = useCallback((videoBlob: Blob, audioBlob: Blob, thumbnailBlob: Blob, videoMime: string, audioMime: string) => {
    const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
    setRecording({ videoBlob, audioBlob, thumbnailBlob, thumbnailUrl, videoMime, audioMime });
    setAppState("rating");
  }, []);

  // ── Rating → Feed transition (with upload + DB write) ────────────────────────
  const handleRatingSubmit = useCallback(async (rating: number, song: SelectedSong | null) => {
    if (!recording || !profile) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const uid = profile.id;
      const basePath = `${uid}/${dateStr}_${Date.now()}`;
      const videoExt = recording.videoMime.includes("mp4") ? "mp4" : "webm";
      const audioExt = recording.audioMime.includes("mp4") ? "mp4" : "webm";

      // Upload video + audio + thumbnail in parallel
      const [videoUrl, audioUrl, thumbnailUrl] = await Promise.all([
        uploadBlob("videos",     `${basePath}.${videoExt}`, recording.videoBlob,     recording.videoMime),
        uploadBlob("audio",      `${basePath}.${audioExt}`, recording.audioBlob,     recording.audioMime),
        uploadBlob("thumbnails", `${basePath}.jpg`,         recording.thumbnailBlob, "image/jpeg"),
      ]);

      // Insert DB row
      const { error: insertError } = await (supabase as any).from("video_entries").insert({
        user_id: uid,
        rating,
        video_url: videoUrl,
        audio_url: audioUrl,
        thumbnail_url: thumbnailUrl,
        entry_date: now.toISOString().slice(0, 10),
        song_title: song?.title ?? null,
        song_artist: song?.artist ?? null,
        song_preview_url: song?.previewUrl ?? null,
      });

      if (insertError) throw insertError;

      // Revoke the object URL
      URL.revokeObjectURL(recording.thumbnailUrl);
      setRecording(null);

      toast.success("Saved!");
      setViewDate(todayDateString());
      // Transition to feed
      setAppState("feed");
    } catch (err: any) {
      console.error("Submit error:", err);
      if (err?.code === "23505") {
        // Already have an entry for today (e.g. saved from another tab)
        toast.info("You've already saved today's entry. Come back tomorrow!");
        URL.revokeObjectURL(recording.thumbnailUrl);
        setRecording(null);
        setViewDate(todayDateString());
        setAppState("feed");
      } else {
        toast.error("Something went wrong saving your entry. Please try again.");
      }
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
          background: "hsl(var(--paper))",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="font-journal-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, color: "hsl(var(--ink))" }}>
            Daylog
          </div>
          <div className="journal-progress-bar" style={{ width: 160, height: 3 }} />
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
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 15,
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
          viewDate={viewDate}
          onChangeViewDate={setViewDate}
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
          onClick={() => setShowProfile(p => !p)}
          style={{
            position: "fixed",
            bottom: 10,
            left: 10,
            zIndex: 500,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            fontSize: 14,
          }}
          title="Profile & Analytics"
        >
          ⚬
        </button>
      )}

      {/* State indicator dots (camera / rating states) */}
      {appState !== "feed" && (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 10px)",
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
                width: 6,
                height: 6,
                borderRadius: "50%",
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
