/** The Ashen Ruins: metres, with north along negative z. */
import * as THREE from "three";
import { makeNoise, pointToSegmentDist2, smoothstep } from "../math";

export const HOME = new THREE.Vector3(0, 0, 29);
export const CATHEDRAL = new THREE.Vector3(9, 0, -12);
export const CASTLE = new THREE.Vector3(60, 24, -108);
export const LOOK_AT = new THREE.Vector3(3.5, 8, -15);
export const BOUND_RADIUS = 78;
export const DOOR = new THREE.Vector3(CATHEDRAL.x, 0, -6);
export const CAUSEWAY_WIDTH = 5.4;

export function causewayDistance(x: number, z: number): number {
  return Math.sqrt(pointToSegmentDist2(x, z, HOME.x, HOME.z, DOOR.x, DOOR.z));
}

export function makeHeightAt(seed: number): (x: number, z: number) => number {
  const noise = makeNoise(seed);
  return (x, z) => {
    const radius = Math.hypot(x, z);
    const bowl = smoothstep(32, 115, radius);
    const crags = Math.pow(Math.abs(noise(x * 0.037, z * 0.037)), 0.7);
    const hills = bowl * (8 + crags * 22) + noise(x * 0.11, z * 0.11) * (0.2 + bowl * 1.4);
    const path = smoothstep(CAUSEWAY_WIDTH * 0.5, 9, causewayDistance(x, z));
    const foundation = smoothstep(9, 19, Math.hypot(x - CATHEDRAL.x, z - CATHEDRAL.z));
    return hills * path * foundation - 0.16;
  };
}
