import * as THREE from "three";
import { insect } from "../models/ambient";
import { createMotion } from "../voxel/motion";
import { createReveal } from "../voxel/reveal";
import { zoomReveal } from "../voxel/reveal-math";
import { proximity } from "./behavior";
import type { Batch, StackMesh } from "../voxel/batch";
import type { AnimationSystem, Frame } from "./types";

export function createInsects(batch: Batch, lamps: StackMesh): AnimationSystem {
  const { instance, moving } = createMotion(), matrix = new THREE.Matrix4();
  const origins = Array.from({ length: lamps.count * 3 }, (_, i) => {
    lamps.getMatrixAt(Math.floor(i / 3), matrix);
    return { x: matrix.elements[12], z: matrix.elements[14] };
  });
  const moths = moving(batch(insect(), origins.map((o) => ({ ...o, scale: 0 }))));
  const skimmers = moving(batch(insect(true), Array.from({ length: 3 }, () => ({ x: -8, z: 1, scale: 0 }))));
  const mothReveal = createReveal([moths]), skimmerReveal = createReveal([skimmers]);
  let vertical = 60;
  return {
    setView(camera: THREE.OrthographicCamera) { vertical = camera.top - camera.bottom; },
    update({ time, player, dt }: Frame) {
      for (let i = 0; i < origins.length; i++) {
        const o = origins[i], t = time * 1.7 + i * 2.4;
        const lift = proximity(Math.hypot(player.x - o.x, player.z - o.z), 2) * 0.4;
        instance(moths, i, o.x + Math.sin(t) * 0.42, 2.3 + Math.sin(t * 1.3) * 0.22 + lift, o.z + Math.sin(t * 2) * 0.32, 0.023, t, 0.003 + 0.023 * Math.abs(Math.cos(time * 32 + i)));
      }
      for (let i = 0; i < 3; i++) {
        const t = time * 0.55 + i * 2.1, x = -8 + Math.cos(t) * 2.9, z = 1 + Math.sin(t * 1.3) * 1.8;
        const lift = proximity(Math.hypot(player.x - x, player.z - z), 3);
        instance(skimmers, i, x, 0.35 + Math.sin(time * 2 + i) * 0.08 + lift, z, 0.025, -t, 0.003 + Math.abs(Math.cos(time * 45 + i)) * 0.025);
      }
      const amount = zoomReveal(vertical, 26, 12);
      mothReveal.update(amount, dt, moths); skimmerReveal.update(amount, dt, skimmers);
    },
  };
}
