import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";
import type { SplashQuote } from "../lib/splashQuotes";
import { mix } from "../lib/colorUtils";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const QUOTE_HOLD_MS = 3200;
const CURTAIN_OPEN_MS = 900;

type OpeningCurtainSplashProps = {
  quote: SplashQuote;
  seenCount: number;
  totalCount: number;
  onFinish: () => void;
};

export function OpeningCurtainSplash({ quote, seenCount, totalCount, onFinish }: OpeningCurtainSplashProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const leftCurtain = useRef(new Animated.Value(0)).current;
  const rightCurtain = useRef(new Animated.Value(0)).current;
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const fadeIn = Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(quoteOpacity, {
        toValue: 1,
        duration: 650,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    const openCurtains = Animated.parallel([
      Animated.timing(leftCurtain, {
        toValue: -SCREEN_WIDTH / 2,
        duration: CURTAIN_OPEN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(rightCurtain, {
        toValue: SCREEN_WIDTH / 2,
        duration: CURTAIN_OPEN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(quoteOpacity, {
        toValue: 0,
        duration: 420,
        delay: 120,
        useNativeDriver: true
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true
      })
    ]);

    fadeIn.start(({ finished }) => {
      if (!finished || cancelled) {
        return;
      }

      holdTimer = setTimeout(() => {
        openCurtains.start(({ finished: openFinished }) => {
          if (openFinished && !cancelled) {
            onFinish();
          }
        });
      }, QUOTE_HOLD_MS);
    });

    return () => {
      cancelled = true;
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      fadeIn.stop();
      openCurtains.stop();
    };
  }, [leftCurtain, onFinish, quoteOpacity, rightCurtain, titleOpacity]);

  return (
    <View style={styles.root} pointerEvents="auto">
      <View style={styles.quoteLayer} pointerEvents="none">
        <Animated.Text style={[styles.appName, { opacity: titleOpacity }]}>Curator</Animated.Text>
        <Animated.View style={[styles.quoteBlock, { opacity: quoteOpacity }]}>
          <Text style={styles.quote}>"{quote.quote}"</Text>
          <Text style={styles.source}>— {quote.source}</Text>
        </Animated.View>
        <Animated.Text style={[styles.progress, { opacity: quoteOpacity }]}>
          {seenCount} out of {totalCount} quotes found
        </Animated.Text>
      </View>

      <Animated.View
        style={[
          styles.curtain,
          styles.curtainLeft,
          { transform: [{ translateX: leftCurtain }] }
        ]}
      />
      <Animated.View
        style={[
          styles.curtain,
          styles.curtainRight,
          { transform: [{ translateX: rightCurtain }] }
        ]}
      />
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  const curtain = mix(colors.accent, colors.background, 0.28);
  const curtainEdge = mix(colors.accent, "#000000", 0.72);

  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      zIndex: 100
    },
    quoteLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      backgroundColor: colors.background,
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      zIndex: 2
    },
    appName: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 2.4,
      marginBottom: spacing.lg,
      textTransform: "uppercase"
    },
    quoteBlock: {
      gap: spacing.md,
      maxWidth: 340
    },
    quote: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 30,
      textAlign: "center"
    },
    source: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
      textAlign: "center"
    },
    progress: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      marginTop: spacing.xl,
      textAlign: "center",
      textTransform: "uppercase"
    },
    curtain: {
      backgroundColor: curtain,
      height: SCREEN_HEIGHT,
      position: "absolute",
      top: 0,
      width: SCREEN_WIDTH / 2,
      zIndex: 1
    },
    curtainLeft: {
      borderRightColor: curtainEdge,
      borderRightWidth: 2,
      left: 0
    },
    curtainRight: {
      borderLeftColor: curtainEdge,
      borderLeftWidth: 2,
      right: 0
    }
  });
}
