import { colors } from "../theme";

export function trustColorForPercent(percent: number | null | undefined) {
  if (percent == null) {
    return colors.muted;
  }
  if (percent >= 75) {
    return colors.success;
  }
  if (percent >= 50) {
    return "#E6C619";
  }
  return colors.accent;
}
