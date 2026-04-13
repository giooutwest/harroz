import { useState, useRef, useEffect, useCallback } from "react";

const MAX_SECONDS = 15;

interface CameraStateProps {
  onRecordingComplete: (videoBlob: Blob, audioBlob: Blob, thumbnailBlob: Blob) => void;
}

const CameraState = ({ onRecordingComplete }: CameraStateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      canvas.getContext("2d")!.drawImage(v, 0, 0);
      canvas.toBlob(blob => resolve(blob!), "image/jpeg", 0.8);
    });
  };

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const thumbBlob = await captureThumbnail();

    mediaRecorderRef.current?.stop();
    audioRecorderRef.current?.stop();
    setIsRecording(false);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;

    chunksRef.current = [];
    audioChunksRef.current = [];
    setSeconds(0);

    // Video recorder (full stream)
    const videoMime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const mr = new MediaRecorder(streamRef.current, { mimeType: videoMime });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorderRef.current = mr;

    // Audio-only recorder (for transcription)
    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    const audioMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const ar = new MediaRecorder(audioStream, { mimeType: audioMime });
    ar.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    audioRecorderRef.current = ar;

    // Wait for both to stop before firing callback
    let stopped = 0;
    let thumbBlobFinal: Blob | null = null;
    const checkDone = () => {
      stopped++;
      if (stopped === 2 && thumbBlobFinal) {
        const videoBlob = new Blob(chunksRef.current, { type: videoMime });
        const audioBlob = new Blob(audioChunksRef.current, { type: audioMime });
        onRecordingComplete(videoBlob, audioBlob, thumbBlobFinal);
      }
    };

    mr.onstop = checkDone;
    ar.onstop = checkDone;

    // Capture thumbnail at end
    const thumbCapture = async () => {
      thumbBlobFinal = await captureThumbnail();
    };

    mr.start(100);
    ar.start(100);
    setIsRecording(true);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        if (next >= MAX_SECONDS) {
          clearInterval(timerRef.current!);
          thumbCapture().then(() => {
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
            className="win98-window"
            style={{ width: 280, padding: "0" }}
          >
            <div className="win98-titlebar">
              <span>⚠️ Camera Error</span>
            </div>
            <div style={{ padding: 16, textAlign: "center" }}>
              <p style={{ marginBottom: 12, fontSize: 11 }}>{cameraError}</p>
              <button className="win98-btn" onClick={() => startCamera(facingMode)}>
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
              background: "#cc0000",
              color: "#fff",
              fontFamily: "'VT323', monospace",
              fontSize: 20,
              padding: "2px 8px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="rec-blink">●</span> REC
          </div>

          {/* Countdown */}
          <div
            style={{
              background: "rgba(0,0,0,0.7)",
              color: remaining <= 5 ? "#ff4444" : "#ffffff",
              fontFamily: "'VT323', monospace",
              fontSize: 28,
              padding: "2px 10px",
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
            height: 8,
            background: "rgba(0,0,0,0.5)",
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: remaining <= 5 ? "#ff4444" : "#00cc00",
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
          className="win98-btn"
          style={{
            background: "rgba(192,192,192,0.9)",
            fontSize: 20,
            width: 44,
            height: 44,
            minWidth: 44,
            padding: 0,
          }}
          title="Flip camera"
        >
          🔄
        </button>

        {/* Main RECORD button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!cameraReady}
          style={{
            width: 80,
            height: 80,
            background: isRecording ? "#cc0000" : "#C0C0C0",
            border: "none",
            cursor: cameraReady ? "pointer" : "not-allowed",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            boxShadow: isRecording
              ? "inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080"
              : "inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf",
          }}
        >
          <span style={{ fontSize: 28 }}>{isRecording ? "⏹" : "⏺"}</span>
          <span
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: 14,
              color: isRecording ? "#ffffff" : "#000000",
              letterSpacing: 1,
            }}
          >
            {isRecording ? "STOP" : "RECORD"}
          </span>
        </button>

        {/* Spacer */}
        <div style={{ width: 44 }} />
      </div>

      {/* Max time label */}
      {!isRecording && cameraReady && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'VT323', monospace",
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
            zIndex: 5,
            letterSpacing: 1,
          }}
        >
          MAX {MAX_SECONDS} SECONDS
        </div>
      )}
    </div>
  );
};

export default CameraState;
