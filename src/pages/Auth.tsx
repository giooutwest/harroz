import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "signin" | "signup";

const Win98Icon = ({ type }: { type: "user" | "key" | "mail" }) => {
  const icons: Record<string, string> = {
    user: "👤",
    key:  "🔑",
    mail: "✉️",
  };
  return <span style={{ fontSize: 12 }}>{icons[type]}</span>;
};

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "2px 4px",
    background: "#ffffff",
    border: "none",
    outline: "none",
    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
    fontSize: 11,
    boxShadow: "inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a",
    height: 22,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 3,
    fontSize: 11,
    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
  };

  const fieldWrap: React.CSSProperties = { marginBottom: 10 };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#008080",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
        padding: 16,
      }}
    >
      {/* The main window */}
      <div className="win98-window" style={{ width: "100%", maxWidth: 320 }}>

        {/* Title Bar */}
        <div className="win98-titlebar">
          <img
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAABdJREFUKFNj/M/A8J+BBGAcNYEiEwAABhoBhX7bwNAAAAAASUVORK5CYII="
            width={14}
            height={14}
            alt=""
            className="pixelated"
          />
          <span>
            {mode === "signin" ? "DayLog 98 — Sign In" : "DayLog 98 — Create Account"}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            <button className="win98-btn" style={{ minWidth: 16, width: 16, height: 14, padding: 0, fontSize: 9, lineHeight: 1 }}>?</button>
            <button className="win98-btn" style={{ minWidth: 16, width: 16, height: 14, padding: 0, fontSize: 9, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Window Body */}
        <div style={{ padding: "12px 16px 16px" }}>

          {/* App Logo / Banner */}
          <div
            style={{
              background: "#000080",
              color: "#ffffff",
              padding: "8px 12px",
              marginBottom: 14,
              fontFamily: "'VT323', monospace",
              fontSize: 28,
              letterSpacing: 2,
              textAlign: "center",
            }}
          >
            📹 DAYLOG 98
            <div style={{ fontSize: 12, fontFamily: '"MS Sans Serif", Tahoma, sans-serif', letterSpacing: 0, opacity: 0.8 }}>
              Daily Video Journal System v1.0
            </div>
          </div>

          {/* Error box */}
          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: "4px 8px",
                background: "#ffffff",
                boxShadow: "inset 1px 1px #808080, inset -1px -1px #dfdfdf",
                color: "#aa0000",
                fontSize: 11,
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>

            {/* Sign-up only fields */}
            {mode === "signup" && (
              <>
                <div style={fieldWrap}>
                  <label style={labelStyle}><Win98Icon type="user" /> Display Name:</label>
                  <input
                    style={inputStyle}
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={30}
                    placeholder="Your Name"
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}><Win98Icon type="user" /> Username:</label>
                  <input
                    style={inputStyle}
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
              <label style={labelStyle}><Win98Icon type="mail" /> E-mail Address:</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}><Win98Icon type="key" /> Password:</label>
              <input
                style={inputStyle}
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
              <div style={{ marginBottom: 10 }}>
                <div
                  className="win98-progress-bar"
                  style={{ height: 16, width: "100%", boxShadow: "inset 1px 1px #808080, inset -1px -1px #dfdfdf" }}
                />
              </div>
            )}

            {/* Separator */}
            <div
              style={{
                margin: "12px 0 12px",
                borderTop: "1px solid #808080",
                borderBottom: "1px solid #ffffff",
              }}
            />

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button
                type="submit"
                className="win98-btn primary"
                disabled={isLoading}
                style={{ minWidth: 90 }}
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
              <button
                type="button"
                className="win98-btn"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
                disabled={isLoading}
              >
                {mode === "signin" ? "New User?" : "Sign In"}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default Auth;
