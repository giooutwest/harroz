import { motion } from "framer-motion";
import { Share, PlusSquare, ArrowDown } from "lucide-react";

const InstallGate = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
      
      {/* --- BACKGROUND GRID --- */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      />

      {/* --- HEADER --- */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center w-full"
      >
        <p className="text-[10px] text-zinc-500 font-mono tracking-[0.3em] uppercase mb-4">
          Installation Blueprint
        </p>
        <h1 className="text-6xl font-serif font-bold text-white tracking-tighter leading-[0.85]">
          INSTALL<br />HARROZ
        </h1>
      </motion.div>

      {/* --- INSTRUCTIONS (The Schematic) --- */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-xs space-y-16 z-10 relative">
        
        {/* Dotted Line Connecting Steps */}
        <div className="absolute left-[75%] top-[20%] bottom-[20%] w-[1px] border-l border-dashed border-zinc-700 -z-10" />

        {/* STEP 1: SHARE */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between"
        >
            <div className="text-right pr-6">
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Step 01</p>
                <p className="text-xl font-bold text-white tracking-tight">OPEN MENU</p>
            </div>
            <div className="w-16 h-16 border border-white flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <Share className="w-6 h-6 text-white" />
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
            </div>
        </motion.div>

        {/* STEP 2: ADD TO HOME */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            className="flex items-center justify-between"
        >
            <div className="text-right pr-6">
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Step 02</p>
                <p className="text-xl font-bold text-white tracking-tight">ADD TO HOME</p>
            </div>
            <div className="w-16 h-16 border border-white flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <PlusSquare className="w-6 h-6 text-white" />
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
            </div>
        </motion.div>

      </div>

      {/* --- FOOTER (The Call to Action) --- */}
      <div className="z-10 w-full flex flex-col items-center">
        
        <p className="text-[10px] text-zinc-600 font-mono tracking-widest mb-6">
            INITIALIZE
        </p>

        {/* The Pulsing Ghost Arrow */}
        <motion.div
            animate={{ y: [0, 15, 0], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
            <ArrowDown className="w-8 h-8 text-white" />
        </motion.div>

        <p className="text-[8px] text-zinc-800 font-mono mt-8 uppercase tracking-widest text-center max-w-[200px]">
            Establish permanent connection to proceed.
        </p>
      </div>

    </div>
  );
};

export default InstallGate;