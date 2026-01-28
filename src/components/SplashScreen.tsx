import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SplashScreen = () => {
  const [count, setCount] = useState(0);

  // 1. The "Hacker" Counter Logic
  // Jumps randomly to look like real data processing, stops at 99.
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          return 99;
        }
        // Random jump between 1 and 15 for that "processing" feel
        const jump = Math.floor(Math.random() * 15) + 1;
        return Math.min(prev + jump, 99);
      });
    }, 150); // Updates every 150ms

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      // The "Blast Shield" Exit: Slides sharply up instead of fading
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black px-6 py-12 overflow-hidden"
    >
      {/* --- BACKGROUND NOISE TEXTURE --- */}
      {/* This creates that grainy "analog" film look */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           }}
      />

      {/* --- TOP: Corner Lines (Decoration) --- */}
      <div className="w-full flex justify-between items-start opacity-50 z-10">
        <div className="w-4 h-4 border-l-2 border-t-2 border-white/40" />
        <div className="w-4 h-4 border-r-2 border-t-2 border-white/40" />
      </div>

      {/* --- CENTER: The Glitch Logo --- */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.h1
          // Flicker Animation: 0 -> 1 -> 0 -> 0.5 -> 1
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 1, 0, 0.5, 1],
            textShadow: [
              "0px 0px 0px rgba(255,255,255,0)",
              "0px 0px 10px rgba(255,255,255,0.8)",
              "0px 0px 0px rgba(255,255,255,0)", 
              "4px 0px 0px rgba(0,0,255,0.5)", // Blue glitch offset
              "0px 0px 20px rgba(255,255,255,0.5)"
            ]
          }}
          transition={{ duration: 1.2, times: [0, 0.1, 0.2, 0.4, 1] }}
          className="font-serif text-7xl font-bold tracking-tighter text-white"
        >
          Roz
        </motion.h1>
      </div>

      {/* --- BOTTOM: The Technical Footer --- */}
      <div className="w-full grid grid-cols-2 items-end z-10">
        
        {/* Left: System Status */}
        <div className="flex flex-col gap-1">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            {/* Blinking Blue Dot */}
            <motion.div 
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]"
            />
            <span className="text-[10px] tracking-widest text-zinc-500 font-mono uppercase">
              SYS_INIT
            </span>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-zinc-300 font-mono tracking-wider"
          >
            ESTABLISHING SECURE LINK...
          </motion.p>
          {/* A fake progress bar line */}
          <motion.div 
             initial={{ width: 0 }}
             animate={{ width: "60px" }}
             transition={{ duration: 2, delay: 0.5 }}
             className="h-[2px] bg-white mt-2"
          />
        </div>

        {/* Right: The Counter */}
        <div className="flex flex-col items-end">
          <span className="text-6xl font-bold font-mono text-white tracking-tighter leading-none">
            {count}
          </span>
          <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-1">
            Loading
          </span>
        </div>
      </div>

      {/* --- BOTTOM: Corner Lines (Decoration) --- */}
      <div className="w-full flex justify-between items-end opacity-50 z-10 absolute bottom-12 px-6 pointer-events-none">
        <div className="w-4 h-4 border-l-2 border-b-2 border-white/40" />
        <div className="w-4 h-4 border-r-2 border-b-2 border-white/40" />
      </div>

    </motion.div>
  );
};

export default SplashScreen;