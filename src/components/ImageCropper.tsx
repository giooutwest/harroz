import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "./ui/slider";

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to the crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

export const ImageCropper = ({
  image,
  onCropComplete,
  onCancel,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropAreaComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-[60] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={onCancel}
            className="p-2 bg-secondary touch-manipulation rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-lg">
            Crop Photo
          </h3>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            size="sm"
          >
            {isProcessing ? "..." : <Check className="w-4 h-4" />}
          </Button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaComplete}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Zoom Controls */}
        <div className="p-4 bg-card border-t border-border safe-area-bottom">
          <div className="flex items-center gap-3 max-w-xs mx-auto">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-center text-muted-foreground mt-2 text-xs">
            Pinch or use slider to zoom
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
