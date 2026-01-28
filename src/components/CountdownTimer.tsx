import { memo } from "react";
import { Clock, Lock } from "lucide-react";
import { useTimeWindow } from "@/hooks/useTimeWindow";

/**
 * Memoized countdown timer component that updates every second
 * without causing parent re-renders. Isolated from TodayTab to prevent
 * the entire mood view from flickering.
 */
const CountdownTimer = memo(() => {
  const timeWindow = useTimeWindow();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="w-full max-w-sm mx-auto mb-6 p-4 bg-secondary border border-border text-center rounded-2xl">
      <div className="flex items-center justify-center gap-2 mb-2">
        {timeWindow.phase === "before" ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Clock className="w-4 h-4 text-primary" />
        )}
        <span className="text-muted-foreground text-xs">
          {timeWindow.message}
        </span>
      </div>
      <span
        className={`font-bold font-mono tabular-nums text-2xl ${timeWindow.phase === "open" ? "text-primary" : "text-foreground"}`}
      >
        {timeWindow.countdown}
      </span>
      <p className="mt-2 text-muted-foreground text-xs">
        {timeWindow.phase === "before" ? "Take time to enjoy your day! ✨" : `🕐 ${timezone}`}
      </p>
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";

export default CountdownTimer;
