/**
 * Color Palette Service
 * Manages color assignments for signal types and theme support
 * Integrated with Tailwind CSS design system
 */

import { Signal } from "../types/simulation";

export type Theme = "light" | "dark";

export interface ColorPalette {
  clock: string;
  data: string;
  control: string;
  background: string;
  grid: string;
  text: string;
  border: string;
}

/**
 * Design system colors from Tailwind CSS
 */
const DESIGN_SYSTEM_COLORS = {
  // Primary colors (blue)
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  // Green colors
  green: {
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
  },
  // Amber colors
  amber: {
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
  },
  // Gray colors
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

/**
 * Light theme color palette using design system colors
 */
const LIGHT_PALETTE: ColorPalette = {
  clock: DESIGN_SYSTEM_COLORS.green[500], // Green-500
  data: DESIGN_SYSTEM_COLORS.primary[500], // Primary-500 (blue)
  control: DESIGN_SYSTEM_COLORS.amber[500], // Amber-500
  background: DESIGN_SYSTEM_COLORS.gray[800], // Gray-800 for canvas
  grid: DESIGN_SYSTEM_COLORS.gray[700], // Gray-700
  text: DESIGN_SYSTEM_COLORS.gray[50], // Gray-50
  border: DESIGN_SYSTEM_COLORS.gray[600], // Gray-600
};

/**
 * Dark theme color palette using design system colors
 */
const DARK_PALETTE: ColorPalette = {
  clock: DESIGN_SYSTEM_COLORS.green[400], // Lighter green-400
  data: DESIGN_SYSTEM_COLORS.primary[400], // Lighter primary-400 (blue)
  control: DESIGN_SYSTEM_COLORS.amber[400], // Lighter amber-400
  background: DESIGN_SYSTEM_COLORS.gray[900], // Gray-900 for canvas
  grid: DESIGN_SYSTEM_COLORS.gray[800], // Gray-800
  text: DESIGN_SYSTEM_COLORS.gray[100], // Gray-100
  border: DESIGN_SYSTEM_COLORS.gray[700], // Gray-700
};

/**
 * ColorPalette class
 * Provides color assignment and theme management
 */
export class ColorPaletteService {
  private currentTheme: Theme;
  private palette: ColorPalette;

  constructor(theme: Theme = "light") {
    this.currentTheme = theme;
    this.palette = theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  }

  /**
   * Get color for a signal type
   */
  getSignalColor(signalType: Signal["type"]): string {
    switch (signalType) {
      case "clock":
        return this.palette.clock;
      case "data":
        return this.palette.data;
      case "control":
        return this.palette.control;
      default:
        return this.palette.data; // Default to data color
    }
  }

  /**
   * Get color for a specific signal
   * Uses signal's custom color if provided, otherwise uses type-based color
   */
  getColorForSignal(signal: Signal): string {
    if (signal.color) {
      return signal.color;
    }
    return this.getSignalColor(signal.type);
  }

  /**
   * Get background color
   */
  getBackgroundColor(): string {
    return this.palette.background;
  }

  /**
   * Get grid color
   */
  getGridColor(): string {
    return this.palette.grid;
  }

  /**
   * Get text color
   */
  getTextColor(): string {
    return this.palette.text;
  }

  /**
   * Get border color
   */
  getBorderColor(): string {
    return this.palette.border;
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Set theme and update palette
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.palette = theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  }

  /**
   * Get full palette
   */
  getPalette(): ColorPalette {
    return { ...this.palette };
  }

  /**
   * Assign colors to an array of signals
   * Ensures distinct colors for different signal types
   */
  assignColorsToSignals(signals: Signal[]): Signal[] {
    return signals.map((signal) => ({
      ...signal,
      color: this.getColorForSignal(signal),
    }));
  }

  /**
   * Validate that all signal types have distinct colors
   */
  validateDistinctColors(): boolean {
    const colors = new Set([
      this.palette.clock,
      this.palette.data,
      this.palette.control,
    ]);
    return colors.size === 3; // All three types should have different colors
  }

  /**
   * Get color with opacity
   */
  getColorWithOpacity(color: string, opacity: number): string {
    // Convert hex to rgba
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Get design system color
   * Provides access to the full Tailwind color palette
   */
  getDesignSystemColor(
    color: keyof typeof DESIGN_SYSTEM_COLORS,
    shade: string,
  ): string {
    const colorGroup = DESIGN_SYSTEM_COLORS[color];
    if (colorGroup && shade in colorGroup) {
      return colorGroup[shade as keyof typeof colorGroup];
    }
    return DESIGN_SYSTEM_COLORS.gray[500]; // Default fallback
  }

  /**
   * Get all design system colors
   */
  getDesignSystemColors(): typeof DESIGN_SYSTEM_COLORS {
    return DESIGN_SYSTEM_COLORS;
  }
}

// Export singleton instance
export const colorPalette = new ColorPaletteService();
