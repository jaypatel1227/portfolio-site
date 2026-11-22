import { smooth, trailX } from "../math";
import { cycle } from "./math";

export function proximity(distance: number, radius: number): number {
  if (radius <= 0) throw new RangeError("Reaction radius must be positive");
  return 1 - smooth(distance / radius);
}
export function flightLift(time: number, phase: number): number {
  const t = cycle(time + phase, 16) * 16;
  return t < 9 ? 0 : Math.sin((t - 9) / 7 * Math.PI);
}
export function onPath(x: number, z: number): boolean { return z > -4 && Math.abs(x - trailX(z)) < 1.15; }
export function shoreBand(x: number, z: number): number {
  return proximity(Math.abs(Math.hypot((x + 8) / 4.5, (z - 1) / 3.4) - 1), 0.22);
}
export function createIdlePose() {
  let idle = 0;
  const pose = { turn: 0, breath: 1, lean: 0 };
  return {
    pose,
    update(time: number, motion: number, dt: number) {
      idle = motion > 0.1 || dt === 0 ? 0 : idle + Math.max(0, dt);
      const relaxed = smooth((idle - 1) / 3);
      pose.turn = relaxed ? Math.sin(time * 0.65) * 0.45 * relaxed : 0;
      pose.breath = 1 + Math.sin(time * 2.1) * 0.012 * relaxed;
      pose.lean = relaxed ? Math.sin(time * 0.9) * 0.035 * relaxed : 0;
      return pose;
    },
  };
}
