// Shared mood utility functions
// Extracted to avoid duplication across 8+ component files

/**
 * Get the color for a mood rating (1-10)
 * Uses HSL values for consistency
 */
export const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";    // Red - Stormy
  if (rating <= 4) return "hsl(30, 80%, 55%)";   // Orange - Rainy
  if (rating <= 6) return "hsl(50, 90%, 55%)";   // Yellow - Cloudy
  if (rating <= 8) return "hsl(140, 55%, 45%)";  // Green - Partly sunny
  return "hsl(210, 80%, 55%)";                    // Blue - Sunny
};

/**
 * Get hex color for mood (used by some chart components)
 */
export const getMoodColorHex = (rating: number): string => {
  if (rating <= 2) return "#ef4444"; // Red
  if (rating <= 4) return "#f97316"; // Orange
  if (rating <= 6) return "#eab308"; // Yellow
  if (rating <= 8) return "#84cc16"; // Lime
  return "#22c55e";                   // Green
};

/**
 * Get the label for a mood rating
 */
export const getMoodLabel = (rating: number): string => {
  if (rating <= 2) return "Stormy";
  if (rating <= 4) return "Rainy";
  if (rating <= 6) return "Cloudy";
  if (rating <= 8) return "Partly sunny";
  return "Bright & sunny!";
};

/**
 * Get short emoji label for mood
 */
export const getMoodEmoji = (rating: number): string => {
  if (rating <= 2) return "🌧️";
  if (rating <= 4) return "🌧";
  if (rating <= 6) return "☁️";
  if (rating <= 8) return "⛅";
  return "☀️";
};
