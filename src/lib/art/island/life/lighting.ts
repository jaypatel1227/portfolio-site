import * as THREE from "three";
import { createMotion } from "../voxel/motion";
import type { AnimationSystem, Frame, Plants } from "./types";

export function createLighting(plants: Plants, frustum: THREE.Frustum): AnimationSystem {
  const { instance } = createMotion();
  const color = new THREE.Color();
  const mesh = plants.mushrooms;
  if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const shape = mesh.geometry.boundingSphere!;
  const bounds = plants.flora.map(o => new THREE.Sphere(new THREE.Vector3(o.x, 0, o.z), (shape.radius + shape.center.length()) * o.scale * 1.3));
  const slots = new Int32Array(bounds.length).fill(-1), pulses = new Float64Array(bounds.length);

  return {
    update({ time, player }: Frame) {
      for (let i = 0; i < plants.pools.length; i++) {
        plants.pools[i].material.opacity = 0.38 + Math.sin(time * 7 + i * 3) * 0.025 + Math.sin(time * 13 + i) * 0.015;
      }
      (plants.lamps.material as THREE.MeshBasicMaterial).color.setScalar(0.96 + Math.sin(time * 9) * 0.08);
      let count = 0, dirty = false;
      const flora = plants.flora;
      for (let i = 0; i < flora.length; i++) {
        if (!frustum.intersectsSphere(bounds[i])) continue;
        const o = flora[i];
        const slot = count++;
        const dx = o.x - player.x, dz = o.z - player.z;
        const d2 = dx * dx + dz * dz;
        const pulse = d2 < 3.61 ? (1 - Math.sqrt(d2) / 1.9) * (0.8 + Math.sin(time * 6 + i) * 0.2) : 0;
        if (slots[slot] === i && pulses[slot] === pulse) continue;
        slots[slot] = i; pulses[slot] = pulse; dirty = true;
        instance(mesh, slot, o.x, 0, o.z, o.scale * (1 + pulse * 0.3), 0, o.scale * (1 - pulse * 0.5));
        mesh.setColorAt(slot, color.setRGB(1 + pulse * 1.5, 1 + pulse * 0.7, 1 + pulse * 0.2));
      }
      mesh.count = count; mesh.visible = count > 0;
      if (dirty) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true; }
    },
  };
}
