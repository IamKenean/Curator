import type { ColorScheme } from "../theme/colorSchemes";

export type PremadeAppTheme = {
  id: string;
  label: string;
  palette: ColorScheme;
  swatches?: string[];
  featured?: boolean;
};

export const PREMADE_APP_THEMES: PremadeAppTheme[] = [
  {
    id: "midnight",
    label: "Midnight",
    featured: true,
    palette: {
      background: "#000000",
      card: "#080808",
      accent: "#FF3344",
      star: "#FF4D5A",
      text: "#FAFAFA",
      muted: "#636363",
      border: "#0F0F0F",
      success: "#3DDC84"
    },
    swatches: ["#000000", "#080808", "#FF3344", "#FF4D5A", "#636363"]
  }
];

const PREMADE_BY_ID = new Map(PREMADE_APP_THEMES.map((entry) => [entry.id, entry]));

export function getPremadeAppTheme(id: string): PremadeAppTheme | null {
  return PREMADE_BY_ID.get(id) ?? null;
}

export function getFeaturedAppThemes(): PremadeAppTheme[] {
  return PREMADE_APP_THEMES.filter((entry) => entry.featured);
}

export function swatchesForAppTheme(entry: PremadeAppTheme): string[] {
  if (entry.swatches?.length) {
    return entry.swatches;
  }

  const { palette } = entry;
  return [palette.background, palette.card, palette.accent, palette.star, palette.muted];
}
