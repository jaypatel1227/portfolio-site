import type * as THREE from "three";
import type { Point } from "../math";
import type { Spot, StackMesh } from "../voxel/batch";

export interface Frame { time: number; player: Point; motion: number; dt: number }
export interface AnimationSystem {
  update: (frame: Frame) => void;
  setView?: (camera: THREE.OrthographicCamera) => void;
}
export interface Plants {
  pines: StackMesh;
  oak: StackMesh;
  grass: StackMesh;
  mushrooms: StackMesh;
  flora: Spot[];
  lamps: StackMesh;
  pools: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
}
