export type ColorScheme = {
  background: string;
  card: string;
  accent: string;
  star: string;
  text: string;
  muted: string;
  border: string;
  success: string;
};

export const palette = {
  burntOrange: "#C46A3C",
  mustardYellow: "#D4A63D",
  sageGreen: "#7D9D7A",
  dustyTeal: "#4E7A7A",
  slateBlue: "#5D6D91",
  mauve: "#A6768A",
  burgundy: "#6F2E3B",
  warmCream: "#F4EBDD"
} as const;

export const defaultColors: ColorScheme = {
  background: "#0F0F0F",
  card: "#1A1A1A",
  accent: "#E63946",
  star: "#E50914",
  text: "#F5F5F5",
  muted: "#A7A7A7",
  border: "#2A2A2A",
  success: "#51CF66"
};

export const superDarkColors: ColorScheme = {
  background: "#080706",
  card: "#12100E",
  accent: palette.burntOrange,
  star: palette.mustardYellow,
  text: palette.warmCream,
  muted: palette.dustyTeal,
  border: palette.slateBlue,
  success: palette.sageGreen
};

export type ThemeMode = "default" | "superDark";

export const THEME_STORAGE_KEY = "curator.themeMode";

export const paletteSwatches = [
  { name: "Burnt Orange", color: palette.burntOrange },
  { name: "Mustard", color: palette.mustardYellow },
  { name: "Sage", color: palette.sageGreen },
  { name: "Teal", color: palette.dustyTeal },
  { name: "Slate", color: palette.slateBlue },
  { name: "Mauve", color: palette.mauve },
  { name: "Burgundy", color: palette.burgundy },
  { name: "Cream", color: palette.warmCream }
] as const;

export function colorsForMode(mode: ThemeMode): ColorScheme {
  return mode === "superDark" ? superDarkColors : defaultColors;
}
