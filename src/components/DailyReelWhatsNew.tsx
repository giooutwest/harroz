import { motion, AnimatePresence } from "framer-motion";
import { X, Film, Sparkles } from "lucide-react";

interface DailyReelWhatsNewProps {
  isOpen: boolean;
  onClose: () => void;
  onTryIt: () => void;
}

const DailyReelWhatsNew = ({ isOpen, onClose, onTryIt }: DailyReelWhatsNewProps) => {
  if (!isOpen) return null;

  const handleTryIt = () => {
    onTryIt();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(5, 5, 5, 0.95)' }}
        onClick={onClose}
      >
        {/* Film grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative sprocket holes - left */}
          <div className="absolute left-2 top-0 bottom-0 w-3 flex flex-col justify-around py-8 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-4 rounded-sm bg-white/5 border border-white/10"
              />
            ))}
          </div>

          {/* Decorative sprocket holes - right */}
          <div className="absolute right-2 top-0 bottom-0 w-3 flex flex-col justify-around py-8 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-4 rounded-sm bg-white/5 border border-white/10"
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative px-10 py-8">
            {/* Header badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span
                className="text-[10px] text-[#C5A059] uppercase tracking-[0.3em]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                NEW FEATURE
              </span>
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
            </motion.div>

            {/* Film icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div
                className="w-20 h-20 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Film className="w-10 h-10 text-white/80" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center text-2xl text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Introducing DailyReel
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-center text-white/40 text-xs mb-6 uppercase tracking-[0.15em]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Your day as cinema
            </motion.p>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4 mb-8"
            >
              <p
                className="text-white/60 text-sm text-center leading-relaxed"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Your friends' posts now appear as frames on a vintage film strip.
                Drag through the reel to view each moment of the day.
              </p>

              {/* Feature highlights */}
              <div className="space-y-2 pt-2">
                {[
                  "Film strip with authentic sprocket holes",
                  "Snap-to-frame scrolling",
                  "Director credits & frame metadata",
                  "Cinematic grain overlay"
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 bg-white/30" />
                    <span
                      className="text-white/50 text-[11px] tracking-wide"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Splice line decoration */}
            <div className="splice-line w-full mb-6" />

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={handleTryIt}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-white text-black font-medium text-sm uppercase tracking-wider transition-colors hover:bg-white/90"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              View the Reel
            </motion.button>

            {/* Skip text */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={onClose}
              className="w-full mt-3 py-2 text-white/30 text-xs hover:text-white/50 transition-colors"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Maybe later
            </motion.button>

            {/* Frame counter decoration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-4 right-10 text-white/20 text-[9px] tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              v3.0
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyReelWhatsNew;
