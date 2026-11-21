import { PLAYER } from "./config";

export interface Point { x: number; z: number }
export interface Obstacle extends Point { r: number }

export function random(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function relativeMove(forward: number, strafe: number, yaw: number): Point {
  const length = Math.max(1, Math.hypot(forward, strafe));
  return {
    x: (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) / length,
    z: (-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) / length,
  };
}

export function movePlayer(from: Point, delta: Point, obstacles: readonly Obstacle[], radius: number): Point {
  const next = { ...from };
  const body = PLAYER.radius;
  const steps = obstacles.length ? Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (body / 2))) : 1;
  for (let step = 0; step < steps; step++) {
    next.x += delta.x / steps; next.z += delta.z / steps;
    for (let pass = 0; pass < 3; pass++) for (const o of obstacles) {
      const dx = next.x - o.x, dz = next.z - o.z;
      const d = Math.hypot(dx, dz), limit = o.r + body;
      if (d < limit) {
        next.x = o.x + (d > 0.0001 ? dx / d : 1) * limit;
        next.z = o.z + (d > 0.0001 ? dz / d : 0) * limit;
      }
    }
    const distance = Math.hypot(next.x, next.z);
    if (distance > radius) { next.x *= radius / distance; next.z *= radius / distance; }
  }
  return next;
}

export function smooth(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

export function trailX(z: number): number { return Math.sin(z * 0.23) * 1.6 + 1.5; }
