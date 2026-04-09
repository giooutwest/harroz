import { useState, useEffect } from "react";
import Win98Window from "./Win98Window";
import { supabase } from "@/integrations/supabase/client";

interface DayEntry {
  date: string; // YYYY-MM-DD
  rating: number;
}

interface ProfileWindowProps {
  userId: string;
  displayName: string;
  username: string;
  onClose: () => void;
  onSignOut: () => void;
}

type Tab = "week" | "month" | "newsletter";

const BAR_COLORS = [
  "#cc0000", "#dd2200", "#dd4400", "#cc7700", "#bbaa00",
  "#88bb00", "#55aa00", "#229900", "#008800", "#006600",
];

function ratingColor(r: number): string {
  return BAR_COLORS[Math.min(Math.max(r, 1), 10) - 1];
}

// Retro bar chart (no external lib)
const RetroBarChart = ({ entries, label }: { entries: DayEntry[]; label: string }) => {
  if (entries.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "#444" }}>
        No entries yet.
      </div>
    );
  }

  const maxVal = 10;
  const barWidth = Math.max(16, Math.floor(220 / entries.length) - 3);
  const chartH = 100;
  const avg = entries.reduce((s, e) => s + e.rating, 0) / entries.length;

  return (
    <div style={{ padding: "8px 12px" }}>
      <div style={{ fontSize: 10, marginBottom: 4, color: "#444" }}>
        {label} — Avg: <strong>{avg.toFixed(1)}</strong> / 10
      </div>

      {/* Chart */}
      <div
        className="win98-sunken"
        style={{
          background: "#ffffff",
          padding: "8px 8px 4px",
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: chartH + 24,
          overflowX: "auto",
        }}
      >
        {entries.map((e, i) => {
          const barH = Math.round((e.rating / maxVal) * chartH);
          const dayLabel = new Date(e.date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "short",
          }).slice(0, 2);
          return (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
              title={`${e.date}: ${e.rating}/10`}
            >
              {/* Value on top */}
              <span style={{ fontSize: 9, fontFamily: "'VT323', monospace", lineHeight: 1 }}>
                {e.rating}
              </span>
              {/* Bar */}
              <div
                style={{
                  width: barWidth,
                  height: barH,
                  background: ratingColor(e.rating),
                  boxShadow: "inset -1px -1px #0a0a0a, inset 1px 1px rgba(255,255,255,0.4)",
                  flexShrink: 0,
                }}
              />
              {/* Day label */}
              <span style={{ fontSize: 9, color: "#666", lineHeight: 1 }}>{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProfileWindow = ({ userId, displayName, username, onClose, onSignOut }: ProfileWindowProps) => {
  const [tab, setTab] = useState<Tab>("week");
  const [weekEntries, setWeekEntries] = useState<DayEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<DayEntry[]>([]);
  const [newsletter, setNewsletter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Week: last 7 days
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      // Month: current calendar month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data } = await (supabase as any)
        .from("video_entries")
        .select("created_at, rating")
        .eq("user_id", userId)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: true });

      const entries: DayEntry[] = (data || []).map((e: any) => ({
        date: e.created_at.slice(0, 10),
        rating: e.rating,
      }));

      setMonthEntries(entries);
      setWeekEntries(entries.filter(e => new Date(e.date) >= weekStart));

      // Latest newsletter
      const { data: nlData } = await (supabase as any)
        .from("monthly_newsletters")
        .select("content, period_month")
        .eq("user_id", userId)
        .order("period_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nlData) {
        const period = new Date(nlData.period_month + "-01").toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
        setNewsletter(`=== ${period.toUpperCase()} MONTHLY REVIEW ===\n\n${nlData.content}`);
      }
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      className={`win98-menuitem${tab === t ? " active" : ""}`}
      onClick={() => setTab(t)}
      style={{
        background: tab === t ? "#000080" : undefined,
        color: tab === t ? "#fff" : undefined,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );

  return (
    <Win98Window
      title={`${displayName} — Profile & Analytics`}
      icon="📊"
      onClose={onClose}
      initialX={20}
      initialY={60}
      width={280}
      menuBar={
        <div style={{ display: "flex", gap: 0 }}>
          {tabBtn("week", "This Week")}
          {tabBtn("month", "This Month")}
          {tabBtn("newsletter", "📰 Review")}
        </div>
      }
    >
      <div style={{ background: "#C0C0C0" }}>

        {/* User identity */}
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid #808080",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "#000080",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: "inset 1px 1px #808080, inset -1px -1px #dfdfdf",
            }}
          >
            👤
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 12 }}>{displayName}</div>
            <div style={{ fontSize: 10, color: "#444" }}>@{username}</div>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div style={{ padding: 16, textAlign: "center" }}>
            <div className="win98-progress-bar" style={{ width: "100%", height: 18 }} />
            <div style={{ marginTop: 8, fontSize: 11 }}>Loading...</div>
          </div>
        ) : (
          <>
            {tab === "week" && (
              <RetroBarChart entries={weekEntries} label="7-Day History" />
            )}

            {tab === "month" && (
              <RetroBarChart entries={monthEntries} label="Monthly History" />
            )}

            {tab === "newsletter" && (
              <div style={{ padding: "8px 12px" }}>
                {newsletter ? (
                  <div
                    className="win98-sunken"
                    style={{
                      background: "#ffffcc",
                      padding: 8,
                      lineHeight: 1.6,
                      maxHeight: 220,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "'VT323', monospace",
                      fontSize: 14,
                    }}
                  >
                    {newsletter}
                  </div>
                ) : (
                  <div
                    className="win98-sunken"
                    style={{
                      background: "#ffffff",
                      padding: 16,
                      textAlign: "center",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <div>No monthly review yet.</div>
                    <div style={{ color: "#666", marginTop: 4, fontSize: 10 }}>
                      Your first review will arrive after your first full month.
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "6px 12px",
            borderTop: "1px solid #808080",
            display: "flex",
            justifyContent: "flex-end",
            gap: 6,
          }}
        >
          <button className="win98-btn" onClick={loadStats} style={{ minWidth: 60 }}>
            🔄 Refresh
          </button>
          <button
            className="win98-btn"
            onClick={onSignOut}
            style={{ minWidth: 60, color: "#880000" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </Win98Window>
  );
};

export default ProfileWindow;
