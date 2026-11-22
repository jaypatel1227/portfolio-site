import { bird } from "../models/ambient";
import { random } from "../math";
import { createMotion } from "../voxel/motion";
import { cycle } from "./math";
import { flightLift, proximity } from "./behavior";
import type { Batch } from "../voxel/batch";
import type { AnimationSystem, Frame } from "./types";

export function createBirds(seed: number, batch: Batch): AnimationSystem {
  const rng = random(seed + 1453), { instance, moving } = createMotion();
  const homes = [{ x: -1.5, z: 6 }, { x: 5.5, z: 7 }, { x: -3, z: -0.6 }];
  const birds = homes.map((home) => ({ ...home, home, phase: rng() * 16, alarm: 0, angle: 0 }));
  const bodies = moving(batch(bird(), homes.map((home) => ({ ...home, scale: 0.045 }))));
  const wings = moving(batch(bird(true), homes.map((home) => ({ ...home, scale: 0.045 }))));
  return { update({ time, player, dt }: Frame) {
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i], dx = b.home.x - player.x, dz = b.home.z - player.z, distance = Math.hypot(dx, dz);
      b.alarm = Math.max(proximity(distance, 3), b.alarm - dt * 0.35);
      const phase = Math.max(0, (cycle(time + b.phase, 16) * 16 - 9) / 7) * Math.PI * 2;
      const lift = Math.max(flightLift(time, b.phase), b.alarm);
      const x = b.home.x + Math.sin(phase) * 2.2 + dx / Math.max(distance, 0.1) * b.alarm * 2;
      const z = b.home.z + (1 - Math.cos(phase)) + dz / Math.max(distance, 0.1) * b.alarm * 2;
      const blend = dt === 0 ? 1 : 1 - Math.exp(-dt * 4);
      if (Math.hypot(x - b.x, z - b.z) > 0.015) b.angle = Math.atan2(x - b.x, z - b.z);
      b.x += (x - b.x) * blend; b.z += (z - b.z) * blend;
      const y = lift * 2.2 + Math.max(0, Math.sin(time * 4 + i)) * 0.055 * (1 - lift);
      instance(bodies, i, b.x, y, b.z, 0.045, b.angle);
      instance(wings, i, b.x, y + 0.2, b.z, 0.045, b.angle, lift > 0.03 ? 0.005 + Math.abs(Math.cos(time * 21 + i)) * 0.065 : 0.005);
    }
    bodies.instanceMatrix.needsUpdate = true; wings.instanceMatrix.needsUpdate = true;
  } };
}
