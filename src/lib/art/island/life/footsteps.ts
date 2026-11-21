import { fill, model } from "../voxel/grid";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame } from "./types";
import type { Batch } from "../voxel/batch";

export function createFootsteps(batch: Batch, rng: () => number): AnimationSystem {
  const { instance, moving } = createMotion();
  const dustModel = model(5, 3, 5);
  fill(dustModel, (x, y, z) => Math.abs(x) + Math.abs(z) < 3 - y * 0.5 ? 11 : 0);
  const dust = moving(batch(dustModel, Array.from({ length: 12 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const footsteps = Array.from({ length: 12 }, () => ({ x: 0, z: 0, born: -100, angle: rng() * 6 }));
  let nextDust = 0, lastStep = -1;

  return {
    update({ time, player, motion, dt }: Frame) {
      if (motion > 0.3 && dt > 0 && Math.floor(time * 9) !== lastStep) {
        lastStep = Math.floor(time * 9);
        const foot = footsteps[nextDust++ % footsteps.length];
        foot.x = player.x; foot.z = player.z; foot.born = time;
      }
      footsteps.forEach((foot, i) => {
        const t = (time - foot.born) / 0.7;
        instance(dust, i, foot.x + Math.cos(foot.angle) * t * 0.3, 0.08 + t * 0.25, foot.z + Math.sin(foot.angle) * t * 0.3, t >= 0 && t < 1 ? (1 - t) * 0.05 : 0);
      });
      dust.instanceMatrix.needsUpdate = true;
    },
  };
}
