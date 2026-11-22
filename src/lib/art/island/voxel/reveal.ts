import * as THREE from "three";
import { DETAIL } from "../config";
import { approachReveal, staggerReveal } from "./reveal-math";

export function createReveal(meshes: THREE.InstancedMesh[]) {
  const entries = meshes.map((mesh) => {
    mesh.visible = false;
    mesh.frustumCulled = false;
    const originals = Array.from({ length: mesh.count }, (_, i) => {
      const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix); return matrix;
    });
    return { mesh, originals };
  });
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
  let amount = 0;
  return {
    get amount() { return amount; },
    update(target: number, dt: number, moving?: THREE.InstancedMesh): number {
      amount = approachReveal(amount, target, dt, DETAIL.revealSeconds);
      let index = 0;
      for (const { mesh, originals } of entries) {
        mesh.visible = amount > 0;
        for (let i = 0; i < originals.length; i++) {
          if (mesh === moving) mesh.getMatrixAt(i, originals[i]);
          const size = staggerReveal(amount, index++);
          mesh.setMatrixAt(i, matrix.copy(originals[i]).scale(scale.setScalar(size)));
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
      return amount;
    },
  };
}
