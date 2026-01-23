import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHaptic = () => {
  const trigger = useCallback((type: HapticType = 'medium') => {
    // Check if Navigator is available (Mobile)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(10); // Tiny tick
          break;
        case 'medium':
          navigator.vibrate(20); // Normal click
          break;
        case 'heavy':
          navigator.vibrate(40); // Heavy thud
          break;
        case 'success':
          navigator.vibrate([10, 30, 10]); // Da-da-da
          break;
        case 'warning':
          navigator.vibrate([30, 50, 10]); 
          break;
        case 'error':
          navigator.vibrate([50, 50, 50]); // Buzz-buzz-buzz
          break;
      }
    }
  }, []);

  return { trigger };
};