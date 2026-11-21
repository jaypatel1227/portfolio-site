import * as THREE from "three";
import { fox, owl, rabbit } from "../models/animals";
import { critterTarget, cycle } from "./math";
import { movePlayer, type Obstacle } from "../math";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame } from "./types";
import type { Batch } from "../voxel/batch";

export function createWildlife(batch: Batch, rng: () => number, obstacles: Obstacle[]): AnimationSystem {
  const { instance, moving } = createMotion();
  const foxMesh = moving(batch(fox(), [{ x: 7, z: 5, scale: 0.075 }]));
  const rabbits = moving(batch(rabbit(), [{ x: -3, z: 7, scale: 0.05 }, { x: 6, z: -4, scale: 0.055 }]));
  const animals = [
    { mesh: foxMesh, index: 0, home: { x: 7, z: 5 }, x: 7, z: 5, size: 0.075, phase: rng() * 7, angle: 0 },
    { mesh: rabbits, index: 0, home: { x: -3, z: 7 }, x: -3, z: 7, size: 0.05, phase: rng() * 7, angle: 0 },
    { mesh: rabbits, index: 1, home: { x: 6, z: -4 }, x: 6, z: -4, size: 0.055, phase: rng() * 7, angle: 0 },
  ];
  batch(owl(false), [{ x: 4, z: -3.2, y: 5, scale: 0.08 }]);
  const owlHead = moving(batch(owl(true), [{ x: 4, z: -3.2, y: 5.9, scale: 0.08 }]));
  const owlBlink = moving(batch(owl(true, true), [{ x: 4, z: -3.2, y: 5.9, scale: 0.08 }]));

  return {
    update({ time, player, dt }: Frame) {
      animals.forEach((animal, i) => {
        const target = critterTarget(time, animal.home, animal.phase, player);
        const blend = dt === 0 ? 1 : 1 - Math.exp(-dt * (target.scared ? 3 : 0.8));
        const dx = (target.x - animal.x) * blend, dz = (target.z - animal.z) * blend;
        const next = movePlayer(animal, { x: dx, z: dz }, obstacles, 16);
        if (Math.hypot(dx, dz) > 0.001) animal.angle = Math.atan2(dx, dz) - (i === 0 ? Math.PI / 2 : 0);
        animal.x = next.x; animal.z = next.z;
        const hop = Math.max(0, Math.sin(time * (target.scared ? 13 : 5) + animal.phase));
        instance(animal.mesh, animal.index, animal.x, i === 0 ? hop * 0.06 : hop * (target.scared ? 0.55 : 0.18), animal.z, animal.size, animal.angle);
      });
      const turn = THREE.MathUtils.clamp(Math.atan2(player.x - 4, player.z + 3.2), -1.4, 1.4);
      instance(owlHead, 0, 4, 5.9, -3.2, 0.08, turn);
      instance(owlBlink, 0, 4, 5.9, -3.2, 0.08, turn);
      owlBlink.visible = cycle(time, 5.7) < 0.035; owlHead.visible = !owlBlink.visible;
      for (const mesh of [foxMesh, rabbits, owlHead, owlBlink]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
