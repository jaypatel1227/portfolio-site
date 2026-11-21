import * as THREE from "three";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame, Plants } from "./types";

export function createLighting(plants: Plants): AnimationSystem {
  const { instance } = createMotion();
  const color = new THREE.Color();

  return {
    update({ time, player }: Frame) {
      plants.pools.forEach((pool, i) => { pool.material.opacity = 0.38 + Math.sin(time * 7 + i * 3) * 0.025 + Math.sin(time * 13 + i) * 0.015; });
      (plants.lamps.material as THREE.MeshBasicMaterial).color.setScalar(0.96 + Math.sin(time * 9) * 0.08);
      plants.flora.forEach((o, i) => {
        const near = Math.max(0, 1 - Math.hypot(o.x - player.x, o.z - player.z) / 1.9);
        const pulse = near * (0.8 + Math.sin(time * 6 + i) * 0.2);
        instance(plants.mushrooms, i, o.x, 0, o.z, o.scale * (1 + pulse * 0.3), 0, o.scale * (1 - pulse * 0.5));
        plants.mushrooms.setColorAt(i, color.setRGB(1 + pulse * 1.5, 1 + pulse * 0.7, 1 + pulse * 0.2));
      });
      plants.mushrooms.instanceMatrix.needsUpdate = true;
      if (plants.mushrooms.instanceColor) plants.mushrooms.instanceColor.needsUpdate = true;
    },
  };
}
