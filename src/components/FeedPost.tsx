import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import BadgeDisplay from "./BadgeDisplay";
import MusicPlayer from "./MusicPlayer";

export interface MoodMention {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

const GUESSES_STORAGE_KEY = "moodmemos-guesses";

// Helper to get/set guesses from localStorage
const getStoredGuesses = (): Record<string, { guess: number; actualRating: number }> => {
  try {
    const stored = localStorage.getItem(GUESSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const storeGuess = (moodId: string, guess: number, actualRating: number) => {
  const guesses = getStoredGuesses();
  guesses[moodId] = { guess, actualRating };
  localStorage.setItem(GUESSES_STORAGE_KEY, JSON.stringify(guesses));
};

interface FeedPostProps {
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
  isOwnPost: boolean;
  equippedBadges?: string[];
  songTitle?: string | null;
  songArtist?: string | null;
  songPreviewUrl?: string | null;
  mentions?: MoodMention[];
  onLike: () => void;
  onComment: () => void;
  onUserClick: () => void;
  onMentionClick?: (userId: string) => void;
}

const CONFETTI_COLORS = ["bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-pink-400"];

const FeedPost = ({
  id,
  username,
  displayName,
  avatarUrl,
  photoUrl,
  caption,
  rating,
  likesCount,
  commentsCount,
  hasLiked,
  createdAt,
  streak,
  type,
  isOwnPost,
  equippedBadges,
  songTitle,
  songArtist,
  songPreviewUrl,
  mentions = [],
  onLike,
  onComment,
  onUserClick,
  onMentionClick,
}: FeedPostProps) => {
  // Check if we've already guessed this post
  const storedGuesses = getStoredGuesses();
  const previousGuess = storedGuesses[id];

  const [guess, setGuess] = useState(previousGuess?.guess ?? 5);
  const [hasGuessed, setHasGuessed] = useState(!!previousGuess);
  const [showConfetti, setShowConfetti] = useState(false);

  // Determine if we should show the guess mechanic
  const showGuessMechanic = type === 'mood' && rating && !isOwnPost;
  const isRevealed = isOwnPost || hasGuessed || type === 'fitcheck';

  const handleGuess = () => {
    if (!rating) return;
    setHasGuessed(true);

    // Persist the guess to localStorage
    storeGuess(id, guess, rating);

    // Check if guess is close (within 1)
    const diff = Math.abs(guess - rating);
    if (diff <= 1) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
  };

  // Use stored guess for display if available
  const displayGuess = previousGuess?.guess ?? guess;

  const getDifferenceText = () => {
    if (!rating) return "";
    const diff = Math.abs(displayGuess - rating);
    if (diff === 0) return "Perfect guess!";
    if (diff === 1) return "So close!";
    if (diff <= 2) return "Not bad!";
    return "Way off!";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={onUserClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar className="w-10 h-10">
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <AvatarFallback className="bg-secondary text-foreground">
              {(displayName || username)?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                {displayName || username}
              </span>
              {equippedBadges && equippedBadges.length > 0 && (
                <BadgeDisplay badgeIds={equippedBadges} size="sm" />
              )}
              {streak && streak > 0 && (
                <span className="text-xs text-orange-500">🔥{streak}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              @{username} • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
        </button>

        {/* Rating badge (only shown when revealed and is mood type) */}
        {type === 'mood' && rating && isRevealed && (
          <motion.div
            initial={hasGuessed ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold"
          >
            {rating}/10
          </motion.div>
        )}

        {/* Fit check badge */}
        {type === 'fitcheck' && (
          <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Fit Check
          </div>
        )}
      </div>

      {/* Photo */}
      <div className="relative aspect-square bg-secondary">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Post"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            {rating && (
              <span className="text-8xl text-muted-foreground/20 font-bold">
                {isRevealed ? rating : '?'}
              </span>
            )}
          </div>
        )}

        {/* Hidden rating overlay for unrevealed posts */}
        {showGuessMechanic && !hasGuessed && (
          <div className="absolute top-3 right-3 bg-foreground/80 text-background px-3 py-1 rounded-full text-xs font-medium">
            ?/10
          </div>
        )}

        {/* Tagged friends indicator - Instagram style */}
        {mentions.length > 0 && (
          <div className="absolute bottom-3 left-3">
            <button
              onClick={() => onMentionClick?.(mentions[0].user_id)}
              className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
              <span>
                {mentions.length === 1
                  ? `@${mentions[0].username || mentions[0].display_name}`
                  : `@${mentions[0].username || mentions[0].display_name} +${mentions.length - 1}`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Guess mechanic (only for other people's mood posts) */}
      {showGuessMechanic && !hasGuessed && (
        <div className="p-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            How was their day?
          </p>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-muted-foreground w-4">1</span>
            <Slider
              value={[guess]}
              onValueChange={(value) => setGuess(value[0])}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-4">10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">{guess}/10</span>
            <Button
              onClick={handleGuess}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Lock in guess
            </Button>
          </div>
        </div>
      )}

      {/* Reveal result (after guessing) */}
      <AnimatePresence>
        {showGuessMechanic && hasGuessed && rating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative p-4 border-t border-border bg-secondary/30 overflow-hidden"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-sm text-muted-foreground">
                You guessed <span className="font-bold text-foreground">{displayGuess}</span>, they were{" "}
                <span className="font-bold text-foreground">{rating}</span>
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {getDifferenceText()}
              </p>
            </motion.div>

            {/* Confetti animation */}
            {showConfetti && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-2 h-2 rounded-full ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}`}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1.5, 1],
                      x: Math.cos((i * 30 * Math.PI) / 180) * 80,
                      y: Math.sin((i * 30 * Math.PI) / 180) * 80,
                      opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption (blurred until revealed for other's posts) */}
      {caption && (
        <div className="px-4 py-2">
          <p
            className={`text-sm text-foreground/80 ${
              showGuessMechanic && !hasGuessed
                ? "blur-sm select-none"
                : ""
            } transition-all duration-300`}
          >
            {caption}
          </p>
        </div>
      )}

      {/* Music Player */}
      {songTitle && songArtist && (
        <div className="px-4 py-2">
          <MusicPlayer
            songTitle={songTitle}
            songArtist={songArtist}
            previewUrl={songPreviewUrl || null}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
        <motion.button
          onClick={onLike}
          whileTap={{ scale: 0.9 }}
          className={`flex items-center gap-2 ${
            hasLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          } transition-colors`}
        >
          <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
          <span className="text-sm font-medium">
            {likesCount > 0 ? likesCount : "Like"}
          </span>
        </motion.button>

        <button
          onClick={onComment}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {commentsCount > 0 ? commentsCount : "Comment"}
          </span>
        </button>
      </div>
    </motion.div>
  );
};

export default FeedPost;
