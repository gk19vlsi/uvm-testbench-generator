/**
 * Visualization Persistence Service
 * Handles saving and loading visualization settings to/from localStorage
 */

import { ViewTransform } from "../types/simulation";

export interface VisualizationSettings {
  projectId: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  selectedSignals: string[];
  theme: "light" | "dark";
  expandedComponents: Record<string, boolean>;
  lastUpdated: number;
}

const STORAGE_KEY_PREFIX = "visualization_settings_";
const STORAGE_VERSION = "v1";

/**
 * VisualizationPersistence class
 * Manages persistence of visualization settings
 */
export class VisualizationPersistence {
  /**
   * Save visualization settings to localStorage
   */
  static saveSettings(settings: VisualizationSettings): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${settings.projectId}`;
      const data = {
        ...settings,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save visualization settings:", error);
      // Handle quota exceeded or other localStorage errors
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, clearing old settings");
        this.clearOldSettings();
        // Try again after clearing
        try {
          const key = `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${settings.projectId}`;
          localStorage.setItem(key, JSON.stringify(settings));
        } catch (retryError) {
          console.error("Failed to save settings after clearing:", retryError);
        }
      }
    }
  }

  /**
   * Load visualization settings from localStorage
   */
  static loadSettings(projectId: string): VisualizationSettings | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${projectId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const settings = JSON.parse(data) as VisualizationSettings;

      // Validate settings structure
      if (!this.validateSettings(settings)) {
        console.warn("Invalid settings structure, returning null");
        return null;
      }

      return settings;
    } catch (error) {
      console.error("Failed to load visualization settings:", error);
      return null;
    }
  }

  /**
   * Delete settings for a specific project
   */
  static deleteSettings(projectId: string): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${projectId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to delete visualization settings:", error);
    }
  }

  /**
   * Clear all visualization settings
   */
  static clearAllSettings(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to clear all settings:", error);
    }
  }

  /**
   * Clear old settings (older than 30 days)
   */
  static clearOldSettings(): void {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const settings = JSON.parse(data) as VisualizationSettings;
              if (settings.lastUpdated < thirtyDaysAgo) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // If we can't parse it, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error("Failed to clear old settings:", error);
    }
  }

  /**
   * Get default settings for a project
   */
  static getDefaultSettings(projectId: string): VisualizationSettings {
    return {
      projectId,
      zoomLevel: 1.0,
      panOffset: { x: 0, y: 0 },
      selectedSignals: [],
      theme: "light",
      expandedComponents: {},
      lastUpdated: Date.now(),
    };
  }

  /**
   * Validate settings structure
   */
  private static validateSettings(
    settings: any,
  ): settings is VisualizationSettings {
    return (
      typeof settings === "object" &&
      typeof settings.projectId === "string" &&
      typeof settings.zoomLevel === "number" &&
      typeof settings.panOffset === "object" &&
      typeof settings.panOffset.x === "number" &&
      typeof settings.panOffset.y === "number" &&
      Array.isArray(settings.selectedSignals) &&
      (settings.theme === "light" || settings.theme === "dark") &&
      typeof settings.expandedComponents === "object" &&
      typeof settings.lastUpdated === "number"
    );
  }

  /**
   * Convert ViewTransform to settings format
   */
  static viewTransformToSettings(transform: ViewTransform): {
    zoomLevel: number;
    panOffset: { x: number; y: number };
  } {
    return {
      zoomLevel: transform.scaleX,
      panOffset: { x: transform.offsetX, y: transform.offsetY },
    };
  }

  /**
   * Convert settings format to ViewTransform
   */
  static settingsToViewTransform(settings: {
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }): ViewTransform {
    return {
      offsetX: settings.panOffset.x,
      offsetY: settings.panOffset.y,
      scaleX: settings.zoomLevel,
      scaleY: 1.0,
    };
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}
