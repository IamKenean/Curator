import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { formatStarRating, ratingFromTouchX, starLabel } from "../lib/ratings";
import { colors, spacing } from "../theme";

type StarRatingPickerProps = {
  value: number;
  onChange: (value: number) => void;
  isFavorite?: boolean;
  onFavoriteChange?: (value: boolean) => void;
  showFavorite?: boolean;
  showClear?: boolean;
  compact?: boolean;
  sendStyle?: boolean;
  emptyLabel?: string;
  starEmptyColor?: string;
  onInteractionChange?: (active: boolean) => void;
};

const STAR_COUNT = 5;
const STAR_SIZE = 36;
const DRAG_THRESHOLD = 8;
const TRACK_SLOT_HEIGHT = STAR_SIZE + spacing.sm * 2;

function iconForStar(starIndex: number, value: number): keyof typeof Ionicons.glyphMap {
  const full = starIndex + 1;
  const half = starIndex + 0.5;

  if (value >= full) {
    return "star";
  }

  if (value >= half) {
    return "star-half";
  }

  return "star-outline";
}

export function StarRatingPicker({
  value,
  onChange,
  isFavorite = false,
  onFavoriteChange,
  showFavorite = true,
  showClear = true,
  compact = false,
  sendStyle = false,
  emptyLabel = "Not sure",
  starEmptyColor = colors.border,
  onInteractionChange
}: StarRatingPickerProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const lastHapticValue = useRef(0);

  const activeValue = hoverValue || value;

  function setInteraction(active: boolean) {
    onInteractionChange?.(active);
  }

  function resetDrag() {
    setHoverValue(0);
    lastHapticValue.current = 0;
    setInteraction(false);
  }

  function ratingAtX(x: number) {
    return ratingFromTouchX(x, trackWidth);
  }

  function triggerHaptic() {
    if (Platform.OS === "web") {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function previewRating(x: number) {
    const next = ratingAtX(x);
    setHoverValue(next);

    if (next !== lastHapticValue.current) {
      lastHapticValue.current = next;
      if (next > 0) {
        triggerHaptic();
      }
    }
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setInteraction(true);
        },
        onPanResponderMove: (event, gestureState) => {
          if (Math.hypot(gestureState.dx, gestureState.dy) < DRAG_THRESHOLD) {
            return;
          }

          previewRating(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event, gestureState) => {
          const next = ratingAtX(event.nativeEvent.locationX);
          onChange(next);

          if (Math.hypot(gestureState.dx, gestureState.dy) < DRAG_THRESHOLD) {
            triggerHaptic();
          }

          resetDrag();
        },
        onPanResponderTerminate: resetDrag
      }),
    [onChange, trackWidth]
  );

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={[styles.wrap, sendStyle && styles.wrapSend]}>
      {!compact && !sendStyle ? <Text style={styles.label}>Your rating</Text> : null}

      {!sendStyle ? (
        <View style={[styles.display, compact && styles.displayCompact]}>
          <Text style={[styles.number, compact && styles.numberCompact]}>{formatStarRating(activeValue || value)}</Text>
          {(activeValue || value) > 0 ? <Text style={styles.caption}>{starLabel(activeValue || value)}</Text> : null}
        </View>
      ) : null}

      <View style={[styles.trackSlot, sendStyle && styles.trackSlotSend]}>
        <View onLayout={handleLayout} style={[styles.track, sendStyle && styles.trackSend]} {...panResponder.panHandlers}>
          {Array.from({ length: STAR_COUNT }, (_, index) => {
            const icon = iconForStar(index, activeValue);
            const filled = activeValue >= index + 0.5;

            return (
              <View key={index} style={[styles.starButton, sendStyle && styles.starButtonSend]}>
                <Ionicons
                  name={icon}
                  size={sendStyle ? 26 : STAR_SIZE}
                  color={filled ? colors.star : starEmptyColor}
                />
              </View>
            );
          })}
        </View>
      </View>

      {sendStyle ? (
        <Text style={styles.sendLabel}>{(activeValue || value) > 0 ? starLabel(activeValue || value) : emptyLabel}</Text>
      ) : null}

      {!sendStyle && (showClear || (showFavorite && onFavoriteChange)) && (
        <View style={styles.footer}>
          {showClear ? (
            <Pressable disabled={!value} onPress={() => onChange(0)} style={[styles.clearBtn, !value && styles.clearBtnDisabled]}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
          {showFavorite && onFavoriteChange ? (
            <Pressable onPress={() => onFavoriteChange(!isFavorite)} style={[styles.heartBtn, isFavorite && styles.heartBtnActive]}>
              <Text style={[styles.heart, isFavorite && styles.heartActive]}>{isFavorite ? "♥" : "♡"}</Text>
              <Text style={styles.heartLabel}>{isFavorite ? "Loved it" : "Add heart"}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.md
  },
  wrapSend: {
    gap: spacing.xs
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  display: {
    alignItems: "center",
    gap: 4,
    minHeight: 52
  },
  displayCompact: {
    minHeight: 40
  },
  number: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44
  },
  numberCompact: {
    fontSize: 32,
    lineHeight: 34
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: "italic"
  },
  trackSlot: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: TRACK_SLOT_HEIGHT,
    width: "100%"
  },
  trackSlotSend: {
    minHeight: 34
  },
  sendLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  track: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: spacing.sm
  },
  trackSend: {
    gap: 4,
    paddingVertical: spacing.xs
  },
  starButton: {
    alignItems: "center",
    height: STAR_SIZE,
    justifyContent: "center",
    width: STAR_SIZE
  },
  starButtonSend: {
    height: 28,
    width: 28
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center"
  },
  clearBtn: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  clearBtnDisabled: {
    opacity: 0.35
  },
  clearText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  heartBtn: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  heartBtnActive: {
    borderColor: colors.accent
  },
  heart: {
    color: colors.muted,
    fontSize: 18
  },
  heartActive: {
    color: colors.accent
  },
  heartLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  }
});
