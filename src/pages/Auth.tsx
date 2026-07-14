import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "signin" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.user) navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !username || !displayName) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    setIsLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();
      if (existingUser) { setError("Username is already taken."); setIsLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.toLowerCase().trim(), display_name: displayName.trim() } },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          username: username.toLowerCase().trim(),
          display_name: displayName.trim(),
        });
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message?.includes("already registered")
        ? "Email already registered. Try signing in."
        : (err.message || "Failed to create account."));
    } finally {
      setIsLoading(false);
    }
  };

  const fieldWrap: React.CSSProperties = { marginBottom: 14 };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(var(--paper))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="journal-card" style={{ width: "100%", maxWidth: 340, padding: "32px 28px" }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="font-journal-display" style={{ fontSize: 28, fontWeight: 600, color: "hsl(var(--ink))" }}>
            Daylog
          </div>
          <div style={{ fontSize: 13, color: "hsl(var(--ink-soft))", marginTop: 4 }}>
            A short daily video, kept just for you
          </div>
        </div>

        {/* Error box */}
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              background: "hsl(12 45% 45% / 0.08)",
              border: "1px solid hsl(12 45% 45% / 0.25)",
              borderRadius: "calc(var(--radius) - 4px)",
              color: "hsl(var(--accent))",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>

          {/* Sign-up only fields */}
          {mode === "signup" && (
            <>
              <div style={fieldWrap}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "hsl(var(--ink-soft))" }}>Display name</label>
                <input
                  className="journal-input"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="Your name"
                />
              </div>
              <div style={fieldWrap}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "hsl(var(--ink-soft))" }}>Username</label>
                <input
                  className="journal-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  maxLength={20}
                  placeholder="username"
                />
              </div>
            </>
          )}

          <div style={fieldWrap}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "hsl(var(--ink-soft))" }}>Email</label>
            <input
              className="journal-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div style={fieldWrap}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "hsl(var(--ink-soft))" }}>Password</label>
            <input
              className="journal-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {/* Loading progress bar */}
          {isLoading && (
            <div style={{ marginBottom: 14 }}>
              <div className="journal-progress-bar" style={{ height: 3, width: "100%" }} />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            <button
              type="submit"
              className="journal-btn journal-btn-primary"
              disabled={isLoading}
              style={{ height: 44 }}
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button
              type="button"
              className="journal-btn"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
              disabled={isLoading}
              style={{ background: "transparent", border: "none", color: "hsl(var(--ink-soft))" }}
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default Auth;
