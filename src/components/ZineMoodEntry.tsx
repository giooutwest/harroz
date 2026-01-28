import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ZineMoodEntryProps {
  onSubmit: (rating: number, photo: File | null, caption: string) => void;
  isUploading: boolean;
}

const ZineMoodEntry = ({ onSubmit, isUploading }: ZineMoodEntryProps) => {
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map 1-10 to 1-6 for display, but keep internal rating
  const displayRating = Math.ceil(rating / 2);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!photo) return;
    onSubmit(rating, photo, caption);
  };

  // Get current time
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full bg-black px-4 py-6 overflow-hidden">
      {/* Time - vertical text on left */}
      <div
        className="absolute left-4 top-6 text-[10px] tracking-[0.2em] text-white/60 uppercase"
        style={{
          fontFamily: "'Space Mono', monospace",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: "rotate(180deg)"
        }}
      >
        Time: {timeStr}
      </div>

      {/* Asterisk decoration */}
      <div className="absolute right-6 top-6">
        <span
          className="text-3xl text-[#E040FB]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          *
        </span>
      </div>

      {/* Main content */}
      <div className="ml-8 mr-4 pt-8">
        {/* Thoughts label */}
        <div
          className="text-[10px] tracking-[0.15em] text-white/50 uppercase mb-4"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Thoughts:
        </div>

        {/* Caption input */}
        <Input
          type="text"
          placeholder="what's on your mind..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          className="bg-transparent border-none text-white/70 placeholder:text-white/30 text-sm mb-4 px-0 focus-visible:ring-0"
          style={{ fontFamily: "'Space Mono', monospace" }}
        />

        {/* Photo upload area with corner brackets */}
        <div className="relative">
          {/* Corner brackets - magenta */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[#E040FB]" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-[#E040FB]" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-[#E040FB]" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-[#E040FB]" />

          {/* Photo area */}
          <div
            className="relative aspect-square overflow-hidden cursor-pointer"
            onClick={() => !photoPreview && fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <div className="relative w-full h-full">
                <img
                  src={photoPreview}
                  alt="Selected"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto();
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 50%, #E8B5A0 100%)"
                }}
              >
                <Plus className="w-10 h-10 text-white mb-2" strokeWidth={1.5} />
                <span
                  className="text-xs tracking-[0.1em] text-white/90 uppercase"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Upload_Moment
                </span>
              </div>
            )}
          </div>

          {/* SAVE glitch text - positioned to the right */}
          <motion.button
            onClick={handleSubmit}
            disabled={!photo || isUploading}
            whileTap={{ scale: 0.95 }}
            className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-full disabled:opacity-30"
          >
            <div className="relative">
              <span
                className="absolute text-2xl font-bold text-[#E040FB]/50 uppercase italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  transform: "translate(-2px, -2px)"
                }}
              >
                Save
              </span>
              <span
                className="absolute text-2xl font-bold text-[#E040FB]/70 uppercase italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  transform: "translate(-1px, -1px)"
                }}
              >
                Save
              </span>
              <span
                className="relative text-2xl font-bold text-[#E040FB] uppercase italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {isUploading ? "..." : "Save"}
              </span>
            </div>
          </motion.button>
        </div>

        {/* Version text - vertical on left */}
        <div
          className="absolute left-4 bottom-32 text-[8px] tracking-[0.15em] text-white/30 uppercase"
          style={{
            fontFamily: "'Space Mono', monospace",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)"
          }}
        >
          Mood_Log_V.2.0
        </div>

        {/* Mood rating selector - organic blob shapes */}
        <div className="mt-8 flex items-end justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((num, index) => {
            // Convert display number to actual rating (1-10 scale)
            const actualRating = num * 2 - 1;
            const isSelected = displayRating === num;

            // Vary the blob shapes slightly
            const transforms = [
              "rotate(-5deg) scale(1, 0.95)",
              "rotate(3deg) scale(0.95, 1)",
              "rotate(-2deg) scale(1.05, 0.9)",
              "rotate(4deg) scale(0.9, 1.05)",
              "rotate(-3deg) scale(1, 1)",
              "rotate(2deg) scale(0.95, 0.95)",
            ];

            return (
              <motion.button
                key={num}
                onClick={() => setRating(actualRating)}
                whileTap={{ scale: 0.9 }}
                className={`relative flex items-center justify-center transition-all ${
                  isSelected ? "z-10" : "z-0"
                }`}
                style={{
                  width: isSelected ? "56px" : "48px",
                  height: isSelected ? "56px" : "48px",
                  marginBottom: index % 2 === 0 ? "8px" : "0",
                }}
              >
                {/* Blob shape */}
                <div
                  className={`absolute inset-0 rounded-[40%_60%_50%_50%/50%_40%_60%_50%] transition-all ${
                    isSelected
                      ? "bg-white"
                      : "bg-white/20 hover:bg-white/30"
                  }`}
                  style={{ transform: transforms[index] }}
                />
                <span
                  className={`relative z-10 text-lg font-bold transition-colors ${
                    isSelected ? "text-black" : "text-white/60"
                  }`}
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {num}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />
    </div>
  );
};

export default ZineMoodEntry;
