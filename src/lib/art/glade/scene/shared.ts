/** Geometry helpers shared by more than one part of the glade. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TAU } from "../math";
import { makeShadowTexture } from "./textures";

/** soft dark blobs that sit objects down onto the moss */
export function addContactShadows(
  scene: THREE.Scene,
  spots: Array<{ x: number; z: number; s: number; sy?: number }>,
  groundHeightAt: (x: number, z: number) => number,
  opacity = 0.42
): void {
  if (!spots.length) return;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: makeShadowTexture(),
    transparent: true,
    depthWrite: false,
    color: 0x000000,
    opacity,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  spots.forEach((s, i) => {
    e.set(0, (s.x * 13.7 + s.z * 7.3) % TAU, 0);
    q.setFromEuler(e);
    sc.set(s.s * 2.1, 1, s.s * 2.1 * (s.sy ?? 0.8));
    m.compose(pv.set(s.x, groundHeightAt(s.x, s.z) + 0.045, s.z), q, sc);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
}

export function crossCardGeometry(planes = 4): THREE.BufferGeometry {
  // intersecting cards give each foliage clump volume from every angle;
  // staggered angles keep the silhouette organic instead of star-regular
  const offsets = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < planes; i++) {
    const p = new THREE.PlaneGeometry(1, 1, 1, 1);
    p.translate(0, 0.5, 0);
    p.rotateY(offsets[i % offsets.length] + (i >= 4 ? Math.PI / 8 : 0));
    parts.push(p);
  }
  const geo = mergeGeometries(parts)!;
  // tilt card normals toward the sky so the boughs catch moon/hemisphere
  // light instead of turning into flat black cutouts
  const n = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.set(n.getX(i), n.getY(i), n.getZ(i)).multiplyScalar(0.3).add(new THREE.Vector3(0, 1, 0));
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  return geo;
}
