import { useState, useEffect, useCallback, useRef } from "react";

interface TimeWindowState {
  isOpen: boolean;
  countdown: string;
  phase: "before" | "open" | "closed";
  message: string;
}

const OPEN_HOUR = 21; // 9 PM

// Helper to get local date string (YYYY-MM-DD) without timezone conversion
export const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useTimeWindow = () => {
  const [state, setState] = useState<TimeWindowState>(() => calculateState());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update immediately then every second
    setState(calculateState());
    intervalRef.current = setInterval(() => {
      setState(calculateState());
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return state;
};

function calculateState(): TimeWindowState {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  // Convert current time to seconds from midnight
  const currentSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
  const openSeconds = OPEN_HOUR * 3600; // 9 PM = 21:00 = 75600 seconds
  const midnightSeconds = 24 * 3600; // 86400 seconds

  let isOpen = false;
  let countdown = "";
  let phase: "before" | "open" | "closed" = "before";
  let message = "";

  if (currentHour >= OPEN_HOUR) {
    // Window is open (9 PM - midnight)
    isOpen = true;
    phase = "open";
    
    // Countdown to midnight
    const remainingSeconds = midnightSeconds - currentSeconds;
    countdown = formatCountdown(remainingSeconds);
    message = "Time left to log today";
  } else {
    // Before 9 PM (includes after midnight which resets to new day)
    isOpen = false;
    phase = "before";
    
    // Countdown to 9 PM today
    const remainingSeconds = openSeconds - currentSeconds;
    countdown = formatCountdown(remainingSeconds);
    message = "You still have time to make today great!";
  }

  return { isOpen, countdown, phase, message };
}

function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
