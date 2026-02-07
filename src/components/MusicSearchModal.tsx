import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Music, Play, Pause, Loader2, ChevronRight } from "lucide-react";
import { searchTracks, SpotifyTrack } from "@/services/spotifySearch";

interface MusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: { title: string; artist: string; previewUrl: string | null }) => void;
}

const MusicSearchModal = ({ isOpen, onClose, onSelect }: MusicSearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const tracks = await searchTracks(query);
        setResults(tracks);
      } catch {
        setResults([]);
      }
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlayPreview = (track: SpotifyTrack) => {
    if (!track.previewUrl) return;

    if (playingId === track.id) {
      audio?.pause();
      setPlayingId(null);
    } else {
      if (audio) {
        audio.pause();
      }
      const newAudio = new Audio(track.previewUrl);
      newAudio.play().catch(() => {});
      newAudio.onended = () => setPlayingId(null);
      setAudio(newAudio);
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: SpotifyTrack) => {
    if (audio) {
      audio.pause();
    }
    setPlayingId(null);

    onSelect({
      title: track.name,
      artist: track.artist,
      previewUrl: track.previewUrl,
    });
    onClose();
  };

  const handleClose = () => {
    if (audio) {
      audio.pause();
    }
    setPlayingId(null);
    setQuery("");
    setResults([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
          onClick={handleClose}
        >
          {/* Top section - Search bar pinned to top */}
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border-b border-border"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Add a Song</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search for a song..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>
          </motion.div>

          {/* Results area - scrollable, fills remaining space */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 overflow-y-auto"
          >
            {results.length === 0 && query && !isSearching && (
              <div className="text-center py-16 text-muted-foreground">
                <Music className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No songs found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search</p>
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="text-center py-16 text-muted-foreground">
                <Music className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Search for your favorite song</p>
              </div>
            )}

            {results.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                {/* Preview Button (left side) */}
                <button
                  onClick={() => handlePlayPreview(track)}
                  disabled={!track.previewUrl}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 ${
                    !track.previewUrl ? "opacity-60" : ""
                  }`}
                >
                  {track.albumArt ? (
                    <img
                      src={track.albumArt}
                      alt={track.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <Music className="w-5 h-5 text-white/50" />
                    </div>
                  )}
                  {/* Play/Pause overlay */}
                  {track.previewUrl && (
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                      playingId === track.id ? "opacity-100" : "opacity-0 hover:opacity-100"
                    }`}>
                      {playingId === track.id ? (
                        <Pause className="w-5 h-5 text-white" fill="white" />
                      ) : (
                        <Play className="w-5 h-5 text-white" fill="white" />
                      )}
                    </div>
                  )}
                  {/* Playing indicator */}
                  {playingId === track.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 30, ease: "linear" }}
                      />
                    </div>
                  )}
                </button>

                {/* Track Info (middle) */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {track.name}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {track.artist}
                  </p>
                </div>

                {/* Select Button (right side - arrow) */}
                <button
                  onClick={() => handleSelect(track)}
                  className="p-2.5 rounded-full bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
                >
                  <ChevronRight className="w-5 h-5 text-primary" />
                </button>
              </motion.div>
            ))}

            {/* Bottom padding */}
            <div style={{ height: "max(2rem, env(safe-area-inset-bottom, 0px))" }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MusicSearchModal;
