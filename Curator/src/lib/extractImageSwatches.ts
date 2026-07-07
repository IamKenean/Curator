import jpeg from "jpeg-js";
import quantize from "quantize";
import UPNG from "upng-js";
import { dedupeSimilarHex, normalizeHex, rgbToHex } from "./colorUtils";

const MAX_SAMPLE_PIXELS = 10_000;
const SWATCH_COUNT = 8;

type RgbPixel = [number, number, number];

function isJpeg(buffer: Uint8Array): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Uint8Array): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function sampleRgba(data: Uint8Array, width: number, height: number): RgbPixel[] {
  const pixels: RgbPixel[] = [];
  const total = width * height;
  const step = Math.max(1, Math.ceil(total / MAX_SAMPLE_PIXELS));

  for (let index = 0; index < total; index += step) {
    const offset = index * 4;
    const alpha = data[offset + 3];
    if (alpha < 128) {
      continue;
    }

    pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
  }

  return pixels;
}

function decodeToPixels(buffer: Uint8Array): RgbPixel[] {
  if (isJpeg(buffer)) {
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    return sampleRgba(decoded.data, decoded.width, decoded.height);
  }

  if (isPng(buffer)) {
    const png = UPNG.decode(buffer);
    const rgba = UPNG.toRGBA8(png)[0];
    return sampleRgba(new Uint8Array(rgba), png.width, png.height);
  }

  return [];
}

export async function extractSwatchesFromImageUri(uri: string): Promise<string[]> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not load poster (${response.status})`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const pixels = decodeToPixels(buffer);
  if (pixels.length === 0) {
    return [];
  }

  const palette = quantize(pixels, SWATCH_COUNT);
  if (!palette) {
    return [];
  }

  return dedupeSimilarHex(
    palette.palette().map(([r, g, b]) => normalizeHex(rgbToHex({ r, g, b })))
  );
}
