import * as THREE from "three";
import type { Point } from "../math";
import { bakeStack } from "./bake";
import type { VoxelModel } from "./grid";

export interface Spot extends Point { scale: number; y?: number; angle?: number; sy?: number }
export type StackMesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
export type Batch = (model: VoxelModel, spots: Spot[], palette?: readonly string[]) => StackMesh;

export function createBatch(scene: THREE.Scene, palette: readonly string[]): Batch {
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  return (voxels, spots, colors = palette) => {
    const baked = bakeStack(voxels, colors);
    const mesh = new THREE.InstancedMesh(baked.geometry, baked.material, spots.length);
    spots.forEach((spot, i) => {
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, spot.angle ?? 0);
      matrix.compose(position.set(spot.x, spot.y ?? 0, spot.z), rotation, scale.set(spot.scale, spot.sy ?? spot.scale, spot.scale));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.computeBoundingSphere(); scene.add(mesh);
    return mesh;
  };
}
