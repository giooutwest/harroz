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

// Muted rust (low) → sage (high) scale
const BAR_COLORS = [
  "#A8523F", "#AD5C42", "#B26647", "#B4744C", "#B08255",
  "#A38F5E", "#909A66", "#7CA26C", "#6B9670", "#5E8A6A",
];

function ratingColor(r: number): string {
  return BAR_COLORS[Math.min(Math.max(r, 1), 10) - 1];
}

const RetroBarChart = ({ entries, label }: { entries: DayEntry[]; label: string }) => {
  if (entries.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "hsl(var(--ink-soft))" }}>
        No entries yet.
      </div>
    );
  }

  const maxVal = 10;
  const barWidth = Math.max(16, Math.floor(220 / entries.length) - 3);
  const chartH = 100;
  const avg = entries.reduce((s, e) => s + e.rating, 0) / entries.length;

  return (
    <div style={{ padding: "10px 14px" }}>
      <div style={{ fontSize: 12, marginBottom: 8, color: "hsl(var(--ink-soft))" }}>
        {label} — Avg: <strong className="font-journal-display" style={{ color: "hsl(var(--ink))" }}>{avg.toFixed(1)}</strong> / 10
      </div>

      {/* Chart */}
      <div
        className="journal-well"
        style={{
          padding: "10px 10px 6px",
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
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
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              title={`${e.date}: ${e.rating}/10`}
            >
              <span className="font-journal-display" style={{ fontSize: 11, lineHeight: 1, color: "hsl(var(--ink-soft))" }}>
                {e.rating}
              </span>
              <div
                style={{
                  width: barWidth,
                  height: Math.max(barH, 3),
                  background: ratingColor(e.rating),
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, color: "hsl(var(--ink-soft))", lineHeight: 1 }}>{dayLabel}</span>
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
        setNewsletter(`${period} Monthly Review\n\n${nlData.content}`);
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
      className={`journal-tab${tab === t ? " active" : ""}`}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  );

  return (
    <Win98Window
      title={`${displayName} · Analytics`}
      onClose={onClose}
      initialX={20}
      initialY={60}
      width={280}
      menuBar={
        <div style={{ display: "flex", gap: 4 }}>
          {tabBtn("week", "Week")}
          {tabBtn("month", "Month")}
          {tabBtn("newsletter", "Review")}
        </div>
      }
    >
      <div>
        {/* User identity */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid hsl(var(--line))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "hsl(var(--accent) / 0.15)",
              color: "hsl(var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-journal-display" style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
            <div style={{ fontSize: 12, color: "hsl(var(--ink-soft))" }}>@{username}</div>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <div className="journal-progress-bar" style={{ width: "100%", height: 4 }} />
            <div style={{ marginTop: 10, fontSize: 13, color: "hsl(var(--ink-soft))" }}>Loading...</div>
          </div>
        ) : (
          <>
            {tab === "week" && (
              <RetroBarChart entries={weekEntries} label="Past 7 days" />
            )}

            {tab === "month" && (
              <RetroBarChart entries={monthEntries} label="This month" />
            )}

            {tab === "newsletter" && (
              <div style={{ padding: "10px 14px" }}>
                {newsletter ? (
                  <div
                    className="journal-well"
                    style={{
                      padding: 12,
                      lineHeight: 1.6,
                      maxHeight: 220,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: 13,
                    }}
                  >
                    {newsletter}
                  </div>
                ) : (
                  <div
                    className="journal-well"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: 13,
                      color: "hsl(var(--ink-soft))",
                    }}
                  >
                    <div>No monthly review yet.</div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
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
            padding: "10px 14px",
            borderTop: "1px solid hsl(var(--line))",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button className="journal-btn" onClick={loadStats}>
            Refresh
          </button>
          <button
            className="journal-btn"
            onClick={onSignOut}
            style={{ color: "hsl(var(--accent))" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </Win98Window>
  );
};

export default ProfileWindow;
