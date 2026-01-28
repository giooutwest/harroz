import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PhotoViewerModalProps {
  photoUrl: string | null;
  caption?: string | null;
  onClose: () => void;
}

const PhotoViewerModal = ({ photoUrl, caption, onClose }: PhotoViewerModalProps) => {
  if (!photoUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors z-10 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Photo container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={photoUrl}
            alt="Full view"
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />

          {/* Caption overlay */}
          {caption && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 px-6 py-3 bg-white/10 backdrop-blur-md max-w-md text-center rounded-2xl"
            >
              <p className="text-white text-sm">
                "{caption}"
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PhotoViewerModal;
