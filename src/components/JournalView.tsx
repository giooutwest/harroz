import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { JournalEntry } from "@/hooks/useJournalEntry";
import { supabase } from "@/integrations/supabase/client";

interface JournalViewProps {
  isOpen: boolean;
  entry: JournalEntry | null;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

const JournalView = ({
  isOpen,
  entry,
  onClose,
  onEdit,
  canEdit = false
}: JournalViewProps) => {
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

  // Fetch signed URLs for photos
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (!entry?.photos || entry.photos.length === 0) {
        setSignedPhotoUrls([]);
        setIsLoadingPhotos(false);
        return;
      }

      setIsLoadingPhotos(true);
      try {
        const urls = await Promise.all(
          entry.photos.map(async (photoPath) => {
            const { data } = await supabase.storage
              .from('mood-photos')
              .createSignedUrl(photoPath, 3600);
            return data?.signedUrl || '';
          })
        );
        setSignedPhotoUrls(urls.filter(Boolean));
      } catch (error) {
        console.error('Error fetching photo URLs:', error);
        setSignedPhotoUrls([]);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    if (isOpen && entry) {
      fetchSignedUrls();
      setCurrentPhotoIndex(0);
    }
  }, [isOpen, entry]);

  if (!isOpen || !entry) return null;

  const formattedDate = format(parseISO(entry.date), "EEEE, MMMM d, yyyy");

  const nextPhoto = () => {
    if (signedPhotoUrls.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % signedPhotoUrls.length);
    }
  };

  const prevPhoto = () => {
    if (signedPhotoUrls.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + signedPhotoUrls.length) % signedPhotoUrls.length);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-card border border-border w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-full">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Journal Entry</h3>
                <p className="text-muted-foreground text-xs">
                  {formattedDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Photo gallery */}
            {signedPhotoUrls.length > 0 && (
              <div className="relative">
                {isLoadingPhotos ? (
                  <div className="w-full aspect-square bg-secondary/30 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : (
                  <>
                    <img
                      src={signedPhotoUrls[currentPhotoIndex]}
                      alt={`Photo ${currentPhotoIndex + 1}`}
                      className="w-full aspect-square object-cover"
                    />

                    {/* Photo navigation */}
                    {signedPhotoUrls.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Photo indicators */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {signedPhotoUrls.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPhotoIndex(index)}
                              className={`w-2 h-2 transition-colors rounded-full ${
                                index === currentPhotoIndex ? "bg-white" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Text content */}
            <div className="p-4">
              {entry.content ? (
                <p className="text-foreground whitespace-pre-wrap text-sm">
                  {entry.content}
                </p>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  No text content
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <p className="text-muted-foreground text-center text-xs">
              {signedPhotoUrls.length > 0 && `${signedPhotoUrls.length} photo${signedPhotoUrls.length > 1 ? 's' : ''} • `}
              {entry.content?.length || 0} characters
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JournalView;
