import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ZineFeedPostProps {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  photoUrl: string | null;
  caption?: string | null;
  rating?: number;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  createdAt: string;
  streak?: number;
  type: 'mood' | 'fitcheck';
  onLike: () => void;
  onComment: () => void;
  onPhotoClick: () => void;
  onUserClick: () => void;
}

const ZineFeedPost = ({
  username,
  displayName,
  photoUrl,
  caption,
  rating,
  likesCount,
  commentsCount,
  hasLiked,
  createdAt,
  streak,
  type,
  onLike,
  onComment,
  onPhotoClick,
  onUserClick,
}: ZineFeedPostProps) => {
  // Alternate tape positions
  const tapeRotation = Math.random() > 0.5 ? 'rotate(3deg)' : 'rotate(-3deg)';
  const polaroidRotation = Math.random() > 0.5 ? 'rotate(-1deg)' : 'rotate(1deg)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-8"
    >
      {/* Polaroid frame */}
      <div
        className="relative bg-card border border-foreground/10 p-3 mx-auto max-w-[320px] shadow-xl"
        style={{ transform: polaroidRotation }}
      >
        {/* Decorative tape */}
        <div
          className="absolute -top-3 left-1/4 w-12 h-5 bg-[#C5A059]/70 z-10"
          style={{ transform: tapeRotation }}
        />

        {/* Photo */}
        <div
          className="relative aspect-square bg-black/50 overflow-hidden cursor-pointer group"
          onClick={onPhotoClick}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Post"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <span
                className="text-6xl text-foreground/20"
                style={{ fontFamily: "'Abril Fatface', serif" }}
              >
                {rating || '?'}
              </span>
            </div>
          )}

          {/* Type badge */}
          {type === 'fitcheck' && (
            <div
              className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 text-[10px] uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Fit Check
            </div>
          )}

          {/* Latest vibe label */}
          {type === 'mood' && rating && (
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 bg-[#C5A059] text-black px-2 py-4 text-[8px] uppercase tracking-wider shadow-md"
              style={{
                fontFamily: "'Space Mono', monospace",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {rating}/10 Vibe
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="pt-3 pb-1">
          {/* User info */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onUserClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span
                className="text-sm font-bold text-foreground uppercase tracking-wide"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {displayName || username}
              </span>
              {streak && streak > 0 && (
                <span className="text-xs text-orange-500">🔥{streak}</span>
              )}
            </button>

            {/* Like button */}
            <motion.button
              onClick={onLike}
              whileTap={{ scale: 0.9 }}
              className={`p-1.5 rounded-full ${
                hasLiked ? 'bg-red-500/20' : 'bg-foreground/5'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  hasLiked ? 'text-red-500 fill-red-500' : 'text-foreground/60'
                }`}
              />
            </motion.button>
          </div>

          {/* Caption - handwritten style */}
          {caption && (
            <p
              className="text-foreground/70 text-sm mb-2 italic line-clamp-2"
              style={{ fontFamily: "'Great Vibes', cursive", fontSize: '1rem' }}
            >
              "{caption}"
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-foreground/40">
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              @{username} • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>

            <button
              onClick={onComment}
              className="flex items-center gap-1 text-foreground/50 hover:text-foreground/80 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span
                className="text-[10px]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {commentsCount > 0 ? commentsCount : 'Comment'}
              </span>
            </button>
          </div>

          {/* Likes count */}
          {likesCount > 0 && (
            <div
              className="mt-1 text-[10px] text-foreground/40"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {likesCount} {likesCount === 1 ? 'like' : 'likes'}
            </div>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-4 -left-4 opacity-10 pointer-events-none">
        <svg className="w-12 h-12 stroke-foreground fill-none" strokeWidth="1" viewBox="0 0 100 100">
          <path d="M10,50 Q30,10 50,50 T90,50" />
        </svg>
      </div>
    </motion.div>
  );
};

export default ZineFeedPost;
