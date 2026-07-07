import type { ColorScheme } from "../theme/colorSchemes";
import type { MediaType } from "../types";

export type PremadePosterTheme = {
  /** TMDB id — must match search result id exactly. */
  tmdbId: number;
  mediaType: MediaType;
  /** Display label in featured list (usually film title). */
  label: string;
  /** Hand-tuned 8-role palette. Takes priority over poster extraction. */
  palette: ColorScheme;
  /** Optional swatches shown in Settings (defaults to palette role values). */
  swatches?: string[];
  /** Show in Settings featured row for one-tap apply. */
  featured?: boolean;
  /** Optional TMDB poster path (e.g. /abc.jpg) for Settings preview. */
  posterPath?: string | null;
};

export function themeLookupKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

/**
 * Add entries here for movies people pick often.
 * Key = `${mediaType}:${tmdbId}` from TMDB search results.
 *
 * Workflow:
 * 1. Pick the movie in-app once with generated palette.
 * 2. Tweak roles in this file until it feels right.
 * 3. Set featured: true if it should appear in the quick-pick row.
 */
export const PREMADE_POSTER_THEMES: PremadePosterTheme[] = [
  {
    tmdbId: 313369,
    mediaType: "movie",
    label: "La La Land",
    featured: true,
    palette: {
      background: "#120818",
      card: "#1A1024",
      accent: "#E8A838",
      star: "#F4C542",
      text: "#F5F0E8",
      muted: "#9A8FA8",
      border: "#2A2034",
      success: "#51CF66"
    },
    swatches: ["#120818", "#E8A838", "#F4C542", "#6B4C9A", "#F5F0E8"]
  },
  {
    tmdbId: 335984,
    mediaType: "movie",
    label: "Blade Runner 2049",
    featured: true,
    palette: {
      background: "#080C14",
      card: "#101820",
      accent: "#FF6B35",
      star: "#FFB347",
      text: "#E8EEF5",
      muted: "#7A8A9A",
      border: "#1C2836",
      success: "#51CF66"
    },
    swatches: ["#080C14", "#FF6B35", "#FFB347", "#4A90A4", "#E8EEF5"]
  },
  {
    tmdbId: 438631,
    mediaType: "movie",
    label: "Dune",
    featured: true,
    palette: {
      background: "#0E1210",
      card: "#161C18",
      accent: "#C9A227",
      star: "#E8B84A",
      text: "#F0EDE4",
      muted: "#8A9088",
      border: "#242C28",
      success: "#51CF66"
    },
    swatches: ["#0E1210", "#C9A227", "#E8B84A", "#3D5A4A", "#F0EDE4"]
  },
  {
    tmdbId: 27205,
    mediaType: "movie",
    label: "Inception",
    featured: false,
    palette: {
      background: "#0A0E12",
      card: "#121820",
      accent: "#4A8FA8",
      star: "#7AB8D4",
      text: "#F0F4F8",
      muted: "#8898A4",
      border: "#1E2830",
      success: "#51CF66"
    }
  }
];

const PREMADE_BY_KEY = new Map(
  PREMADE_POSTER_THEMES.map((entry) => [themeLookupKey(entry.mediaType, entry.tmdbId), entry])
);

export function getPremadePosterTheme(mediaType: MediaType, tmdbId: number): PremadePosterTheme | null {
  return PREMADE_BY_KEY.get(themeLookupKey(mediaType, tmdbId)) ?? null;
}

export function getFeaturedPremadeThemes(): PremadePosterTheme[] {
  return PREMADE_POSTER_THEMES.filter((entry) => entry.featured);
}

export function swatchesForPremade(entry: PremadePosterTheme): string[] {
  if (entry.swatches?.length) {
    return entry.swatches;
  }

  const { palette } = entry;
  return [palette.background, palette.accent, palette.star, palette.card, palette.muted];
}

export function premadeAsSearchResult(entry: PremadePosterTheme): import("../types").TmdbSearchResult {
  return {
    id: entry.tmdbId,
    media_type: entry.mediaType,
    title: entry.label,
    year: "",
    poster_path: entry.posterPath ?? null
  };
}
