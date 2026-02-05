import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Music, Play, Pause, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
      const tracks = await searchTracks(query);
      setResults(tracks);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlayPreview = (track: SpotifyTrack) => {
    if (!track.previewUrl) return;

    if (playingId === track.id) {
      // Stop playing
      audio?.pause();
      setPlayingId(null);
    } else {
      // Play new track
      if (audio) {
        audio.pause();
      }
      const newAudio = new Audio(track.previewUrl);
      newAudio.play();
      newAudio.onended = () => setPlayingId(null);
      setAudio(newAudio);
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: SpotifyTrack) => {
    // Stop any playing audio
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full sm:max-w-md sm:rounded-xl border border-border overflow-hidden"
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
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
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a song..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {results.length === 0 && query && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No songs found</p>
                </div>
              )}

              {results.length === 0 && !query && (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Search for your favorite song</p>
                </div>
              )}

              {results.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                  onClick={() => handleSelect(track)}
                >
                  {/* Album Art */}
                  <div className="relative w-12 h-12 rounded overflow-hidden bg-secondary shrink-0">
                    {track.albumArt ? (
                      <img
                        src={track.albumArt}
                        alt={track.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {track.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist}
                    </p>
                  </div>

                  {/* Preview Button */}
                  {track.previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(track);
                      }}
                      className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                    >
                      {playingId === track.id ? (
                        <Pause className="w-4 h-4 text-primary" />
                      ) : (
                        <Play className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MusicSearchModal;
