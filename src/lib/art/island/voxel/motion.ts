import * as THREE from "three";

export function createMotion() {
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  return {
    instance(this: void, mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, size: number, angle = 0, sy = size): void {
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
      matrix.compose(position.set(x, y, z), rotation, scale.set(size, sy, size));
      mesh.setMatrixAt(i, matrix);
    },
    moving<T extends THREE.InstancedMesh>(this: void, mesh: T): T {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; return mesh;
    },
  };
}
