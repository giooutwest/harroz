import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        toast.error("Username is already taken");
        setIsLoading(false);
        return;
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.toLowerCase().trim(),
            display_name: username.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          user_id: data.user.id,
          username: username.toLowerCase().trim(),
          display_name: username.trim(),
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast.success("Account created! Welcome to Roz.");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Email is already registered. Try signing in instead.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setEmail("");
    setPassword("");
    setUsername("");
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
      <div className="relative z-10 mb-8">
        <h2 className="text-2xl font-serif italic text-white/80">Roz</h2>
        <div className="w-8 h-1 bg-red-600 mt-2" />
      </div>

      {/* --- MAIN HEADLINE --- */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-8"
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-5xl font-bold text-white leading-[0.9] tracking-tighter mb-4"
          >
            {mode === "signin" ? (
              <>
                WHO<br />
                ARE<br />
                <span className="text-white/50">YOU?</span>
              </>
            ) : (
              <>
                JOIN<br />
                THE<br />
                <span className="text-white/50">CLUB</span>
              </>
            )}
          </motion.h1>
        </AnimatePresence>
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          {mode === "signin" ? "// RESTRICTED ENTRY POINT_" : "// NEW MEMBER REGISTRATION_"}
        </p>
      </motion.div>

      {/* --- FORM --- */}
      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="w-full z-10 space-y-6 flex-1">

        {/* Username Field (Sign Up Only) */}
        <AnimatePresence>
          {mode === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="group overflow-hidden"
            >
              <div className="relative flex items-center bg-zinc-900/50 border border-zinc-800 focus-within:border-white/40 transition-colors h-14 px-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  maxLength={20}
                  className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-zinc-700"
                  placeholder="username"
                />
                <User className="w-5 h-5 text-zinc-700" />
              </div>
              <p className="mt-2 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                :: HANDLE (letters, numbers, underscore)
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Field */}
        <div className="group">
          <div className="relative flex items-center bg-zinc-900/50 border border-zinc-800 focus-within:border-white/40 transition-colors h-14 px-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-zinc-700"
              placeholder="email@example.com"
            />
            <Mail className="w-5 h-5 text-zinc-700" />
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
              minLength={6}
              className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-zinc-700 tracking-widest"
              placeholder="••••••••"
            />
            <Lock className="w-5 h-5 text-zinc-700" />
          </div>
          <p className="mt-2 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            :: AUTH_KEY (MIN 6 CHARS)
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
            className="relative z-10 w-full h-14 bg-white text-black font-bold text-xl tracking-widest uppercase hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <span className="animate-pulse">PROCESSING...</span>
            ) : (
              <>
                {mode === "signin" ? "ENTER" : "CREATE"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Toggle Mode Link */}
        <div className="w-full text-center pt-2">
          <button
            type="button"
            onClick={toggleMode}
            className="text-zinc-500 text-xs font-mono hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            {mode === "signin" ? (
              <>[ NEW? <span className="text-red-500">CREATE_ACCOUNT</span> ]</>
            ) : (
              <>[ EXISTING? <span className="text-red-500">SIGN_IN</span> ]</>
            )}
          </button>
        </div>

      </form>

      {/* --- FOOTER STATUS --- */}
      <div className="relative flex items-end justify-between z-10 opacity-60 mt-8">
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
