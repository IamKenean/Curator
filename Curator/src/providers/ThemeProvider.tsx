import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  colorsForMode,
  defaultColors,
  THEME_STORAGE_KEY,
  type ColorScheme,
  type ThemeMode
} from "../theme/colorSchemes";

type ThemeContextValue = {
  colors: ColorScheme;
  mode: ThemeMode;
  isSuperDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleSuperDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  mode: "default",
  isSuperDark: false,
  setMode: () => {},
  toggleSuperDark: () => {}
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("default");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === "superDark" || stored === "default") {
          setModeState(stored);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggleSuperDark = useCallback(() => {
    setMode(mode === "superDark" ? "default" : "superDark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      colors: colorsForMode(mode),
      mode,
      isSuperDark: mode === "superDark",
      setMode,
      toggleSuperDark
    }),
    [mode, setMode, toggleSuperDark]
  );

  if (!ready) {
    return (
      <ThemeContext.Provider
        value={{
          colors: defaultColors,
          mode: "default",
          isSuperDark: false,
          setMode: () => {},
          toggleSuperDark: () => {}
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
