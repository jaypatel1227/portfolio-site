/** The conifer field around the clearing. */
import * as THREE from "three";
import { TAU, clamp, mulberry32, pointToSegmentDist2 } from "../math";
import { HOME_POS, TREE_POS, TREE_FIELD_RADIUS, LANDMARK_CLEARINGS, pathDistance } from "./layout";
import { makeDeadTreeTexture, makePineTexture } from "./textures";
import { addContactShadows, crossCardGeometry } from "./shared";
import type { Collision } from "../world";

interface TreeSpot {
  x: number;
  z: number;
  height: number;
  width: number;
  rot: number;
  lean: number;
  tint: number;
  variant: number;
}

export function buildTrees(
  scene: THREE.Scene,
  seed: number,
  collisions: Collision[],
  groundHeightAt: (x: number, z: number) => number
): void {
  const rng = mulberry32(seed);
  const spots: TreeSpot[] = [];
  const ax = HOME_POS.x;
  const az = HOME_POS.z;
  const bx = TREE_POS.x;
  const bz = TREE_POS.z;
  let guard = 0;

  while (spots.length < 460 && guard < 12000) {
    guard++;
    const r = 13 + Math.pow(rng(), 1.32) * (TREE_FIELD_RADIUS - 13);
    const theta = rng() * TAU;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    if (pathDistance(x, z) < 4.4) continue;
    if (Math.hypot(x - TREE_POS.x, z - TREE_POS.z) < 7) continue;
    if (LANDMARK_CLEARINGS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    // keep the hero's view down the path open
    const seg = Math.sqrt(
      pointToSegmentDist2(x, z, ax, az, bx, bz)
    );
    if (seg < 11 && r < 52 && rng() < 0.92) continue;

    const cypress = rng() < 0.26;
    const near = Math.hypot(x - ax, z - az) < 34;
    const height = cypress
      ? 10 + rng() * 11
      : (near ? 7 : 11) + Math.pow(rng(), 1.4) * 12;
    spots.push({
      x,
      z,
      height,
      width: height * (cypress ? 0.3 : 0.44 + rng() * 0.18),
      rot: rng() * TAU,
      lean: (rng() - 0.5) * 0.05,
      tint: 0.62 + rng() * 0.38,
      variant: cypress ? 2 : rng() < 0.55 ? 0 : 1,
    });
    collisions.push({ x, z, r: near ? 0.55 : 0.4 });
  }

  // pines keep their painted bough silhouette (it reads from every angle);
  // five intersecting planes give the clusters real volume
  const pineGeometry = crossCardGeometry();
  const [pine0, pine1, cypress] = [
    makePineTexture(seed ^ 0x11, false),
    makePineTexture(seed ^ 0x22, false),
    makePineTexture(seed ^ 0x33, true),
  ];
  const mapByVariant = [pine0, pine1, cypress];

  const groups: TreeSpot[][] = [[], [], []];
  for (const s of spots) groups[s.variant].push(s);

  // pines render dark-on-dark by design: the painted bough silhouette IS
  // the model. No rim injection — it washes the forest out.
  const makePineMat = (map: THREE.Texture): THREE.MeshStandardMaterial => {
    return new THREE.MeshStandardMaterial({
      map,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: 0xb6a18a,
      // a whisper of cool sky-light keeps the nearest silhouettes from
      // crushing to pure black and losing their bough detail
      emissive: 0x1d1411,
      emissiveIntensity: 0.42,
    });
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const col = new THREE.Color();

  const meshes: THREE.InstancedMesh[] = [];
  groups.forEach((group, gi) => {
    if (!group.length) return;
    const mesh = new THREE.InstancedMesh(pineGeometry, makePineMat(mapByVariant[gi]), group.length);
    group.forEach((s, i) => {
      const gy = groundHeightAt(s.x, s.z);
      e.set(s.lean, s.rot, s.lean * 0.6);
      q.setFromEuler(e);
      sc.set(s.width, s.height, s.width);
      m.compose(pv.set(s.x, gy - 0.15, s.z), q, sc);
      mesh.setMatrixAt(i, m);
      const dist = Math.hypot(s.x - ax, s.z - az);
      const far = clamp(dist / 110, 0, 1);
      col.setHSL(
        0.08 + rng() * 0.055,
        (0.08 + rng() * 0.1) * (1 - far * 0.55),
        0.27 + far * 0.25 + rng() * 0.1
      );
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    meshes.push(mesh);
  });

  // actual trunks for the closest ranks
  const trunkGeo = new THREE.CylinderGeometry(0.34, 0.62, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 1, metalness: 0 });
  const nearSpots = spots.filter((s) => Math.hypot(s.x - ax, s.z - az) < 46);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, nearSpots.length);
  nearSpots.forEach((s, i) => {
    const gy = groundHeightAt(s.x, s.z);
    e.set(s.lean, s.rot, s.lean * 0.6);
    q.setFromEuler(e);
    const th = Math.min(7.5, s.height * 0.52);
    sc.set(s.width * 0.078, th, s.width * 0.078);
    m.compose(pv.set(s.x, gy - 0.1, s.z), q, sc);
    trunks.setMatrixAt(i, m);
  });
  trunks.instanceMatrix.needsUpdate = true;
  trunks.frustumCulled = false;
  scene.add(trunks);

  // ground the near trunks with soft contact shadows
  addContactShadows(
    scene,
    nearSpots.map((s) => ({ x: s.x, z: s.z, s: Math.max(1.2, s.width * 1.15), sy: 0.85 })),
    groundHeightAt,
    0.4
  );

  // a handful of bare snags break up the cone silhouettes
  const snagGeometry = crossCardGeometry();
  const snagTex = makeDeadTreeTexture(seed ^ 0xdead);
  const snagMat = new THREE.MeshStandardMaterial({
    map: snagTex,
    alphaTest: 0.44,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  const snagSpots: Array<{ x: number; z: number; h: number }> = [];
  let snagGuard = 0;
  while (snagSpots.length < 7 && snagGuard < 400) {
    snagGuard++;
    const r = 17 + rng() * 38;
    const a = rng() * TAU;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (pathDistance(x, z) < 6) continue;
    if (Math.hypot(x - TREE_POS.x, z - TREE_POS.z) < 10) continue;
    if (snagSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 9)) continue;
    snagSpots.push({ x, z, h: 8 + rng() * 7 });
  }
  const snags = new THREE.InstancedMesh(snagGeometry, snagMat, snagSpots.length);
  snagSpots.forEach((s, i) => {
    const gy = groundHeightAt(s.x, s.z);
    e.set(0, rng() * TAU, (rng() - 0.5) * 0.04);
    q.setFromEuler(e);
    sc.set(s.h * 0.62, s.h, s.h * 0.62);
    m.compose(pv.set(s.x, gy - 0.1, s.z), q, sc);
    snags.setMatrixAt(i, m);
    col.setHSL(0.09, 0.06, 0.36 + rng() * 0.18);
    snags.setColorAt(i, col);
  });
  snags.instanceMatrix.needsUpdate = true;
  if (snags.instanceColor) snags.instanceColor.needsUpdate = true;
  snags.frustumCulled = false;
  scene.add(snags);
  addContactShadows(
    scene,
    snagSpots.map((s) => ({ x: s.x, z: s.z, s: 1.1, sy: 0.7 })),
    groundHeightAt,
    0.34
  );
}
