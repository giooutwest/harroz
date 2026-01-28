import { motion } from "framer-motion";

interface ZineOpenViewProps {
  onEnter: () => void;
}

const ZineOpenView = ({ onEnter }: ZineOpenViewProps) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between py-8 select-none overflow-hidden">
      {/* Subtle gradient glow behind OPEN text */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Grain texture overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 z-10">
        <div className="absolute inset-0 noise-overlay opacity-10" />
        {/* Technical notations */}
        <div className="absolute bottom-6 left-6 text-[8px] text-white/30 rotate-90 origin-left font-mono-zine">
          COORD: 40.7128° N, 74.0060° W
        </div>
        <div className="absolute bottom-6 right-6 text-[8px] text-white/30 -rotate-90 origin-right text-right font-mono-zine">
          ENC: AES-256-GCM
        </div>
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-6 z-20">
        <div className="text-[10px] tracking-[0.2em] font-light text-white/40 uppercase font-mono-zine">
          Vol. 04 / Issue 12
        </div>
        <div className="text-[10px] tracking-[0.2em] font-light text-white/40 uppercase font-mono-zine">
          Status: Unlocking
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center relative z-20">
        {/* Ghost Polaroid (top) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] w-48 h-60 border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent rounded-sm p-3 opacity-30 transform -rotate-3">
          <div className="w-full h-4/5 bg-white/5 mb-3 rounded-sm flex items-center justify-center">
            <span className="text-white/10 text-4xl">📷</span>
          </div>
          <div className="h-1 w-1/2 bg-white/10 rounded-full mb-1" />
          <div className="h-1 w-1/3 bg-white/10 rounded-full" />
          <p className="absolute bottom-2 right-2 text-[8px] text-white/20 italic font-serif-zine">Yesterday</p>
        </div>

        {/* The Massive "OPEN" Text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 text-center"
        >
          <h1 className="text-[100px] sm:text-[140px] font-bold leading-none tracking-tighter text-white">
            OPEN
          </h1>
        </motion.div>

        {/* Horizon Line & Ticker */}
        <div className="w-full relative py-4 mt-[-10px]">
          {/* Razor-thin line */}
          <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-white/40 -translate-y-1/2" />

          {/* Ticker */}
          <div className="relative z-10 overflow-hidden whitespace-nowrap bg-black px-2">
            <motion.div
              animate={{ x: [0, -200] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="flex gap-8 text-[10px] font-medium tracking-[0.3em] text-white/80 py-1 uppercase font-mono-zine"
            >
              {Array(12).fill("9:00 PM").map((text, i) => (
                <span key={i}>{text}</span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Ghost Polaroid (bottom) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[80%] w-40 h-52 border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent rounded-sm p-2 opacity-10 transform rotate-6 scale-90">
          <div className="w-full h-4/5 bg-white/5 mb-2 rounded-sm" />
          <div className="h-1 w-1/3 bg-white/10 rounded-full" />
        </div>
      </main>

      {/* Footer - Enter Button */}
      <footer className="flex flex-col items-center justify-center gap-8 pb-12 z-20">
        <motion.button
          onClick={onEnter}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-4 cursor-pointer"
        >
          {/* Heartbeat Dot */}
          <div className="relative flex items-center justify-center w-12 h-12">
            {/* Outer glow - heartbeat animation */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 1, 0.8],
                boxShadow: [
                  "0 0 0px #f20d0d",
                  "0 0 15px #f20d0d",
                  "0 0 0px #f20d0d"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-red-500/20 rounded-full"
            />
            {/* The actual dot */}
            <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_#f20d0d]" />
          </div>
          <span className="text-[10px] font-medium tracking-[0.4em] text-white/60 uppercase font-mono-zine">
            Enter the room
          </span>
        </motion.button>

        {/* Platform Indicators */}
        <div className="flex gap-1">
          <div className="h-1 w-8 bg-white/10 rounded-full" />
          <div className="h-1 w-1 bg-red-500 rounded-full" />
          <div className="h-1 w-1 bg-white/10 rounded-full" />
        </div>
      </footer>
    </div>
  );
};

export default ZineOpenView;
