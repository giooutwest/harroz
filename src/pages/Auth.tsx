import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Sun, Sparkles, AtSign, User, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import InstallPrompt from "@/components/InstallPrompt";
import PWAInstallTutorial from "@/components/PWAInstallTutorial";

// --- Validation Schemas ---
const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");
const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed");
const displayNameSchema = z.string()
  .min(2, "Display name must be at least 2 characters")
  .max(30, "Display name is too long");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // --- Form Fields ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(""); // <--- NEW FIELD
  
  // --- UI State ---
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string; displayName?: string }>({});
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstallTutorial, setShowInstallTutorial] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // 1. Install Prompt Logic
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeenAuthInstall = localStorage.getItem('moodmemos-auth-install-prompted');
    if (!isInstalled && !hasSeenAuthInstall) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
        localStorage.setItem('moodmemos-auth-install-prompted', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Auth State Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // 3. Username Availability Checker
  useEffect(() => {
    if (isLogin || !username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const usernameResult = usernameSchema.safeParse(username);
    if (!usernameResult.success) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username)
        .maybeSingle();
      
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, isLogin]);

  // 4. Validation Logic
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;

    if (!isLogin) {
      // Validate Username
      const usernameResult = usernameSchema.safeParse(username);
      if (!usernameResult.success) newErrors.username = usernameResult.error.errors[0].message;
      else if (usernameAvailable === false) newErrors.username = "Username is already taken";

      // Validate Display Name <--- NEW CHECK
      const displayResult = displayNameSchema.safeParse(displayName);
      if (!displayResult.success) newErrors.displayName = displayResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 5. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    if (isLogin) {
      // --- LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message,
          variant: "destructive",
        });
      }
    } else {
      // --- SIGN UP ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: username.toLowerCase(),
            display_name: displayName, // <--- SENDING SEPARATE DISPLAY NAME
          }
        },
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else if (data.user) {
        // Double-check profile update just in case trigger missed
        await supabase
          .from('profiles')
          .update({ 
            username: username.toLowerCase(), 
            display_name: displayName // <--- SAVING DISPLAY NAME
          })
          .eq('user_id', data.user.id);

        toast({ title: "Welcome aboard! 🎉", description: "Your account is created." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      {/* Background Icons */}
      <motion.div className="absolute top-20 left-10 text-muted-foreground/30" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
        <Cloud className="w-12 h-12" />
      </motion.div>
      <motion.div className="absolute top-32 right-12 text-yellow-500/30" animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
        <Sun className="w-10 h-10" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sun className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Roz</h1>
          <p className="text-muted-foreground text-sm">{isLogin ? "Welcome back! Ready to check in?" : "Start your mood journey today ✨"}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <>
              {/* NEW: Display Name Field */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Display Name (e.g. John Doe)"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName) setErrors({ ...errors, displayName: undefined });
                    }}
                    className="h-12 bg-card border-border rounded-xl pl-10"
                    maxLength={30}
                  />
                </div>
                {errors.displayName && <p className="text-destructive text-xs mt-1">{errors.displayName}</p>}
              </div>

              {/* Username Field */}
              <div>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username (unique handle)"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      if (errors.username) setErrors({ ...errors, username: undefined });
                    }}
                    className="h-12 bg-card border-border rounded-xl pl-10"
                    maxLength={20}
                  />
                  {username.length >= 3 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${checkingUsername ? "text-muted-foreground" : usernameAvailable ? "text-green-500" : "text-destructive"}`}>
                      {checkingUsername ? "checking..." : usernameAvailable ? "✓ available" : "✗ taken"}
                    </span>
                  )}
                </div>
                {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              className="h-12 bg-card border-border rounded-xl"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>
              
          {/* Password Field */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className="h-12 bg-card border-border rounded-xl pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={loading || (!isLogin && (checkingUsername || usernameAvailable === false))}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </motion.button>
        </form>

        {/* Toggle Login/Signup */}
        <p className="text-center mt-6 text-muted-foreground text-sm">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>

      <InstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} onInstall={() => { setShowInstallPrompt(false); setShowInstallTutorial(true); }} />
      <PWAInstallTutorial isOpen={showInstallTutorial} onClose={() => setShowInstallTutorial(false)} />
    </div>
  );
};

export default Auth;