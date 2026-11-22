import { smooth } from "../math";

export function zoomReveal(height: number, threshold: number, band: number): number {
  if (band <= 0) throw new RangeError("Reveal band must be positive");
  return smooth((threshold - height) / band);
}

export function staggerReveal(amount: number, index: number): number {
  const delay = (index * 0.61803398875 % 1) * 0.3;
  return smooth((amount - delay) / 0.7);
}

export function approachReveal(value: number, target: number, dt: number, seconds: number): number {
  if (seconds <= 0) throw new RangeError("Reveal duration must be positive");
  if (dt === 0) return target;
  const step = Math.max(0, dt) / seconds;
  return value + Math.max(-step, Math.min(step, target - value));
}

export function lodNearby(distance: number, radius: number, previous: boolean, band: number): boolean {
  return distance < radius + (previous ? band / 2 : -band / 2);
}
