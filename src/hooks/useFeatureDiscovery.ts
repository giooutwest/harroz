import { useState, useEffect, useCallback } from "react";

// Feature IDs that can be discovered
export type FeatureId =
  | "gallery-upload"
  | "routine-tags"
  | "time-travel"
  | "fit-check"
  | "activity-insights"
  | "close-friends"
  | "journal"
  | "nudge";

const STORAGE_KEY = "roz-discovered-features";

export const useFeatureDiscovery = () => {
  const [discoveredFeatures, setDiscoveredFeatures] = useState<Set<FeatureId>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load discovered features from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FeatureId[];
        setDiscoveredFeatures(new Set(parsed));
      } catch {
        setDiscoveredFeatures(new Set());
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever discovered features change
  const saveFeatures = useCallback((features: Set<FeatureId>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...features]));
  }, []);

  // Mark a feature as discovered
  const markDiscovered = useCallback((featureId: FeatureId) => {
    setDiscoveredFeatures(prev => {
      const updated = new Set(prev);
      updated.add(featureId);
      saveFeatures(updated);
      return updated;
    });
  }, [saveFeatures]);

  // Check if a feature has been discovered
  const isDiscovered = useCallback((featureId: FeatureId) => {
    return discoveredFeatures.has(featureId);
  }, [discoveredFeatures]);

  // Check if we should show the feature tooltip (not discovered yet)
  const shouldShowTooltip = useCallback((featureId: FeatureId) => {
    return isLoaded && !discoveredFeatures.has(featureId);
  }, [isLoaded, discoveredFeatures]);

  // Reset all discovered features (for testing)
  const resetAll = useCallback(() => {
    setDiscoveredFeatures(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isDiscovered,
    markDiscovered,
    shouldShowTooltip,
    resetAll,
    isLoaded
  };
};
