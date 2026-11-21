import { fish } from "../models/animals";
import { cycle, fishJump } from "./math";
import { fill, model } from "../voxel/grid";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame } from "./types";
import type { Batch } from "../voxel/batch";

export function createPond(batch: Batch): AnimationSystem {
  const { instance, moving } = createMotion();
  const ring = model(23, 1, 23);
  fill(ring, (x, _y, z) => Math.hypot(x, z) > 9.5 && Math.hypot(x, z) < 11 ? 23 : 0);
  const ripples = moving(batch(ring, [{ x: -8, z: 1, scale: 0.1 }, { x: -8, z: 1, scale: 0.1 }]));
  const jumpingFish = moving(batch(fish(), [{ x: -8, z: 1, scale: 0.065 }]));

  return {
    update({ time }: Frame) {
      const jump = cycle(time + 2, 9) * 9;
      jumpingFish.visible = jump < 1.6;
      instance(jumpingFish, 0, -9 + Math.min(jump / 1.6, 1) * 2, -0.25 + fishJump(time + 2), 1, 0.075, 0.3);
      for (let i = 0; i < 2; i++) {
        const t = cycle(time + 2 - 1.6 - i * 0.45, 9) * 9;
        instance(ripples, i, -7, 0.14, 1, t < 2.2 ? 0.035 + t * 0.07 : 0);
      }
      for (const mesh of [ripples, jumpingFish]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
