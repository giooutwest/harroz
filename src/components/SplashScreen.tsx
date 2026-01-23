import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      {/* 1. The Logo */}
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-3xl bg-white shadow-xl flex items-center justify-center overflow-hidden">
           {/* Note: In most apps, the 'public' folder is the root, so we use /icons/... */}
           <img 
             src="/icons/icon-192x192.png" 
             alt="Roz Logo" 
             className="w-full h-full object-cover"
           />
        </div>
      </div>

      {/* 2. The Text: 'Roz' in italics, rest normal */}
      <div className="text-center mb-8">
        <p className="text-xl text-foreground font-medium splash-title">
          Roz <span className="italic font-serif"> - </span> Every Day
        </p>
      </div>

      {/* 3. The Loading Indicator (Centered underneath) */}
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </motion.div>
  );
};

export default SplashScreen;