import type { Point } from "../math";

const cx = 5.8, cz = 13.7, half = 1.06, radius = 0.78;
const straight = half * 2, bend = Math.PI * radius;
export const TRACK = { length: 2 * (straight + bend), halfWidth: 0.39, speed: 3.6, height: 0.16 };

/** Distance along the center line is common to the artwork and rider. */
export function trackPoint(distance: number, offset = 0): Point {
  let s = ((distance % TRACK.length) + TRACK.length) % TRACK.length;
  const r = radius + offset;
  if (s < straight) return { x: cx - half + s, z: cz + r };
  s -= straight;
  if (s < bend) return { x: cx + half + r * Math.sin(s / radius), z: cz + r * Math.cos(s / radius) };
  s -= bend;
  if (s < straight) return { x: cx + half - s, z: cz - r };
  s -= straight;
  return { x: cx - half - r * Math.sin(s / radius), z: cz - r * Math.cos(s / radius) };
}

export const trackFootprints = [-half, 0, half].map((offset) => ({
  x: cx + offset, z: cz, r: radius + TRACK.halfWidth,
}));

export function nearTrack(p: Point, margin: number): boolean {
  const dx = Math.max(0, Math.abs(p.x - cx) - half);
  return Math.hypot(dx, p.z - cz) <= radius + TRACK.halfWidth + margin;
}

export function trackContact(p: Point) {
  const x = p.x - cx, z = p.z - cz;
  if (Math.abs(x) > half + radius + TRACK.halfWidth || Math.abs(z) > radius + TRACK.halfWidth) return null;
  const dx = Math.max(0, Math.abs(x) - half), offset = Math.hypot(dx, z) - radius;
  if (Math.abs(offset) > TRACK.halfWidth) return null;
  const s = dx > 0
    ? x > 0 ? straight + radius * Math.atan2(dx, z) : 2 * straight + bend + radius * Math.atan2(dx, -z)
    : z >= 0 ? half + x : straight + bend + half - x;
  return { s, offset };
}

export function carryDelta(p: Point, dt: number): Point | null {
  const at = trackContact(p);
  if (!at) return null;
  const next = trackPoint(at.s + dt * TRACK.speed, at.offset);
  return { x: next.x - p.x, z: next.z - p.z };
}
