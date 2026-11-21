import { CAMERA } from "../config";
import { smooth } from "../math";

export function clampZoom(vertical: number, rest: number): number { return Math.max(6, Math.min(rest, vertical)); }

export function createZoom(initial: number) {
  let height = initial, target = initial, from = initial, elapsed = 0, transitioning = false;
  return {
    get height() { return height; },
    reset(value: number) { height = target = value; transitioning = false; },
    hold() { target = height; transitioning = false; },
    transition(value: number) { from = height; target = value; elapsed = 0; transitioning = true; },
    magnify(exponent: number, rest: number) {
      if (!exponent) return;
      const base = exponent > 0 ? Math.max(height, target) : Math.min(height, target);
      target = clampZoom(base * Math.exp(exponent), rest); transitioning = false;
    },
    update(dt: number) {
      if (transitioning) {
        elapsed += dt;
        height = from + (target - from) * smooth(elapsed / CAMERA.transitionSeconds);
      } else height += (target - height) * (dt === 0 ? 1 : 1 - Math.exp(-dt * CAMERA.zoomResponse));
      return height;
    },
  };
}

export function pixelScale(vertical: number, width: number): number {
  return vertical <= 10 ? 1 : vertical <= 22 || width < 1024 ? 2 : 3;
}
