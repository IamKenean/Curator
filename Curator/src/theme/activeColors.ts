import { defaultColors, type ColorScheme } from "./colorSchemes";

let activeColors: ColorScheme = { ...defaultColors };

export function setActiveThemeColors(next: ColorScheme) {
  activeColors = next;
}

export function getActiveThemeColors(): ColorScheme {
  return activeColors;
}

export const colors: ColorScheme = new Proxy({} as ColorScheme, {
  get(_target, prop: keyof ColorScheme) {
    return activeColors[prop];
  }
});
