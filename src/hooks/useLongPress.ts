import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for handling long press interactions
 * @param onLongPress - Callback fired when long press is detected
 * @param onClick - Callback fired on regular click (if not long pressed)
 * @param ms - Milliseconds to wait before triggering long press (default: 500)
 */
export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  ms = 500
) {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (startLongPress) {
      timerRef.current = setTimeout(() => {
        onLongPress();
        setStartLongPress(false);
      }, ms);
    } else {
      clearTimeout(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [startLongPress, onLongPress, ms]);

  const handlers = {
    onMouseDown: useCallback(() => setStartLongPress(true), []),
    onMouseUp: useCallback(() => {
      if (startLongPress) {
        onClick();
      }
      setStartLongPress(false);
    }, [startLongPress, onClick]),
    onTouchStart: useCallback(() => setStartLongPress(true), []),
    onTouchEnd: useCallback(() => {
      if (startLongPress) {
        onClick();
      }
      setStartLongPress(false);
    }, [startLongPress, onClick]),
  };

  return handlers;
}
