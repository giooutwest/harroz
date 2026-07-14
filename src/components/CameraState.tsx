import { useState, useRef, useEffect, useCallback } from "react";

const MAX_SECONDS = 15;

interface CameraStateProps {
  onRecordingComplete: (videoBlob: Blob, audioBlob: Blob, thumbnailBlob: Blob, videoMime: string, audioMime: string) => void;
}

const CameraState = ({ onRecordingComplete }: CameraStateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbBlobRef = useRef<Blob | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setCameraError("");
    } catch (err) {
      setCameraError("Camera access denied. Please allow camera access and reload.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode, startCamera]);

  const captureThumbnail = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const v = videoRef.current!;
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 480;
      const ctx = canvas.getContext("2d")!;
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0);
      canvas.toBlob(blob => resolve(blob!), "image/jpeg", 0.8);
    });
  };

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    thumbBlobRef.current = await captureThumbnail();
    mediaRecorderRef.current?.stop();
    audioRecorderRef.current?.stop();
    setIsRecording(false);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;

    chunksRef.current = [];
    audioChunksRef.current = [];
    thumbBlobRef.current = null;
    setSeconds(0);

    // Pick MIME types — iOS Safari only supports mp4, not webm
    const videoMime =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" :
      MediaRecorder.isTypeSupported("video/webm")            ? "video/webm" :
      MediaRecorder.isTypeSupported("video/mp4")             ? "video/mp4" :
      "";

    const audioMime =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      MediaRecorder.isTypeSupported("audio/webm")             ? "audio/webm" :
      MediaRecorder.isTypeSupported("audio/mp4")              ? "audio/mp4" :
      "";

    const mrOptions = videoMime ? { mimeType: videoMime } : {};
    const arOptions = audioMime ? { mimeType: audioMime } : {};

    // Video recorder (full stream)
    const mr = new MediaRecorder(streamRef.current, mrOptions);
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorderRef.current = mr;

    // Audio-only recorder (for transcription)
    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    const ar = new MediaRecorder(audioStream, arOptions);
    ar.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    audioRecorderRef.current = ar;

    // Wait for both to stop before firing callback
    const resolvedVideoMime = videoMime || mr.mimeType || "video/mp4";
    const resolvedAudioMime = audioMime || ar.mimeType || "audio/mp4";
    let stopped = 0;
    const checkDone = () => {
      stopped++;
      if (stopped === 2 && thumbBlobRef.current) {
        const videoBlob = new Blob(chunksRef.current, { type: resolvedVideoMime });
        const audioBlob = new Blob(audioChunksRef.current, { type: resolvedAudioMime });
        onRecordingComplete(videoBlob, audioBlob, thumbBlobRef.current, resolvedVideoMime, resolvedAudioMime);
      }
    };

    mr.onstop = checkDone;
    ar.onstop = checkDone;

    mr.start(100);
    ar.start(100);
    setIsRecording(true);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        if (next >= MAX_SECONDS) {
          clearInterval(timerRef.current!);
          captureThumbnail().then(thumb => {
            thumbBlobRef.current = thumb;
            mediaRecorderRef.current?.stop();
            audioRecorderRef.current?.stop();
            setIsRecording(false);
          });
        }
        return next;
      });
    }, 1000);
  }, [isRecording, onRecordingComplete]);

  const toggleFacing = () => {
    if (isRecording) return;
    setFacingMode(f => f === "user" ? "environment" : "user");
    setCameraReady(false);
  };

  const progress = (seconds / MAX_SECONDS) * 100;
  const remaining = MAX_SECONDS - seconds;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Full-screen video mirror */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          objectFit: "cover",
          objectPosition: "center",
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
          background: "#000",
          display: "block",
        }}
        playsInline
        muted
        autoPlay
      />

      {/* Error overlay */}
      {cameraError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            zIndex: 10,
          }}
        >
          <div
            className="journal-card"
            style={{ width: 280 }}
          >
            <div className="journal-header">
              <span>Camera unavailable</span>
            </div>
            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ marginBottom: 14, fontSize: 14, color: "hsl(var(--ink-soft))" }}>{cameraError}</p>
              <button className="journal-btn journal-btn-primary" onClick={() => startCamera(facingMode)}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top HUD: recording indicator + timer */}
      {isRecording && (
        <div
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 0px) + 16px)",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 16px",
            zIndex: 5,
          }}
        >
          {/* REC badge */}
          <div
            style={{
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.5,
              padding: "5px 10px",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="rec-blink" style={{ color: "#C9705C" }}>●</span> REC
          </div>

          {/* Countdown */}
          <div
            style={{
              background: "rgba(0,0,0,0.55)",
              color: remaining <= 5 ? "#D98A78" : "#ffffff",
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 600,
              fontSize: 20,
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {remaining}s
          </div>
        </div>
      )}

      {/* Progress bar (recording) */}
      {isRecording && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 16,
            right: 16,
            height: 5,
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            zIndex: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: remaining <= 5 ? "#C9705C" : "#8FA88F",
              borderRadius: 999,
              transition: "width 0.5s linear",
            }}
          />
        </div>
      )}

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
          alignItems: "flex-end",
          justifyContent: "space-between",
          zIndex: 5,
        }}
      >
        {/* Flip camera */}
        <button
          onClick={toggleFacing}
          disabled={isRecording || !cameraReady}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "50%",
            color: "#fff",
            fontSize: 18,
            width: 44,
            height: 44,
            minWidth: 44,
            padding: 0,
            cursor: isRecording || !cameraReady ? "default" : "pointer",
            opacity: isRecording || !cameraReady ? 0.4 : 1,
          }}
          title="Flip camera"
        >
          ↺
        </button>

        {/* Main RECORD button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!cameraReady}
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: "transparent",
            border: "3px solid #fff",
            cursor: cameraReady ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
          }}
        >
          <span
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              borderRadius: isRecording ? 8 : "50%",
              background: isRecording ? "#C9705C" : "#fff",
              transition: "border-radius 0.15s ease",
            }}
          />
        </button>

        {/* Spacer */}
        <div style={{ width: 44 }} />
      </div>

      {/* Max time label */}
      {!isRecording && cameraReady && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 116px)",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            zIndex: 5,
            letterSpacing: 0.3,
          }}
        >
          Up to {MAX_SECONDS} seconds
        </div>
      )}
    </div>
  );
};

export default CameraState;
