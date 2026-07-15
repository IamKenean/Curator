import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadMockDataSetting, setMockDataEnabled as persistMockDataEnabled } from "../lib/mockDataSettings";

type MockDataContextValue = {
  ready: boolean;
  mockDataEnabled: boolean;
  revision: number;
  setMockDataEnabled: (enabled: boolean) => Promise<void>;
};

const MockDataContext = createContext<MockDataContextValue | null>(null);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mockDataEnabled, setMockDataEnabledState] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void loadMockDataSetting().then((enabled) => {
      if (cancelled) {
        return;
      }

      setMockDataEnabledState(enabled);
      setRevision((current) => current + 1);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMockDataEnabled = useCallback(async (enabled: boolean) => {
    await persistMockDataEnabled(enabled);
    setMockDataEnabledState(enabled);
    setRevision((current) => current + 1);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      mockDataEnabled,
      revision,
      setMockDataEnabled
    }),
    [mockDataEnabled, ready, revision, setMockDataEnabled]
  );

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used within MockDataProvider");
  }

  return context;
}
