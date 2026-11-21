export function clampZoom(vertical: number, rest: number): number { return Math.max(6, Math.min(rest, vertical)); }

export function pixelScale(vertical: number, width: number): number {
  return vertical <= 10 ? 1 : vertical <= 22 || width < 1024 ? 2 : 3;
}
