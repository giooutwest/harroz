import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RotateCcw, Check, ZoomIn, ZoomOut } from "lucide-react";

interface MoodCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBlob: Blob, previewUrl: string) => void;
}

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

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

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame as-is (no flip - photo appears as taken)
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);

    // Convert to blob for upload
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
      }
    }, "image/jpeg", 0.9);

    // Stop camera after capturing
    stopCamera();
    setIsCapturing(false);
  }, []);

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  };

  const switchCamera = () => {
    stopCamera();
    setZoom(1);
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleConfirm = () => {
    if (capturedImage && capturedBlob) {
      onCapture(capturedBlob, capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCapturedBlob(null);
    setError(null);
    onClose();
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
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={handleClose}
            className="p-2 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-white text-lg">
            Take a Photo
          </h2>
          <div className="w-10" />
        </div>

        {/* Camera/Preview */}
        <div className="flex-1 relative bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <p className="text-white/70">{error}</p>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
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
          {capturedImage ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Action buttons */}
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
                  <span>Use Photo</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-8">
              {/* Switch camera */}
              <button
                onClick={switchCamera}
                className="p-4 bg-white/10 text-white rounded-full"
              >
                <RotateCcw className="w-6 h-6" />
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

              {/* Spacer for symmetry */}
              <div className="w-14 h-14" />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoodCamera;
