// Shared formatting utility functions

/**
 * Format duration in seconds to MM:SS format
 * Used by voice recording/playback components
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format a date string to a readable format
 */
export const formatDateString = (dateStr: string): string => {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
