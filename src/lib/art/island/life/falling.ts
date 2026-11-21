import { cycle } from "./math";
import { fill, model } from "../voxel/grid";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame } from "./types";
import type { Batch } from "../voxel/batch";

export function createFalling(batch: Batch, rng: () => number): AnimationSystem {
  const { instance, moving } = createMotion();
  const puff = model(7, 5, 7);
  fill(puff, (x, y, z) => (x / 3) ** 2 + ((y - 2) / 2.5) ** 2 + (z / 3) ** 2 < 1 ? y > 2 ? 14 : 13 : 0);
  const smoke = moving(batch(puff, Array.from({ length: 8 }, () => ({ x: 11, z: -1.4, scale: 0 }))));
  const leaf = model(5, 1, 7);
  fill(leaf, (x, _y, z) => (x / 2.5) ** 2 + (z / 3.5) ** 2 < 1 ? x < 0 ? 16 : 19 : 0);
  const leafOrigins = Array.from({ length: 18 }, () => ({ x: 2 + (rng() - 0.5) * 9, z: -5 + (rng() - 0.5) * 7, phase: rng() * 8 }));
  const leaves = moving(batch(leaf, leafOrigins.map((o) => ({ ...o, scale: 0.055 }))));

  return {
    update({ time }: Frame) {
      for (let i = 0; i < 8; i++) {
        const t = cycle(time * 0.18 + i / 8, 1);
        instance(smoke, i, 11.25 + t * 0.9 + Math.sin(time + i) * 0.12, 4.3 + t * 3.4, -1.4 + t * 0.2, Math.sin(t * Math.PI) * (0.07 + t * 0.14), i);
      }
      leafOrigins.forEach((o, i) => {
        const t = cycle(time + o.phase, 8);
        instance(leaves, i, o.x + Math.sin(t * 8 + i) * 0.9 + t, 0.1 + (1 - t) * 7.5, o.z + Math.cos(t * 7 + i) * 0.6, 0.055, time * 0.7 + i);
      });
      for (const mesh of [smoke, leaves]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
