import { type Point } from "../math";

export function cycle(time: number, duration: number): number { return ((time % duration) + duration) % duration / duration; }

export function fishJump(time: number): number {
  const t = cycle(time, 9) * 9;
  return t < 1.6 ? Math.sin(t / 1.6 * Math.PI) * 1.65 : 0;
}

export function critterTarget(time: number, home: Point, phase: number, player: Point): Point & { scared: boolean } {
  const x = home.x + Math.sin(time * 0.27 + phase) * 1.3;
  const z = home.z + Math.cos(time * 0.22 + phase) * 1.2;
  const dx = x - player.x, dz = z - player.z, distance = Math.hypot(dx, dz);
  const scared = distance < 3;
  return {
    x: x + (scared ? (distance > 0.001 ? dx / distance : 1) * 3 : 0),
    z: z + (scared ? (distance > 0.001 ? dz / distance : 0) * 3 : 0),
    scared,
  };
}
