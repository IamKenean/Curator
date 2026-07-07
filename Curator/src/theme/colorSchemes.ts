export type ColorScheme = {
  background: string;
  card: string;
  accent: string;
  star: string;
  text: string;
  muted: string;
  border: string;
  success: string;
};

export const defaultColors: ColorScheme = {
  background: "#0F0F0F",
  card: "#1A1A1A",
  accent: "#E63946",
  star: "#E50914",
  text: "#F5F5F5",
  muted: "#A7A7A7",
  border: "#2A2A2A",
  success: "#51CF66"
};

export type ThemeMode = "default" | "app" | "poster";

export const THEME_STORAGE_KEY = "curator.themeMode";
export const APP_THEME_STORAGE_KEY = "curator.appThemeId";

export function colorsForMode(
  mode: ThemeMode,
  options?: { posterPalette?: ColorScheme | null; appPalette?: ColorScheme | null }
): ColorScheme {
  if (mode === "poster" && options?.posterPalette) {
    return options.posterPalette;
  }

  if (mode === "app" && options?.appPalette) {
    return options.appPalette;
  }

  return defaultColors;
}

export function normalizeStoredThemeMode(value: string | null): ThemeMode {
  if (value === "poster" || value === "app") {
    return value;
  }
  return "default";
}
