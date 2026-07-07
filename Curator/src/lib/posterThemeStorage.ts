import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PosterThemeConfig } from "./posterPalette";

export const POSTER_THEME_STORAGE_KEY = "curator.posterTheme";

export async function loadPosterTheme(): Promise<PosterThemeConfig | null> {
  const raw = await AsyncStorage.getItem(POSTER_THEME_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PosterThemeConfig;
  } catch {
    return null;
  }
}

export async function savePosterTheme(theme: PosterThemeConfig): Promise<void> {
  await AsyncStorage.setItem(POSTER_THEME_STORAGE_KEY, JSON.stringify(theme));
}

export async function clearPosterTheme(): Promise<void> {
  await AsyncStorage.removeItem(POSTER_THEME_STORAGE_KEY);
}
