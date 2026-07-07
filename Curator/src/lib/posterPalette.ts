import { defaultColors, type ColorScheme } from "../theme/colorSchemes";
import { posterBaseUrl } from "../theme";
import type { MediaType, TmdbSearchResult } from "../types";
import {
  clamp,
  contrastRatio,
  dedupeSimilarHex,
  ensureContrast,
  hexToHsl,
  hslToHex,
  hue,
  hueDistance,
  luminance,
  normalizeHex,
  saturation
} from "./colorUtils";
import { extractSwatchesFromImageUri } from "./extractImageSwatches";
import { getPremadePosterTheme, swatchesForPremade } from "./premadePosterThemes";

export type PosterThemeConfig = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  palette: ColorScheme;
  swatches: string[];
  source: "curated" | "generated";
};

export const COLOR_ROLE_LABELS: Record<keyof ColorScheme, string> = {
  background: "Background",
  card: "Cards",
  accent: "Accent",
  star: "Stars",
  text: "Text",
  muted: "Muted",
  border: "Borders",
  success: "Success"
};

export const DEFAULT_ROLE_COLORS: ColorScheme = defaultColors;

const palettePosterBaseUrl = "https://image.tmdb.org/t/p/w185";
const MIN_TEXT_CONTRAST = 4.5;
const MIN_ACCENT_CONTRAST = 3;

type DominantHues = {
  primary: number;
  secondary: number;
};

function fromHsl(h: number, s: number, l: number): string {
  return normalizeHex(hslToHex({ h, s, l }));
}

function surfaceSaturation(swatches: string[]): number {
  const darkest = [...swatches].sort((a, b) => luminance(a) - luminance(b)).slice(0, 3);
  const average = darkest.reduce((sum, swatch) => sum + saturation(swatch), 0) / darkest.length;
  return clamp(average * 0.3, 0.15, 0.25);
}

function extractDominantHues(swatches: string[]): DominantHues {
  const byDark = [...swatches].sort((a, b) => luminance(a) - luminance(b));
  const primary = hue(byDark[0]);

  const bySaturation = [...swatches].sort((a, b) => saturation(b) - saturation(a));
  const distinctSecondary = bySaturation.find(
    (swatch) => hueDistance(hue(swatch), primary) >= 25 && saturation(swatch) >= 0.2
  );

  if (distinctSecondary) {
    return { primary, secondary: hue(distinctSecondary) };
  }

  const fallbackSecondary = hue(bySaturation[0]);
  if (hueDistance(fallbackSecondary, primary) >= 20) {
    return { primary, secondary: fallbackSecondary };
  }

  return { primary, secondary: (primary + 150) % 360 };
}

function buildSurfaces(primaryHue: number, surfaceSat: number) {
  const background = fromHsl(primaryHue, surfaceSat, 0.095);
  const card = fromHsl(primaryHue, surfaceSat, 0.145);
  const border = fromHsl(primaryHue, surfaceSat, 0.2);

  return { background, card, border };
}

function buildText(swatches: string[], background: string, card: string): string {
  const lightest = [...swatches].sort((a, b) => luminance(b) - luminance(a))[0];
  const source = hexToHsl(lightest);
  let text = fromHsl(source.h, clamp(source.s, 0, 0.12), clamp(source.l, 0.92, 0.96));

  text = ensureContrast(text, background, MIN_TEXT_CONTRAST, "foreground");
  text = ensureContrast(text, card, MIN_TEXT_CONTRAST, "foreground");

  return text;
}

function buildAccent(swatches: string[], secondaryHue: number, background: string): string {
  const maxSaturation = Math.max(...swatches.map((swatch) => saturation(swatch)));
  const mostSaturated = [...swatches].sort((a, b) => saturation(b) - saturation(a))[0];
  const source = hexToHsl(mostSaturated);

  let accentSaturation = clamp(source.s * 0.8, 0.15, 0.85);
  if (maxSaturation < 0.3) {
    accentSaturation = clamp(accentSaturation + 0.2, 0.15, 0.85);
  }

  let accent = fromHsl(secondaryHue, accentSaturation, clamp(source.l, 0.35, 0.62));

  if (maxSaturation < 0.15 || contrastRatio(accent, background) < MIN_ACCENT_CONTRAST) {
    accent = defaultColors.accent;
  }

  accent = ensureContrast(accent, background, MIN_ACCENT_CONTRAST, "foreground");
  return accent;
}

