/**
 * Static version of useTimeWindow that only calculates once on mount.
 * Use this for conditional logic that doesn't need live updates.
 * This prevents re-renders every second in parent components.
 */
export const useTimeWindowStatic = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const OPEN_HOUR = 21; // 9 PM

  const isOpen = currentHour >= OPEN_HOUR;
  const phase: "before" | "open" | "closed" = currentHour >= OPEN_HOUR ? "open" : "before";

  return { isOpen, phase };
};

export default useTimeWindowStatic;
