import { fill, model } from "../voxel/grid";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame } from "./types";
import type { Batch } from "../voxel/batch";
import { smooth } from "../math";
import { onPath, shoreBand } from "./behavior";

export function createFootsteps(batch: Batch, rng: () => number): AnimationSystem {
  const { instance, moving } = createMotion();
  const dustModel = model(5, 3, 5);
  fill(dustModel, (x, y, z) => Math.abs(x) + Math.abs(z) < 3 - y * 0.5 ? 11 : 0);
  const dust = moving(batch(dustModel, Array.from({ length: 12 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const footsteps = Array.from({ length: 12 }, () => ({ x: 0, z: 0, born: -100, angle: rng() * 6 }));
  const printModel = model(5, 1, 9);
  fill(printModel, (x, _y, z) => (x / 2) ** 2 + (z / 4) ** 2 < 1 ? 9 : 0);
  const prints = moving(batch(printModel, Array.from({ length: 24 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const marks = Array.from({ length: 24 }, () => ({ x: 0, z: 0, angle: 0, born: -100 }));
  const ring = model(23, 1, 23);
  fill(ring, (x, _y, z) => Math.abs(Math.hypot(x, z) - 10) < 1 ? 23 : 0);
  const rings = moving(batch(ring, Array.from({ length: 8 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const droplet = model(3, 3, 3);
  fill(droplet, () => 23);
  const drops = moving(batch(droplet, Array.from({ length: 24 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const splashes = Array.from({ length: 8 }, () => ({ x: 0, z: 0, born: -100 }));
  let nextDust = 0, nextPrint = 0, nextSplash = 0, distance = 0, lastX = 0, lastZ = 0;

  return {
    update({ time, player, motion, dt }: Frame) {
      const dx = player.x - lastX, dz = player.z - lastZ, moved = Math.hypot(dx, dz);
      lastX = player.x; lastZ = player.z;
      distance = motion > 0.3 && moved < 1 && dt > 0 ? distance + moved : 0;
      if (distance > 0.34) {
        distance %= 0.34;
        const foot = footsteps[nextDust++ % footsteps.length];
        foot.x = player.x; foot.z = player.z; foot.born = time;
        if (onPath(player.x, player.z)) {
          const mark = marks[nextPrint % marks.length], side = nextPrint++ % 2 ? -0.13 : 0.13;
          mark.x = player.x + dz / moved * side; mark.z = player.z - dx / moved * side;
          mark.angle = Math.atan2(dx, dz); mark.born = time;
        }
        if (shoreBand(player.x, player.z) > 0.1) {
          const splash = splashes[nextSplash++ % splashes.length];
          splash.x = -8 + (player.x + 8) * 0.92; splash.z = 1 + (player.z - 1) * 0.92; splash.born = time;
        }
      }
      for (let i = 0; i < footsteps.length; i++) {
        const foot = footsteps[i];
        const t = (time - foot.born) / 0.7;
        instance(dust, i, foot.x + Math.cos(foot.angle) * t * 0.3, 0.08 + t * 0.25, foot.z + Math.sin(foot.angle) * t * 0.3, t >= 0 && t < 1 ? (1 - t) * 0.05 : 0);
      }
      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i], age = time - mark.born;
        const size = age >= 0 ? 0.035 * smooth(age / 0.08) * (1 - smooth((age - 5) / 2)) : 0;
        instance(prints, i, mark.x, 0.035, mark.z, size, mark.angle);
      }
      for (let i = 0; i < splashes.length; i++) {
        const splash = splashes[i], t = (time - splash.born) / 0.9, active = t >= 0 && t < 1;
        instance(rings, i, splash.x, 0.14, splash.z, active ? (0.02 + t * 0.09) * (1 - smooth((t - 0.6) / 0.4)) : 0);
        for (let j = 0; j < 3; j++) {
          const angle = j * Math.PI * 2 / 3 + i;
          instance(drops, i * 3 + j, splash.x + Math.sin(angle) * t * 0.5, 0.1 + Math.sin(t * Math.PI) * 0.45, splash.z + Math.cos(angle) * t * 0.5, active ? 0.028 * (1 - t) : 0);
        }
      }
      dust.instanceMatrix.needsUpdate = true;
      prints.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; drops.instanceMatrix.needsUpdate = true;
    },
  };
}