function buildStar(swatches: string[], accent: string): string {
  const warmCandidates = swatches.filter((swatch) => {
    const swatchHue = hue(swatch);
    return swatchHue >= 25 && swatchHue <= 70 && saturation(swatch) >= 0.25;
  });

  const source = warmCandidates.sort((a, b) => saturation(b) - saturation(a))[0] ?? accent;
  const hsl = hexToHsl(source);

  return fromHsl(hsl.h, clamp(hsl.s * 0.9, 0.2, 0.95), clamp(hsl.l, 0.35, 0.68));
}

function buildMuted(accentHue: number): string {
  return fromHsl(accentHue, 0.15, 0.6);
}

function buildSuccess(swatches: string[]): string {
  const green = swatches.find((swatch) => {
    const swatchHue = hue(swatch);
    return swatchHue >= 85 && swatchHue <= 160 && saturation(swatch) >= 0.2;
  });

  return green ? normalizeHex(green) : defaultColors.success;
}

function finalizeContrast(palette: ColorScheme): ColorScheme {
  let text = ensureContrast(palette.text, palette.background, MIN_TEXT_CONTRAST, "foreground");
  text = ensureContrast(text, palette.card, MIN_TEXT_CONTRAST, "foreground");

  let accent = ensureContrast(palette.accent, palette.background, MIN_ACCENT_CONTRAST, "foreground");
  accent = ensureContrast(text, accent, MIN_TEXT_CONTRAST, "background");

  let star = ensureContrast(palette.star, palette.background, MIN_ACCENT_CONTRAST, "foreground");
  star = ensureContrast(text, star, MIN_TEXT_CONTRAST, "background");

  return {
    ...palette,
    text,
    accent,
    star
  };
}

export function buildColorSchemeFromSwatches(swatches: string[]): ColorScheme {
  if (swatches.length === 0) {
    return defaultColors;
  }

  const colors = dedupeSimilarHex(swatches.map(normalizeHex));
  const { primary, secondary } = extractDominantHues(colors);
  const surfaceSat = surfaceSaturation(colors);
  const { background, card, border } = buildSurfaces(primary, surfaceSat);
  const accent = buildAccent(colors, secondary, background);
  const accentHue = hexToHsl(accent).h;

  const palette: ColorScheme = {
    background,
    card,
    accent,
    star: buildStar(colors, accent),
    text: buildText(colors, background, card),
    muted: buildMuted(accentHue),
    border,
    success: buildSuccess(colors)
  };

  return finalizeContrast(palette);
}

export function posterUri(posterPath: string | null): string | null {
  if (!posterPath) {
    return null;
  }
  return `${posterBaseUrl}${posterPath}`;
}

function paletteExtractionUri(posterPath: string | null): string | null {
  if (!posterPath) {
    return null;
  }
  return `${palettePosterBaseUrl}${posterPath}`;
}

export async function extractSwatchesFromPoster(posterPath: string | null): Promise<string[]> {
  const uri = paletteExtractionUri(posterPath);
  if (!uri) {
    return [];
  }

  return extractSwatchesFromImageUri(uri);
}

export async function createPosterThemeFromTitle(title: TmdbSearchResult): Promise<PosterThemeConfig> {
  const premade = getPremadePosterTheme(title.media_type, title.id);
  if (premade) {
    return {
      tmdbId: title.id,
      mediaType: title.media_type,
      title: title.title,
      posterPath: title.poster_path,
      palette: premade.palette,
      swatches: swatchesForPremade(premade),
      source: "curated"
    };
  }

  const swatches = await extractSwatchesFromPoster(title.poster_path);
  const palette = buildColorSchemeFromSwatches(
    swatches.length > 0 ? swatches : [defaultColors.background, defaultColors.accent, defaultColors.muted]
  );

  return {
    tmdbId: title.id,
    mediaType: title.media_type,
    title: title.title,
    posterPath: title.poster_path,
    palette,
    swatches,
    source: "generated"
  };
}
