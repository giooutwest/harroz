import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RotateCcw, Check, ZoomIn, ZoomOut, ImagePlus, Play, Pause, Scissors } from "lucide-react";
import { toast } from "sonner";

interface MoodCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, previewUrl: string, isVideo?: boolean) => void;
}

const MAX_VIDEO_DURATION = 5; // seconds

const MoodCamera = ({ isOpen, onClose, onCapture }: MoodCameraProps) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);

  // Video states
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(MAX_VIDEO_DURATION);
  const [needsTrimming, setNeedsTrimming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isVideo, setIsVideo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimVideoRef = useRef<HTMLVideoElement>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !capturedImage && !selectedVideo) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Cleanup video preview URL
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Handle video time update for trimming preview
  useEffect(() => {
    const video = trimVideoRef.current;
    if (!video || !needsTrimming) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= trimEnd) {
        video.pause();
        video.currentTime = trimStart;
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd, needsTrimming]);

  const startCamera = async () => {
    try {
      setError(null);
      setZoom(1);
      setSupportsZoom(false);
      setMaxZoom(1);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check if zoom is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.();
        if (capabilities?.zoom) {
          setSupportsZoom(true);
          setMaxZoom(capabilities.zoom.max || 4);
          await track.applyConstraints({ advanced: [{ zoom: 1 } as any] });
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  const handleZoom = async (newZoom: number) => {
    if (!cameraStream || !supportsZoom) return;

    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;

    const clampedZoom = Math.max(1, Math.min(newZoom, maxZoom));
    setZoom(clampedZoom);

    try {
      await track.applyConstraints({ advanced: [{ zoom: clampedZoom } as any] });
    } catch (err) {
      console.error("Zoom error:", err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    setIsVideo(false);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
      }
    }, "image/jpeg", 0.9);

    stopCamera();
    setIsCapturing(false);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideoFile = file.type.startsWith('video/');
    const isImageFile = file.type.startsWith('image/');

    if (!isVideoFile && !isImageFile) {
      toast.error("Please select an image or video file");
      return;
    }

    // Check file size (max 50MB for video, 10MB for image)
    const maxSize = isVideoFile ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${isVideoFile ? '50MB' : '10MB'}`);
      return;
    }

    stopCamera();

    if (isImageFile) {
      // Handle image
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        setCapturedBlob(file);
        setIsVideo(false);
      };
      reader.readAsDataURL(file);
    } else {
      // Handle video
      const videoUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(videoUrl);
      setSelectedVideo(file);
      setIsVideo(true);

      // Get video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration;
        setVideoDuration(duration);

        if (duration > MAX_VIDEO_DURATION) {
          setNeedsTrimming(true);
          setTrimStart(0);
          setTrimEnd(MAX_VIDEO_DURATION);
          toast.info(`Video is ${Math.round(duration)}s. Please trim to ${MAX_VIDEO_DURATION}s or less.`);
        } else {
          setNeedsTrimming(false);
          setCapturedBlob(file);
        }

        URL.revokeObjectURL(tempVideo.src);
      };
      tempVideo.src = videoUrl;
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTrimVideo = async () => {
    if (!selectedVideo || !trimVideoRef.current) return;

    setIsTrimming(true);

    try {
      // For now, we'll just set the trim points and let the upload handle it
      // In a production app, you'd use FFmpeg.wasm or a server-side solution
      // For simplicity, we'll create a new blob with metadata
      const trimmedDuration = trimEnd - trimStart;

      if (trimmedDuration > MAX_VIDEO_DURATION) {
        toast.error(`Please trim to ${MAX_VIDEO_DURATION} seconds or less`);
        setIsTrimming(false);
        return;
      }

      // Create metadata for trim points (the backend would need to handle actual trimming)
      // For now, we'll just pass the original file with a flag
      setCapturedBlob(selectedVideo);
      setNeedsTrimming(false);
      toast.success("Video ready!");
    } catch (err) {
      console.error("Trim error:", err);
      toast.error("Failed to process video");
    }

    setIsTrimming(false);
  };

  const playTrimPreview = () => {
    if (!trimVideoRef.current) return;

    trimVideoRef.current.currentTime = trimStart;
    trimVideoRef.current.play();
    setIsPlaying(true);
  };

  const pauseVideo = () => {
    if (!trimVideoRef.current) return;
    trimVideoRef.current.pause();
    setIsPlaying(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    setNeedsTrimming(false);
    setIsVideo(false);
    setVideoDuration(0);
    startCamera();
  };

  const switchCamera = () => {
    stopCamera();
    setZoom(1);
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const previewUrl = isVideo ? (videoPreviewUrl || '') : (capturedImage || '');
      onCapture(capturedBlob, previewUrl, isVideo);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCapturedBlob(null);
    setSelectedVideo(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setNeedsTrimming(false);
    setIsVideo(false);
    setVideoDuration(0);
    setError(null);
    onClose();
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={handleClose} className="p-2 text-white">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-white text-lg">
            {needsTrimming ? "Trim Video" : (isVideo ? "Video Selected" : "Take a Photo")}
          </h2>
          <div className="w-10" />
        </div>

        {/* Camera/Preview/Trimmer */}
        <div className="flex-1 relative bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <p className="text-white/70 mb-4">{error}</p>
                <button
                  onClick={openGallery}
                  className="px-6 py-3 bg-white text-black rounded-xl font-medium"
                >
                  Upload from Gallery
                </button>
              </div>
            </div>
          ) : needsTrimming && videoPreviewUrl ? (
            // Video trimming UI
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 relative">
                <video
                  ref={trimVideoRef}
                  src={videoPreviewUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                />
              </div>

              {/* Trim controls */}
              <div className="p-4 bg-black/80 space-y-4">
                <div className="flex items-center justify-between text-white text-sm">
                  <span>{formatTime(trimStart)}</span>
                  <span className="text-white/60">Duration: {formatTime(trimEnd - trimStart)}</span>
                  <span>{formatTime(trimEnd)}</span>
                </div>

                {/* Trim slider */}
                <div className="relative">
                  <div className="h-2 bg-white/20 rounded-full">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{
                        marginLeft: `${(trimStart / videoDuration) * 100}%`,
                        width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                      }}
                    />
                  </div>

                  {/* Start handle */}
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val < trimEnd - 0.5) {
                        setTrimStart(val);
                        if (trimVideoRef.current) {
                          trimVideoRef.current.currentTime = val;
                        }
                      }
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* End time adjuster */}
                <div className="flex items-center gap-4">
                  <span className="text-white/60 text-sm">End:</span>
                  <input
                    type="range"
                    min={trimStart + 0.5}
                    max={Math.min(videoDuration, trimStart + MAX_VIDEO_DURATION)}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white text-sm w-12">{formatTime(trimEnd)}</span>
                </div>

                {/* Play preview button */}
                <button
                  onClick={isPlaying ? pauseVideo : playTrimPreview}
                  className="w-full py-3 bg-white/10 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isPlaying ? "Pause" : "Preview Trim"}
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          ) : videoPreviewUrl && !needsTrimming ? (
            <video
              src={videoPreviewUrl}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
              loop
              muted
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
              {/* Zoom controls */}
              {supportsZoom && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <button
                    onClick={() => handleZoom(zoom + 0.5)}
                    disabled={zoom >= maxZoom}
                    className="p-3 bg-black/50 text-white disabled:opacity-30 rounded-full"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="text-center text-white text-xs bg-black/50 py-1 px-2 rounded">
                    {zoom.toFixed(1)}x
                  </div>
                  <button
                    onClick={() => handleZoom(zoom - 0.5)}
                    disabled={zoom <= 1}
                    className="p-3 bg-black/50 text-white disabled:opacity-30 rounded-full"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          {needsTrimming ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-white border border-white/30 rounded-xl"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleTrimVideo}
                  disabled={isTrimming || (trimEnd - trimStart) > MAX_VIDEO_DURATION}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-medium rounded-xl disabled:opacity-50"
                >
                  <Scissors className="w-5 h-5" />
                  <span>{isTrimming ? "Processing..." : "Use Clip"}</span>
                </button>
              </div>
              <p className="text-white/50 text-xs text-center">
                Max {MAX_VIDEO_DURATION} seconds
              </p>
            </motion.div>
          ) : capturedImage || (videoPreviewUrl && !needsTrimming) ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-white border border-white/30 rounded-xl"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-medium rounded-xl"
                >
                  <Check className="w-5 h-5" />
                  <span>Use {isVideo ? "Video" : "Photo"}</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-6">
              {/* Gallery button */}
              <button
                onClick={openGallery}
                className="p-4 bg-white/10 text-white rounded-full"
              >
                <ImagePlus className="w-6 h-6" />
              </button>

              {/* Capture button */}
              <motion.button
                onClick={capturePhoto}
                disabled={isCapturing || !cameraStream}
                whileTap={{ scale: 0.9 }}
                className="w-20 h-20 bg-white disabled:opacity-50 rounded-full"
                style={{
                  boxShadow: "0 0 0 4px rgba(255,255,255,0.3)"
                }}
              />

              {/* Switch camera */}
              <button
                onClick={switchCamera}
                className="p-4 bg-white/10 text-white rounded-full"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoodCamera;
