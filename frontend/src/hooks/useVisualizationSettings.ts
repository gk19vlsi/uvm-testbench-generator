/**
 * useVisualizationSettings Hook
 * React hook for managing visualization settings with persistence
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  VisualizationPersistence,
  VisualizationSettings,
} from "../services/VisualizationPersistence";
import { ViewTransform } from "../types/simulation";

interface UseVisualizationSettingsOptions {
  projectId: string;
  autoSave?: boolean;
  saveDelay?: number; // Debounce delay in ms
}

interface UseVisualizationSettingsReturn {
  settings: VisualizationSettings;
  viewTransform: ViewTransform;
  selectedSignals: string[];
  expandedComponents: Record<string, boolean>;
  theme: "light" | "dark";

  // Update methods
  setViewTransform: (transform: ViewTransform) => void;
  setSelectedSignals: (signals: string[]) => void;
  setExpandedComponents: (components: Record<string, boolean>) => void;
  setTheme: (theme: "light" | "dark") => void;

  // Persistence methods
  saveSettings: () => void;
  resetSettings: () => void;

  // Status
  isLoaded: boolean;
  isSaving: boolean;
}

/**
 * Hook for managing visualization settings with automatic persistence
 */
export const useVisualizationSettings = ({
  projectId,
  autoSave = true,
  saveDelay = 1000,
}: UseVisualizationSettingsOptions): UseVisualizationSettingsReturn => {
  const [settings, setSettings] = useState<VisualizationSettings>(() => {
    // Try to load settings from localStorage on mount
    const loaded = VisualizationPersistence.loadSettings(projectId);
    return loaded || VisualizationPersistence.getDefaultSettings(projectId);
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousProjectIdRef = useRef<string>(projectId);

  // Load settings when projectId changes
  useEffect(() => {
    if (projectId !== previousProjectIdRef.current) {
      // Project switched, load new settings
      const loaded = VisualizationPersistence.loadSettings(projectId);
      if (loaded) {
        setSettings(loaded);
      } else {
        setSettings(VisualizationPersistence.getDefaultSettings(projectId));
      }
      previousProjectIdRef.current = projectId;
    }
    setIsLoaded(true);
  }, [projectId]);

  // Debounced save function
  const debouncedSave = useCallback(
    (settingsToSave: VisualizationSettings) => {
      if (!autoSave) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        VisualizationPersistence.saveSettings(settingsToSave);
        setIsSaving(false);
      }, saveDelay);
    },
    [autoSave, saveDelay],
  );

  // Update settings and trigger save
  const updateSettings = useCallback(
    (updates: Partial<VisualizationSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        debouncedSave(newSettings);
        return newSettings;
      });
    },
    [debouncedSave],
  );

  // Set view transform
  const setViewTransform = useCallback(
    (transform: ViewTransform) => {
      const { zoomLevel, panOffset } =
        VisualizationPersistence.viewTransformToSettings(transform);
      updateSettings({ zoomLevel, panOffset });
    },
    [updateSettings],
  );

  // Set selected signals
  const setSelectedSignals = useCallback(
    (signals: string[]) => {
      updateSettings({ selectedSignals: signals });
    },
    [updateSettings],
  );

  // Set expanded components
  const setExpandedComponents = useCallback(
    (components: Record<string, boolean>) => {
      updateSettings({ expandedComponents: components });
    },
    [updateSettings],
  );

  // Set theme
  const setTheme = useCallback(
    (theme: "light" | "dark") => {
      updateSettings({ theme });
    },
    [updateSettings],
  );

  // Manual save
  const saveSettings = useCallback(() => {
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    VisualizationPersistence.saveSettings(settings);
    setIsSaving(false);
  }, [settings]);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    const defaultSettings =
      VisualizationPersistence.getDefaultSettings(projectId);
    setSettings(defaultSettings);
    if (autoSave) {
      VisualizationPersistence.saveSettings(defaultSettings);
    }
  }, [projectId, autoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Convert settings to ViewTransform
  const viewTransform = VisualizationPersistence.settingsToViewTransform({
    zoomLevel: settings.zoomLevel,
    panOffset: settings.panOffset,
  });

  return {
    settings,
    viewTransform,
    selectedSignals: settings.selectedSignals,
    expandedComponents: settings.expandedComponents,
    theme: settings.theme,
    setViewTransform,
    setSelectedSignals,
    setExpandedComponents,
    setTheme,
    saveSettings,
    resetSettings,
    isLoaded,
    isSaving,
  };
};
