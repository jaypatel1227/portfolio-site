/** Where things are in the glade: fixed positions, the trail and the terrain height. */
import * as THREE from "three";
import { clamp, smoothstep, makeNoise, pointToSegmentDist2 } from "../math";

export const HOME_POS = new THREE.Vector3(0, 1.7, 26.5);
export const TREE_POS = new THREE.Vector3(10.5, 0, -2);
export const TREE_LOOK = new THREE.Vector3(TREE_POS.x, 4.9, TREE_POS.z);
export const BOUND_RADIUS = 74;
export const TREE_FIELD_RADIUS = 126;

/** keep the forest off the landmarks so they read as destinations */
export const LANDMARK_CLEARINGS = [
  { x: -30, z: -33, r: 12 }, // the standing stones
  { x: 33.5, z: -19, r: 8.5 }, // the hut
  { x: -15, z: -55, r: 10 }, // the titan
];

export function pathDistance(x: number, z: number): number {
  // the trail bends a little on its way to the tree
  const bend = (Math.sin((z - HOME_POS.z) * 0.085) - Math.sin(0)) * 1.9;
  return Math.sqrt(
    pointToSegmentDist2(x + bend, z, HOME_POS.x, HOME_POS.z, TREE_POS.x, TREE_POS.z)
  );
}

/** displaced-ground height, shared by the mesh, tree planting, flora and player */
export function makeGroundHeight(seed: number): (x: number, z: number) => number {
  const broad = makeNoise(seed ^ 0x1e37);
  const detail = makeNoise(seed ^ 0x7a11);
  return (x, z) => {
    const r = Math.hypot(x, z);
    const path = pathDistance(x, z);
    const clearing = smoothstep(7, 30, r);
    const bowl = smoothstep(22, 88, r);
    const hills =
      broad(x * 0.026, z * 0.026) * 5.6 +
      detail(x * 0.075 + 40, z * 0.075 + 40) * 1.5 +
      broad(x * 0.011 + 17, z * 0.011 + 17) * 9.0 * bowl;
    const flatten = 1 - Math.exp(-(path * path) / 26);
    return hills * clamp(clearing * 0.55 + bowl * 0.85, 0, 1) * flatten - 0.02;
  };
}
