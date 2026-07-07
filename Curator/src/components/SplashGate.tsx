import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { loadSplashQuotes, pickRandomSplashQuote, recordSplashQuoteSeen, type SplashQuote } from "../lib/splashQuotes";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { OpeningCurtainSplash } from "./OpeningCurtainSplash";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type SplashGateProps = {
  children: ReactNode;
};

export function SplashGate({ children }: SplashGateProps) {
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [quote, setQuote] = useState<SplashQuote | null>(null);
  const [quoteProgress, setQuoteProgress] = useState<{ seen: number; total: number } | null>(null);
  const [showCurtain, setShowCurtain] = useState(true);
  const [quotesReady, setQuotesReady] = useState(false);

  useEffect(() => {
    let active = true;

    void loadSplashQuotes()
      .then(async (quotes) => {
        if (!active) {
          return;
        }

        const picked = pickRandomSplashQuote(quotes);
        const seen = await recordSplashQuoteSeen(picked);
        setQuoteProgress({ seen, total: quotes.length });
        setQuote(picked);
        setQuotesReady(true);
        void SplashScreen.hideAsync();
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setShowCurtain(false);
        setQuotesReady(true);
        void SplashScreen.hideAsync();
      });

    return () => {
      active = false;
    };
  }, []);

  const splashReady = quotesReady && themeReady;

  return (
    <View style={styles.root}>
      {children}
      {!splashReady ? <View style={styles.bootCover} /> : null}
      {splashReady && showCurtain && quote && quoteProgress ? (
        <OpeningCurtainSplash
          quote={quote}
          seenCount={quoteProgress.seen}
          totalCount={quoteProgress.total}
          onFinish={() => setShowCurtain(false)}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    root: {
      flex: 1
    },
    bootCover: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      zIndex: 99
    }
  });
}
