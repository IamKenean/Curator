export type StarRating = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export const STAR_LABELS: Record<number, string> = {
  0.5: "Awful",
  1: "Skip",
  1.5: "Disappointing",
  2: "Meh",
  2.5: "Mixed",
  3: "Good",
  3.5: "Enjoyable",
  4: "Great",
  4.5: "Excellent",
  5: "Peak"
};

export const STAR_EMOJI_TIER: Record<number, string> = {
  1: "Skip",
  2: "Meh",
  3: "Good",
  4: "Great",
  5: "Peak"
};

export function clampStarRating(value: number): StarRating {
  const stepped = Math.round(value * 2) / 2;
  const clamped = Math.max(0.5, Math.min(5, stepped));
  return clamped as StarRating;
}

export function ratingFromTouchX(x: number, width: number): StarRating {
  if (width <= 0) {
    return 0;
  }

  const ratio = Math.max(0, Math.min(1, x / width));
  return clampStarRating(ratio * 5);
}

export function formatStarRating(value: number) {
  if (!value) {
    return "—";
  }

  return value % 1 === 0 ? `${value.toFixed(1)}` : `${value}`;
}

export function starLabel(value: number) {
  if (!value) {
    return "";
  }

  return STAR_LABELS[value] ?? "";
}

export function predictionAccuracy(predicted: number, actual: number) {
  const gap = Math.abs(predicted - actual);
  return Math.max(0, 1 - gap / 4);
}

export function averagePredictionAccuracy(pairs: { predicted: number; actual: number }[]) {
  if (pairs.length === 0) {
    return 0;
  }

  const sum = pairs.reduce((total, pair) => total + predictionAccuracy(pair.predicted, pair.actual), 0);
  return Number((sum / pairs.length).toFixed(3));
}

export function trustScoreToPercent(score: number, decimals = 0) {
  const pct = score * 100;
  if (decimals <= 0) {
    return Math.round(pct);
  }

  return Number(pct.toFixed(decimals));
}

export function trustPercentDelta(before: number | null, after: number) {
  if (before == null) {
    return trustScoreToPercent(after, 1);
  }

  return Number(((after - before) * 100).toFixed(1));
}

export function formatComparison(estimated: number | null | undefined, actual: number) {
  if (!estimated) {
    return null;
  }

  const diff = actual - estimated;
  const diffText = diff === 0 ? "Exact match" : diff > 0 ? `+${diff.toFixed(1)} higher` : `${Math.abs(diff).toFixed(1)} lower`;

  return {
    estimated,
    actual,
    diffText
  };
}

export function formatTrustDeltaPercent(delta: number) {
  if (delta > 0) {
    return `+${delta}%`;
  }

  if (delta < 0) {
    return `${delta}%`;
  }

  return "±0%";
}
