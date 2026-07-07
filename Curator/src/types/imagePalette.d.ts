declare module "quantize" {
  type QuantizedPalette = {
    palette: () => [number, number, number][];
  };

  export default function quantize(
    pixels: [number, number, number][],
    maxColors: number
  ): QuantizedPalette | false;
}

declare module "upng-js" {
  type DecodedPng = {
    width: number;
    height: number;
  };

  export function decode(buffer: ArrayBuffer | Uint8Array): DecodedPng;
  export function toRGBA8(png: DecodedPng): ArrayBuffer[];
}
