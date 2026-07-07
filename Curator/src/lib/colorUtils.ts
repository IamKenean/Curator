type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace("#", "");
  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }
  return `#${cleaned.slice(0, 6).toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) {
    rn = c;
    gn = x;
  } else if (h < 120) {
    rn = x;
    gn = c;
  } else if (h < 180) {
    gn = c;
    bn = x;
  } else if (h < 240) {
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255
  };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function withHsl(hex: string, overrides: Partial<HSL>): string {
  return hslToHex({ ...hexToHsl(hex), ...overrides });
}

export function ensureContrast(
  foreground: string,
  background: string,
  minRatio = 4.5,
  adjust: "foreground" | "background" = "foreground"
): string {
  if (contrastRatio(foreground, background) >= minRatio) {
    return normalizeHex(adjust === "foreground" ? foreground : background);
  }

  const target = adjust === "foreground" ? foreground : background;
  let hsl = hexToHsl(target);

  for (let step = 0; step < 50; step += 1) {
    const candidate = hslToHex(hsl);
    const fg = adjust === "foreground" ? candidate : foreground;
    const bg = adjust === "background" ? candidate : background;

    if (contrastRatio(fg, bg) >= minRatio) {
      return normalizeHex(candidate);
    }

    if (adjust === "foreground") {
      hsl.l = clamp(hsl.l + 0.02, 0, 1);
    } else {
      hsl.l = clamp(hsl.l + (luminance(foreground) > luminance(background) ? -0.02 : 0.02), 0, 1);
    }
  }

  return normalizeHex(target);
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function saturation(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).s;
}

export function hue(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).h;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mix(colorA: string, colorB: string, weightB: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const weightA = 1 - weightB;
  return rgbToHex({
    r: a.r * weightA + b.r * weightB,
    g: a.g * weightA + b.g * weightB,
    b: a.b * weightA + b.b * weightB
  });
}

export function darken(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(0, hsl.l - amount) }));
}

export function lighten(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.min(1, hsl.l + amount) }));
}

export function desaturate(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, s: Math.max(0, hsl.s - amount) }));
}

export function rotateHue(hex: string, degrees: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + degrees) % 360 }));
}

export function dedupeSimilarHex(colors: string[], threshold = 0.04): string[] {
  const unique: string[] = [];
  for (const color of colors.map(normalizeHex)) {
    if (
      unique.some(
        (existing) =>
          Math.abs(luminance(existing) - luminance(color)) < threshold &&
          Math.abs(saturation(existing) - saturation(color)) < 0.08
      )
    ) {
      continue;
    }
    unique.push(color);
  }
  return unique;
}

/** Perceptual-ish distance between two colors (lower = closer). */
export function colorDistance(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;

  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

export function findClosestColor(target: string, candidates: string[]): string {
  if (candidates.length === 0) {
    return normalizeHex(target);
  }

  let closest = candidates[0];
  let closestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = colorDistance(target, candidate);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = candidate;
    }
  }

  return normalizeHex(closest);
}

export function pickReadableText(background: string, candidates: string[]): string {
  const sorted = [...candidates].sort((a, b) => contrastRatio(b, background) - contrastRatio(a, background));
  const best = sorted.find((candidate) => contrastRatio(candidate, background) >= 4.5);
  return best ?? sorted[0] ?? "#F5F5F5";
}
