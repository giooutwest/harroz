import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Fingerprint, Lock } from "lucide-react";
// import { useAuth } from "@/hooks/useAuth"; 

const Auth = () => {  // <--- RENAMED FROM SignIn TO Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  // const { signIn } = useAuth(); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay for effect
    setTimeout(() => {
      setIsLoading(false);
      navigate("/"); 
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col px-6 py-8 relative overflow-hidden font-sans">
      
      {/* --- BACKGROUND TEXTURE --- */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           }}
      />
      
      {/* --- TOP LEFT LOGO --- */}
      <div className="relative z-10 mb-12">
        <h2 className="text-2xl font-serif italic text-white/80">Roz</h2>
        <div className="w-8 h-1 bg-red-600 mt-2" />
      </div>

      {/* --- MAIN HEADLINE --- */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-12"
      >
        <h1 className="text-6xl font-bold text-white leading-[0.9] tracking-tighter mb-4">
          WHO<br />
          ARE<br />
          <span className="text-white/50">YOU?</span>
        </h1>
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          // RESTRICTED ENTRY POINT_
        </p>
      </motion.div>

      {/* --- FORM --- */}
      <form onSubmit={handleLogin} className="w-full z-10 space-y-10">
        
        {/* Email Field */}
        <div className="group">
          <div className="relative flex items-center bg-zinc-900/50 border border-zinc-800 focus-within:border-white/40 transition-colors h-14 px-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-zinc-700 uppercase"
              placeholder="NO_ONE"
            />
            <Fingerprint className="w-6 h-6 text-zinc-700" />
          </div>
          <p className="mt-2 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            :: IDENTITY_STRING (EMAIL)
          </p>
        </div>

        {/* Password Field */}
        <div className="group">
          <div className="relative flex items-center bg-zinc-900/50 border border-zinc-800 focus-within:border-white/40 transition-colors h-14 px-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-zinc-700 tracking-widest"
              placeholder="********"
            />
            <Lock className="w-5 h-5 text-zinc-700" />
          </div>
          <p className="mt-2 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            :: AUTH_KEY (PASSWORD)
          </p>
        </div>

        {/* --- BUTTON --- */}
        <div className="pt-4 relative">
            {/* The Red Shadow Layer */}
            <div className="absolute top-2 left-1 w-full h-14 bg-red-600 -rotate-1 rounded-sm z-0" />
            
            {/* The Actual Button */}
            <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ x: 2, y: 2 }} 
                className="relative z-10 w-full h-14 bg-white text-black font-bold text-xl tracking-widest uppercase hover:bg-zinc-100 transition-colors"
            >
                {isLoading ? "VERIFYING..." : "ENTER"}
            </motion.button>
        </div>

        {/* Footer Link */}
        <div className="w-full text-center">
             <a href="#" className="text-zinc-600 text-xs font-mono hover:text-red-500 transition-colors uppercase tracking-widest">
                [ RECOVER_ID ]
             </a>
        </div>

      </form>

      {/* --- FOOTER STATUS --- */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-10 opacity-60">
         <div className="flex flex-col gap-1">
             <span className="text-[9px] text-zinc-500 font-mono uppercase">System Status</span>
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                 <span className="text-[10px] text-red-600 font-bold font-mono uppercase tracking-wider">Online</span>
             </div>
         </div>
         <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">
             v.9.0.2 // BLK_BOX
         </span>
      </div>

    </div>
  );
};

export default Auth;