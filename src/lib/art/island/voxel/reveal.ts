import * as THREE from "three";
import { DETAIL } from "../config";
import { approachReveal, staggerReveal } from "./reveal-math";

export function createReveal(meshes: THREE.InstancedMesh[], cullPadding?: number) {
  const entries = meshes.map((mesh) => {
    mesh.visible = false;
    const originals = Array.from({ length: mesh.count }, (_, i) => {
      const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix); return matrix;
    });
    let bounds: THREE.Sphere[] | undefined;
    if (cullPadding !== undefined && mesh.count >= 16) {
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const shape = mesh.geometry.boundingSphere!;
      // Reveal scales around the instance origin, not the geometry center.
      const radius = shape.center.length() + shape.radius + cullPadding;
      bounds = originals.map((m) => new THREE.Sphere(new THREE.Vector3(), radius).applyMatrix4(m));
    }
    return { mesh, originals, bounds, visible: new Uint8Array(mesh.count).fill(1) };
  });
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
  let amount = 0;
  return {
    get amount() { return amount; },
    update(target: number, dt: number, moving?: THREE.InstancedMesh, frustum?: THREE.Frustum): number {
      const before = amount;
      amount = approachReveal(amount, target, dt, DETAIL.revealSeconds);
      let index = 0;
      for (const { mesh, originals, bounds, visible } of entries) {
        if (amount === 0) { mesh.visible = false; index += originals.length; continue; }
        let dirty = amount !== before || mesh === moving;
        if (bounds && mesh !== moving) for (let i = 0; i < bounds.length; i++) {
          const draw = Number(!frustum || frustum.intersectsSphere(bounds[i]));
          if (visible[i] !== draw) { visible[i] = draw; dirty = true; }
        }
        if (!dirty) { index += originals.length; continue; }
        let count = 0;
        for (let i = 0; i < originals.length; i++) {
          if (!visible[i]) continue;
          if (mesh === moving) mesh.getMatrixAt(i, originals[i]);
          const size = staggerReveal(amount, index + i);
          mesh.setMatrixAt(count++, size === 1 ? originals[i] : matrix.copy(originals[i]).scale(scale.setScalar(size)));
        }
        index += originals.length;
        mesh.count = count; mesh.visible = count > 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
      return amount;
    },
  };
}
