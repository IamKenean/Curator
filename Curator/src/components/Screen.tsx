import { useEffect, useRef, type ReactNode } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

type ScreenProps = {
  title?: string;
  children: ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  stickyHeaderIndices?: ScrollViewProps["stickyHeaderIndices"];
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  children,
  scroll = true,
  scrollEnabled = true,
  stickyHeaderIndices,
  edges,
  contentContainerStyle
}: ScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    scrollRef.current?.setNativeProps({ scrollEnabled });
  }, [scrollEnabled]);

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={styles.safe}>
        <ScrollView
          ref={scrollRef}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          stickyHeaderIndices={stickyHeaderIndices}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 3
  },
  content: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8
  }
});
