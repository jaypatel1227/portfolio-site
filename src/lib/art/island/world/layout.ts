import type { Spot } from "../voxel/batch";
import { trailX, type Obstacle } from "../math";

export const HOME = { x: trailX(12), z: 12 };
export const NOTE = { x: 2, z: -2.7 };

export function stoneSpots(rng: () => number): Spot[] {
  const stones: Spot[] = [{ x: -4, z: 10, scale: 0.12 }, { x: 5, z: 8, scale: 0.09 }, { x: -1, z: -3, scale: 0.1 }, { x: 6, z: -8, scale: 0.12 }];
  for (let i = 0; i < 26; i++) {
    const angle = rng() * Math.PI * 2, r = 11 + rng() * 7;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r * 0.85;
    stones.push({ x, z, scale: 0.045 + rng() * 0.065, angle: rng() * 6 });
  }
  return stones;
}

export function floraSpots(rng: () => number, obstacles: readonly Obstacle[]) {
  const flora: Spot[] = [], tufts: Spot[] = [];
  for (let i = 0; i < 420; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
    if (z > -4 && Math.abs(x - trailX(z)) < 1.6 || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) continue;
    tufts.push({ x, z, scale: 0.045 + rng() * 0.035, angle: rng() * Math.PI * 2 });
    if (i % 6 === 0) flora.push({ x: x + 0.3, z, scale: 0.045 + rng() * 0.035 });
  }
  return { flora, tufts };
}
