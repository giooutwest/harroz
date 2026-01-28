import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Pencil } from "lucide-react";

interface ZinePostViewProps {
  rating: number;
  photoUrl: string | null;
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  onEdit?: () => void;
  onShare?: () => void;
  onEngagementClick?: () => void;
  canEdit: boolean;
}

const ZinePostView = ({
  rating,
  photoUrl,
  caption,
  likesCount,
  commentsCount,
  onEdit,
  onShare,
  onEngagementClick,
  canEdit
}: ZinePostViewProps) => {
  const getMoodLabel = (r: number): string => {
    if (r <= 2) return "Stormy";
    if (r <= 4) return "Rainy";
    if (r <= 6) return "Cloudy";
    if (r <= 8) return "Partly sunny";
    return "Bright & sunny!";
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full bg-black px-4 py-6">
      {/* Header - Today's mood posted */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-4xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Abril Fatface', serif" }}
          >
            Posted
          </h1>
          <p
            className="text-[10px] tracking-[0.15em] text-white/40 uppercase mt-1"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {getMoodLabel(rating)} / {rating} out of 10
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <motion.button
              onClick={onEdit}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/10 rounded-full"
            >
              <Pencil className="w-4 h-4 text-white/70" />
            </motion.button>
          )}
          {onShare && (
            <motion.button
              onClick={onShare}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/10 rounded-full"
            >
              <Share2 className="w-4 h-4 text-white/70" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main polaroid */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        className="relative mx-auto max-w-[300px]"
        onClick={onEngagementClick}
      >
        {/* Tape decoration */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-[#C5A059]/80 z-10"
          style={{ transform: "translateX(-50%) rotate(2deg)" }}
        />

        {/* Polaroid frame */}
        <div className="bg-[#f5f5f0] p-3 pt-6 pb-16 shadow-2xl cursor-pointer">
          {/* Photo */}
          <div className="relative aspect-square overflow-hidden bg-gray-200">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Today's mood"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span
                  className="text-6xl text-gray-500"
                  style={{ fontFamily: "'Abril Fatface', serif" }}
                >
                  {rating}
                </span>
              </div>
            )}
          </div>

          {/* Caption - handwritten style */}
          {caption && (
            <p
              className="absolute bottom-8 left-4 right-4 text-sm text-black/70 italic line-clamp-2"
              style={{ fontFamily: "'Great Vibes', cursive", fontSize: "1.1rem" }}
            >
              "{caption}"
            </p>
          )}

          {/* Engagement stats */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-black/60">
                <Heart className="w-4 h-4" />
                <span
                  className="text-xs"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {likesCount}
                </span>
              </div>
              <div className="flex items-center gap-1 text-black/60">
                <MessageCircle className="w-4 h-4" />
                <span
                  className="text-xs"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {commentsCount}
                </span>
              </div>
            </div>

            <span
              className="text-[8px] text-black/40 uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Tap to view
            </span>
          </div>
        </div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-20 left-6 opacity-20">
        <svg className="w-16 h-16 stroke-white fill-none" strokeWidth="1" viewBox="0 0 100 100">
          <path d="M10,50 Q30,10 50,50 T90,50" />
          <path d="M20,60 Q40,20 60,60 T100,60" />
        </svg>
      </div>

      {/* Bottom quote */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p
          className="text-sm text-white/30 italic"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {rating >= 7
            ? "What a beautiful day!"
            : rating >= 4
            ? "Tomorrow is a new day"
            : "This too shall pass"}
        </p>
      </div>
    </div>
  );
};

export default ZinePostView;
