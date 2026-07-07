import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPremadeAppTheme } from "../lib/premadeAppThemes";
import type { PosterThemeConfig } from "../lib/posterPalette";
import { clearPosterTheme, loadPosterTheme, savePosterTheme } from "../lib/posterThemeStorage";
import {
  APP_THEME_STORAGE_KEY,
  colorsForMode,
  defaultColors,
  normalizeStoredThemeMode,
  THEME_STORAGE_KEY,
  type ColorScheme,
  type ThemeMode
} from "../theme/colorSchemes";
import { setActiveThemeColors } from "../theme/activeColors";

type ThemeContextValue = {
  colors: ColorScheme;
  mode: ThemeMode;
  appThemeId: string | null;
  isAppTheme: boolean;
  posterTheme: PosterThemeConfig | null;
  isPosterTheme: boolean;
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
  applyAppTheme: (themeId: string) => Promise<void>;
  applyPosterTheme: (theme: PosterThemeConfig) => Promise<void>;
  resetToDefaultTheme: () => Promise<void>;
  clearPosterTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  mode: "default",
  appThemeId: null,
  isAppTheme: false,
  posterTheme: null,
  isPosterTheme: false,
  ready: false,
  setMode: () => {},
  applyAppTheme: async () => {},
  applyPosterTheme: async () => {},
  resetToDefaultTheme: async () => {},
  clearPosterTheme: async () => {}
});

function resolveAppPalette(appThemeId: string | null): ColorScheme | null {
  if (!appThemeId) {
    return null;
  }

  return getPremadeAppTheme(appThemeId)?.palette ?? null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("default");
  const [appThemeId, setAppThemeId] = useState<string | null>(null);
  const [posterTheme, setPosterTheme] = useState<PosterThemeConfig | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(APP_THEME_STORAGE_KEY),
      loadPosterTheme()
    ])
      .then(([storedMode, storedAppThemeId, storedPosterTheme]) => {
        const nextAppThemeId = storedAppThemeId && getPremadeAppTheme(storedAppThemeId) ? storedAppThemeId : null;
        const nextMode = normalizeStoredThemeMode(storedMode);

        setPosterTheme(storedPosterTheme);
        setAppThemeId(nextAppThemeId);

        if (nextMode === "poster" && storedPosterTheme) {
          setModeState("poster");
          return;
        }

        if (nextMode === "app" && nextAppThemeId) {
          setModeState("app");
          return;
        }

        setModeState("default");
      })
      .finally(() => setReady(true));
  }, []);

  const persistMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (next === "poster") {
        persistMode("poster");
        return;
      }

      if (next === "app" && appThemeId) {
        persistMode("app");
        return;
      }

      persistMode("default");
    },
    [appThemeId, persistMode]
  );

  const applyAppTheme = useCallback(
    async (themeId: string) => {
      if (!getPremadeAppTheme(themeId)) {
        return;
      }

      await AsyncStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
      setAppThemeId(themeId);
      persistMode("app");
    },
    [persistMode]
  );

  const applyPosterTheme = useCallback(
    async (theme: PosterThemeConfig) => {
      await savePosterTheme(theme);
      setPosterTheme(theme);
      persistMode("poster");
    },
    [persistMode]
  );

  const resetToDefaultTheme = useCallback(async () => {
    await clearPosterTheme();
    await AsyncStorage.removeItem(APP_THEME_STORAGE_KEY);
    setPosterTheme(null);
    setAppThemeId(null);
    persistMode("default");
  }, [persistMode]);

  const clearPosterThemeState = useCallback(async () => {
    await clearPosterTheme();
    setPosterTheme(null);
    persistMode(appThemeId ? "app" : "default");
  }, [appThemeId, persistMode]);

  const appPalette = useMemo(() => resolveAppPalette(appThemeId), [appThemeId]);

  const resolvedColors = useMemo(
    () => colorsForMode(mode, { posterPalette: posterTheme?.palette, appPalette }),
    [mode, posterTheme, appPalette]
  );

  useEffect(() => {
    setActiveThemeColors(ready ? resolvedColors : defaultColors);
  }, [ready, resolvedColors]);

  const value = useMemo(
    () => ({
      colors: resolvedColors,
      mode,
      appThemeId,
      isAppTheme: mode === "app" && appPalette != null,
      posterTheme,
      isPosterTheme: mode === "poster" && posterTheme != null,
      ready,
      setMode,
      applyAppTheme,
      applyPosterTheme,
      resetToDefaultTheme,
      clearPosterTheme: clearPosterThemeState
    }),
    [
      mode,
      appThemeId,
      appPalette,
      posterTheme,
      ready,
      resolvedColors,
      setMode,
      applyAppTheme,
      applyPosterTheme,
      resetToDefaultTheme,
      clearPosterThemeState
    ]
  );

  if (!ready) {
    return (
      <ThemeContext.Provider
        value={{
          colors: defaultColors,
          mode: "default",
          appThemeId: null,
          isAppTheme: false,
          posterTheme: null,
          isPosterTheme: false,
          ready: false,
          setMode: () => {},
          applyAppTheme: async () => {},
          applyPosterTheme: async () => {},
          resetToDefaultTheme: async () => {},
          clearPosterTheme: async () => {}
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
