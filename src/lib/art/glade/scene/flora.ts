/** Ground cover: grass, ferns, flowers, rocks, mushrooms, the trail and fallen leaves. */
import * as THREE from "three";
import { TAU, clamp, lerp, mulberry32, makeNoise } from "../math";
import { HOME_POS, TREE_POS, pathDistance } from "./layout";
import { makeCanopyTexture, makeFernTexture, makeFlowerTexture, makeGrassTexture, makeLeafTexture, makeTrailTextures } from "./textures";
import { addContactShadows } from "./shared";

/** injects a gentle wind sway into a standard material's vertex stage */
function addWind(
  material: THREE.MeshStandardMaterial,
  timeUniform: { value: number },
  strength: number
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.u_time = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float u_time;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float sway = sin(u_time * 1.55 + iOrigin.x * 0.34 + iOrigin.z * 0.26) * ${(
            strength * 0.18
          ).toFixed(3)}
                     + sin(u_time * 2.7 + iOrigin.x * 1.2 + iOrigin.z * 0.8) * ${(
                       strength * 0.05
                     ).toFixed(3)};
          float bend = pow(max(position.y, 0.0), 1.55);
          transformed.x += sway * bend;
          transformed.z += sway * 0.42 * bend;
        #endif`
      );
  };
}

function planeCross(): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(1, 1, 1, 1);
  a.translate(0, 0.5, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  const c = new THREE.BufferGeometry();
  const pa = a.toNonIndexed();
  const pb = b.toNonIndexed();
  const pos = new Float32Array([...pa.attributes.position.array, ...pb.attributes.position.array]);
  const uv = new Float32Array([...pa.attributes.uv.array, ...pb.attributes.uv.array]);
  const norm = new Float32Array(pos.length);
  for (let i = 0; i < norm.length; i += 3) norm[i + 1] = 1;
  c.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  c.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  c.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  return c;
}

export interface FloraRig {
  update: (time: number) => void;
}

export function buildFlora(
  scene: THREE.Scene,
  seed: number,
  groundHeightAt: (x: number, z: number) => number,
  collisions: { x: number; z: number; r: number }[]
): FloraRig {
  const rng = mulberry32(seed ^ 0x7a3c);
  const timeUniform = { value: 0 };

  /* ---- grass ---- */
  const blade = new THREE.PlaneGeometry(1, 1, 1, 2);
  blade.translate(0, 0.5, 0);
  const GRASS_VARIANTS = [0, 1, 2];
  const grassVariants = GRASS_VARIANTS.map((v) => {
    const map = makeGrassTexture(seed ^ (0x2211 + v * 0x9d), v);
    return new THREE.MeshStandardMaterial({
      map,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
      emissive: 0x263910,
      emissiveMap: map,
      emissiveIntensity: 0.3,
    });
  });
  grassVariants.forEach((mat) => addWind(mat, timeUniform, 1.2));

  const GRASS = 82000;
  const PER_VARIANT = Math.ceil(GRASS / grassVariants.length) + 96;
  const grassMeshes = grassVariants.map(
    (mat) => new THREE.InstancedMesh(blade, mat, PER_VARIANT)
  );
  const grassCounts = grassVariants.map(() => 0);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const col = new THREE.Color();
  const clumpNoise = makeNoise(seed ^ 0x5c1f);
  let placed = 0;
  let guard = 0;
  while (placed < GRASS && guard < GRASS * 12) {
    guard++;
    const a = rng() * TAU;
    // bias the field inward so the near ground reads lush, not bare
    const r = Math.pow(rng(), 1.28) * 74;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // feather the trail edge so blades thin out naturally instead of
    // lining up in a picket fence along the exclusion boundary
    const edgeJit = clumpNoise(x * 0.85 + 17.3, z * 0.85 + 5.1) * 0.5 + 0.5;
    if (pathDistance(x, z) < 1.05 + edgeJit * 0.95) continue;
    if (Math.hypot(x - TREE_POS.x, z - TREE_POS.z) < 3.2) continue;
    // patchy growth: leave mossy gaps instead of a uniform lawn
    const clump = clumpNoise(x * 0.17 + 3.1, z * 0.17 + 7.4) * 0.5 + 0.5;
    if (clump < 0.34 && rng() < 0.8) continue;
    const gy = groundHeightAt(x, z);
    if (Math.hypot(x - HOME_POS.x, z - HOME_POS.z) < 2.4) continue;
    const variant = rng() < 0.44 ? 0 : rng() < 0.62 ? 1 : 2;
    if (grassCounts[variant] >= PER_VARIANT) continue;
    const h = (0.16 + Math.pow(rng(), 1.5) * 0.62) * (0.55 + clump * 0.95);
    e.set((rng() - 0.5) * 0.3, rng() * TAU, (rng() - 0.5) * 0.45);
    q.setFromEuler(e);
    sc.set(h * (0.42 + rng() * 0.3), h, 1);
    m.compose(pv.set(x, gy - 0.04, z), q, sc);
    const mesh = grassMeshes[variant];
    const idx = grassCounts[variant];
    mesh.setMatrixAt(idx, m);
    const tint = 0.42 + rng() * 0.58;
    // broad dry and damp patches so the sward is not a flat green carpet
    const dry = clamp((clumpNoise(x * 0.022 + 41, z * 0.022 + 9) * 0.5 + 0.5 - 0.56) * 2.2, 0, 1);
    const damp = clamp((clumpNoise(x * 0.017 + 73, z * 0.017 + 55) * 0.5 + 0.5 - 0.6) * 2.0, 0, 1);
    col.setHSL(
      0.185 + rng() * 0.06 + dry * 0.05,
      0.12 + rng() * 0.16 + dry * 0.12,
      0.08 + tint * 0.15 + dry * 0.04 - damp * 0.035
    );
    mesh.setColorAt(idx, col);
    grassCounts[variant]++;
    placed++;
  }
  grassMeshes.forEach((mesh, v) => {
    mesh.count = grassCounts[v];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  });

  // a few deliberate tall tufts framing the opening shot
  const tuftSpots: Array<[number, number, number]> = [
    [-2.7, 23.6, 1.3], [-3.6, 22.2, 1.0], [2.9, 23.1, 1.25], [3.8, 21.7, 0.95],
    [-2.2, 19.4, 1.1], [2.6, 18.4, 1.0], [-6.1, 24.3, 1.4], [6.3, 23.9, 1.35],
    // near-camera corner framing
    [-4.9, 25.4, 1.45], [-6.8, 24.6, 1.35], [-8.6, 25.8, 1.5],
    [5.1, 25.1, 1.4], [7.4, 24.4, 1.35], [9.2, 25.6, 1.5],
    [-9.8, 22.6, 1.3], [10.4, 22.9, 1.35],
    // tall stalks rising into the bottom of the opening frame
    [-1.9, 23.2, 1.35], [1.3, 23.6, 1.3], [-3.3, 22.6, 1.45], [3.5, 22.4, 1.5],
    [-5.4, 23.0, 1.55], [5.9, 22.8, 1.5], [-7.6, 23.8, 1.6], [8.1, 23.4, 1.55],
    [-9.6, 24.6, 1.6], [10.2, 24.2, 1.55],
  ];
  const tufts = new THREE.InstancedMesh(
    blade,
    grassVariants[2],
    tuftSpots.filter(([x, z]) => pathDistance(x, z) > 2.1).length
  );
  let ti = 0;
  tuftSpots.forEach(([x, z, s]) => {
    // keep the trail itself clear so the foreground stalks frame it instead
    // of sprouting out of the middle of the path
    if (pathDistance(x, z) <= 2.1) return;
    const gy = groundHeightAt(x, z);
    e.set(0, rng() * TAU, 0);
    q.setFromEuler(e);
    sc.set(s * 1.15, s, 1);
    m.compose(pv.set(x, gy - 0.02, z), q, sc);
    tufts.setMatrixAt(ti, m);
    col.setHSL(0.2 + rng() * 0.05, 0.28, 0.26 + rng() * 0.12);
    tufts.setColorAt(ti, col);
    ti++;
  });
  tufts.count = ti;
  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  tufts.frustumCulled = false;
  scene.add(tufts);

  /* ---- foreground blades that frame the lens ---- */
  // placed relative to the opening camera basis so they sit at the bottom corners
  const camYaw = -0.35299;
  const camFwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const camRight = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const FG = 26;
  const fgBlades = new THREE.InstancedMesh(blade, grassVariants[2], FG);
  let fgi = 0;
  for (let i = 0; i < FG; i++) {
    const d = 1.55 + rng() * 2.7;
    const side = rng() < 0.5 ? -1 : 1;
    const lat = side * d * (0.34 + rng() * 0.58);
    const x = HOME_POS.x + camFwd.x * d + camRight.x * lat;
    const z = HOME_POS.z + camFwd.z * d + camRight.z * lat;
    const gy = groundHeightAt(x, z);
    const h = 0.55 + rng() * 1.0;
    e.set(0, rng() * TAU, (rng() - 0.5) * 0.55);
    q.setFromEuler(e);
    sc.set(h * (0.9 + rng() * 0.7), h, 1);
    m.compose(pv.set(x, gy - 0.03, z), q, sc);
    fgBlades.setMatrixAt(fgi, m);
    col.setHSL(0.2 + rng() * 0.05, 0.18 + rng() * 0.12, 0.1 + rng() * 0.09);
    fgBlades.setColorAt(fgi, col);
    fgi++;
  }
  fgBlades.count = fgi;
  fgBlades.instanceMatrix.needsUpdate = true;
  if (fgBlades.instanceColor) fgBlades.instanceColor.needsUpdate = true;
  fgBlades.frustumCulled = false;
  scene.add(fgBlades);

  /* ---- the near verge: tall, moonlit blades framing the opening ---- */
  const VERGE = 26000;
  const verge = new THREE.InstancedMesh(blade, grassVariants[1], VERGE);
  let vplaced = 0;
  let vguard = 0;
  while (vplaced < VERGE && vguard < VERGE * 6) {
    vguard++;
    // a band across the opening shot, from just in front of the camera out
    // toward the great tree, with the trail kept clear
    const z = 6 + rng() * 19;
    const x = -22 + rng() * 44;
    const vEdge = clumpNoise(x * 0.7 + 41.2, z * 0.7 + 9.7) * 0.5 + 0.5;
    if (pathDistance(x, z) < 0.95 + vEdge * 0.95) continue;
    // never let a blade sprout right under the lens
    if (Math.hypot(x - HOME_POS.x, z - HOME_POS.z) < 2.6) continue;
    const gy = groundHeightAt(x, z);
    // low ground cover: taller as it recedes, cropped short near the feet
    const nearness = clamp(1 - (HOME_POS.z - z) / 22, 0.1, 1);
    const h = (0.3 + Math.pow(rng(), 1.25) * 0.62) * (0.85 + (1 - nearness) * 0.5);
    e.set(0, rng() * TAU, (rng() - 0.5) * 0.22);
    q.setFromEuler(e);
    sc.set(h * (0.9 + rng() * 0.6), h, 1);
    m.compose(pv.set(x, gy - 0.04, z), q, sc);
    verge.setMatrixAt(vplaced, m);
    const tint = rng();
    col.setHSL(
      0.19 + rng() * 0.06,
      0.18 + rng() * 0.2,
      0.3 + (1 - nearness) * 0.12 + tint * 0.2
    );
    verge.setColorAt(vplaced, col);
    vplaced++;
  }
  verge.count = vplaced;
  verge.instanceMatrix.needsUpdate = true;
  if (verge.instanceColor) verge.instanceColor.needsUpdate = true;
  verge.frustumCulled = false;
  scene.add(verge);

  /* ---- ferns ---- */
  const fernGeo = planeCross();
  const fernMat = new THREE.MeshStandardMaterial({
    map: makeFernTexture(seed ^ 0x5533),
    alphaTest: 0.26,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  addWind(fernMat, timeUniform, 0.55);
  const FERNS = 320;
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, FERNS);
  for (let i = 0; i < FERNS; i++) {
    const a = rng() * TAU;
    const r = 5 + Math.pow(rng(), 0.8) * 66;
    let x = Math.cos(a) * r;
    let z = Math.sin(a) * r;
    // keep fronds off the trail and out of the immediate foreground;
    // feather the boundary so they don't line up along it
    const fJit = clumpNoise(x * 0.55 + 63.1, z * 0.55 + 21.7) * 0.5 + 0.5;
    if (pathDistance(x, z) < 1.7 + fJit * 1.4) continue;
    if (Math.hypot(x - HOME_POS.x, z - HOME_POS.z) < 7) continue;
    if (Math.hypot(x - TREE_POS.x, z - TREE_POS.z) < 3) {
      x += 6;
    }
    const gy = groundHeightAt(x, z);
    const s = 0.55 + rng() * 1.15;
    e.set(0, rng() * TAU, 0);
    q.setFromEuler(e);
    sc.set(s, s * (0.75 + rng() * 0.45), s);
    m.compose(pv.set(x, gy - 0.03, z), q, sc);
    ferns.setMatrixAt(i, m);
    col.setHSL(0.26 + rng() * 0.04, 0.24, 0.2 + rng() * 0.12);
    ferns.setColorAt(i, col);
  }
  ferns.instanceMatrix.needsUpdate = true;
  if (ferns.instanceColor) ferns.instanceColor.needsUpdate = true;
  ferns.frustumCulled = false;
  scene.add(ferns);

  const heroFerns: Array<[number, number, number]> = [
    // kept clear of the trail and the lens so no frond lies across the path
    [-3.1, 23.9, 1.9], [6.6, 23.1, 1.6], [-5.4, 19.8, 2.1], [8.6, 18.4, 1.7],
    // open right-hand midground: gives the frame a second point of interest
    // so it is not pulled only to the trunk
    [17.5, 9.4, 1.8], [22.8, 7.2, 2.2], [27.4, 11.6, 1.7],
    [19.2, 2.8, 2.0], [25.6, 0.6, 1.6], [31.8, 6.4, 2.1],
  ];
  const fernHeroes = new THREE.InstancedMesh(fernGeo, fernMat, heroFerns.length);
  heroFerns.forEach(([x, z, s], i) => {
    const gy = groundHeightAt(x, z);
    e.set(0, rng() * TAU, 0);
    q.setFromEuler(e);
    sc.set(s, s * 0.9, s);
    m.compose(pv.set(x, gy - 0.04, z), q, sc);
    fernHeroes.setMatrixAt(i, m);
    col.setHSL(0.26, 0.25, 0.22 + rng() * 0.08);
    fernHeroes.setColorAt(i, col);
  });
  fernHeroes.instanceMatrix.needsUpdate = true;
  if (fernHeroes.instanceColor) fernHeroes.instanceColor.needsUpdate = true;
  fernHeroes.frustumCulled = false;
  scene.add(fernHeroes);

  /* ---- wildflowers: small pale blooms catching the moonlight ---- */
  const flowerMat = new THREE.MeshStandardMaterial({
    map: makeFlowerTexture(seed ^ 0x4e21),
    alphaTest: 0.28,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
    emissive: 0x141a20,
    emissiveIntensity: 0.6,
  });
  addWind(flowerMat, timeUniform, 0.7);
  const FLOWERS = 300;
  const flowers = new THREE.InstancedMesh(fernGeo, flowerMat, FLOWERS);
  for (let i = 0; i < FLOWERS; i++) {
    const a = rng() * TAU;
    const r = Math.pow(rng(), 1.1) * 40;
    let x = Math.cos(a) * r;
    let z = Math.sin(a) * r;
    if (pathDistance(x, z) < 1.7) {
      x += 3.2;
      z += 1.4;
    }
    if (Math.hypot(x - HOME_POS.x, z - HOME_POS.z) < 3.2) continue;
    const gy = groundHeightAt(x, z);
    const s = 0.24 + rng() * 0.34;
    e.set(0, rng() * TAU, (rng() - 0.5) * 0.18);
    q.setFromEuler(e);
    sc.set(s * 0.9, s, s * 0.9);
    m.compose(pv.set(x, gy - 0.03, z), q, sc);
    flowers.setMatrixAt(i, m);
    col.setHSL(0.16 + rng() * 0.06, 0.08 + rng() * 0.1, 0.2 + rng() * 0.12);
    flowers.setColorAt(i, col);
  }
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  flowers.frustumCulled = false;
  scene.add(flowers);

  /* ---- low bushes ---- */
  const bushGeo = planeCross();
  const bushMat = new THREE.MeshStandardMaterial({
    map: makeCanopyTexture(seed ^ 0x6b6b),
    alphaTest: 0.28,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  addWind(bushMat, timeUniform, 0.3);
  const BUSHES = 520;
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, BUSHES);
  for (let i = 0; i < BUSHES; i++) {
    const a = rng() * TAU;
    const r = 4 + Math.pow(rng(), 0.7) * 72;
    let x = Math.cos(a) * r;
    let z = Math.sin(a) * r;
    if (pathDistance(x, z) < 2.2) {
      x += 5;
      z -= 3;
    }
    const gy = groundHeightAt(x, z);
    const s = 0.55 + rng() * 1.35;
    e.set(0, rng() * TAU, 0);
    q.setFromEuler(e);
    sc.set(s * (0.9 + rng() * 0.5), s * (0.6 + rng() * 0.4), s);
    m.compose(pv.set(x, gy - 0.06, z), q, sc);
    bushes.setMatrixAt(i, m);
    col.setHSL(0.26 + rng() * 0.04, 0.16 + rng() * 0.12, 0.1 + rng() * 0.1);
    bushes.setColorAt(i, col);
  }
  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  bushes.frustumCulled = false;
  scene.add(bushes);

  /* ---- rocks ---- */
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  const rockNoise = makeNoise(seed ^ 0x91aa);
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(rp, i);
    const n = rockNoise(v.x * 1.7 + 3.1, v.z * 1.7 + 7.4) * 0.22;
    v.multiplyScalar(1 + n);
    rp.setXYZ(i, v.x, v.y * 0.72, v.z);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });
  const ROCKS = 46;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
  const rockShadows: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < ROCKS; i++) {
    let x = 0;
    let z = 0;
    if (i < 12) {
      // a few deliberate boulders framing the path, kept back from the lens
      const t = 0.34 + (i / 12) * 0.62;
      const side = i % 2 ? 1 : -1;
      const px = lerp(HOME_POS.x, TREE_POS.x, t * 0.9);
      const pz = lerp(HOME_POS.z, TREE_POS.z, t * 0.9);
      x = px + side * (4.2 + rng() * 4.5);
      z = pz + (rng() - 0.5) * 5;
      if (Math.hypot(x - HOME_POS.x, z - HOME_POS.z) < 6.5) x += side * 3.5;
    } else if (i < 18) {
      // mossy outcrops scattered across the open right midground
      const rightRocks: Array<[number, number]> = [
        [16.2, 11.8], [23.4, 9.6], [29.8, 13.4], [20.6, 4.2], [27.2, 3.1], [34.6, 8.8],
      ];
      [x, z] = rightRocks[i - 12];
      x += (rng() - 0.5) * 1.4;
      z += (rng() - 0.5) * 1.4;
    } else {
      const a = rng() * TAU;
      const r = 7 + Math.pow(rng(), 0.7) * 70;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    const gy = groundHeightAt(x, z);
    const s = i < 12 ? 0.34 + rng() * 0.95 : 0.14 + Math.pow(rng(), 2) * 0.6;
    e.set(rng() * TAU, rng() * TAU, rng() * TAU);
    q.setFromEuler(e);
    sc.set(s * (0.8 + rng() * 0.5), s * (0.6 + rng() * 0.5), s * (0.8 + rng() * 0.5));
    m.compose(pv.set(x, gy + s * 0.1, z), q, sc);
    rocks.setMatrixAt(i, m);
    const l = 0.16 + rng() * 0.12;
    col.setHSL(0.09, 0.07, l * 0.28);
    rocks.setColorAt(i, col);
    if (s > 0.7) collisions.push({ x, z, r: s * 0.75 });
    if (s > 0.25) rockShadows.push({ x, z, s: s * 0.9 });
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  scene.add(rocks);
  addContactShadows(scene, rockShadows, groundHeightAt, 0.38);

  /* ---- a mossy hero boulder anchoring the near right foreground ---- */
  const heroRockGeo = new THREE.IcosahedronGeometry(1, 4);
  const heroRockNoise = makeNoise(seed ^ 0x6d31);
  const heroRockFine = makeNoise(seed ^ 0x2bc7);
  const hrp = heroRockGeo.attributes.position;
  for (let i = 0; i < hrp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(hrp, i);
    const n =
      heroRockNoise(v.x * 2.1 + 3.1, v.z * 2.1 + 7.4) * 0.3 +
      heroRockNoise(v.y * 1.9 + 5.3, v.x * 1.6 + 1.1) * 0.14 +
      heroRockFine(v.x * 6.8 + 12.4, v.z * 6.8 + 2.9) * 0.07;
    v.multiplyScalar(1 + n);
    hrp.setXYZ(i, v.x, v.y * 0.8, v.z);
  }
  heroRockGeo.computeVertexNormals();
  const hrn = heroRockGeo.attributes.normal;
  const hrc = new Float32Array(hrp.count * 3);
  const stoneC = new THREE.Color(0x33352f);
  const stoneLitC = new THREE.Color(0x4a4c44);
  const mossC = new THREE.Color(0x2b3f22);
  const mossLitC = new THREE.Color(0x46603a);
  const creviceC = new THREE.Color(0x151713);
  const tmpC = new THREE.Color();
  const stoneTmp = new THREE.Color();
  const mossTmp = new THREE.Color();
  for (let i = 0; i < hrp.count; i++) {
    const nx = hrn.getX(i);
    const ny = hrn.getY(i);
    const nz = hrn.getZ(i);
    const p = new THREE.Vector3().fromBufferAttribute(hrp, i);
    // mottled lichen/moss growth concentrated on the upward faces
    const patch =
      heroRockFine(p.x * 4.6 + 11, p.z * 4.6 + 5) * 0.5 +
      heroRockFine(p.y * 7.1 + 3.3, p.x * 5.2 + 9.6) * 0.28 +
      0.5;
    const mossAmt = clamp((ny - 0.16) * 2.1, 0, 1) * clamp(patch * 1.5 - 0.32, 0, 1) * 1.6;
    const tint = clamp(0.5 + heroRockNoise(p.x * 2.4 + 31, p.z * 2.4 + 17) * 0.9, 0, 1);
    stoneTmp.copy(stoneC).lerp(stoneLitC, tint * 0.7);
    mossTmp.copy(mossC).lerp(mossLitC, tint * 0.8);
    tmpC.copy(stoneTmp).lerp(mossTmp, clamp(mossAmt, 0, 1));
    // deep shadow where the surface folds away from the sky
    const fold = clamp(1 - ny * 1.35, 0, 1) * clamp(0.4 + Math.abs(nx) * 0.4 + Math.abs(nz) * 0.2, 0, 1);
    tmpC.lerp(creviceC, fold * 0.55);
    hrc[i * 3] = tmpC.r;
    hrc[i * 3 + 1] = tmpC.g;
    hrc[i * 3 + 2] = tmpC.b;
  }
  heroRockGeo.setAttribute("color", new THREE.BufferAttribute(hrc, 3));
  const heroRock = new THREE.Mesh(
    heroRockGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.03,
    })
  );
  const hrx = 9.2;
  const hrz = 20.4;
  heroRock.position.set(hrx, groundHeightAt(hrx, hrz) + 0.22, hrz);
  heroRock.scale.set(0.82, 0.6, 0.72);
  heroRock.rotation.set(0.12, 0.7, 0.06);
  scene.add(heroRock);
  addContactShadows(scene, [{ x: hrx, z: hrz, s: 0.82 }], groundHeightAt, 0.55);
  collisions.push({ x: hrx, z: hrz, r: 1.0 });

  // two smaller companions tucked into the grass beside it
  for (const [cx2, cz2, cs] of [
    [7.4, 21.4, 0.46],
    [10.9, 19.2, 0.34],
  ] as Array<[number, number, number]>) {
    const sub = new THREE.Mesh(
      heroRockGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0.03 })
    );
    sub.position.set(cx2, groundHeightAt(cx2, cz2) + cs * 0.24, cz2);
    sub.scale.set(cs * 1.15, cs * 0.72, cs);
    sub.rotation.set(0.1, cx2 * 1.7, 0.05);
    scene.add(sub);
    addContactShadows(scene, [{ x: cx2, z: cz2, s: cs * 1.1 }], groundHeightAt, 0.5);
    collisions.push({ x: cx2, z: cz2, r: cs * 1.2 });
  }

  /* ---- mushrooms ---- */
  const capGeo = new THREE.SphereGeometry(1, 10, 8, 0, TAU, 0, Math.PI / 2);
  capGeo.scale(1, 0.72, 1);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x0a1d1a,
    emissive: 0xffd542,
    emissiveIntensity: 1.1,
    roughness: 0.5,
  });
  const caps: THREE.Matrix4[] = [];
  const capPositions: THREE.Vector3[] = [];
  const clusters = [
    { x: TREE_POS.x + 4.4, z: TREE_POS.z + 3.4 },
    { x: TREE_POS.x - 3.6, z: TREE_POS.z - 4.0 },
    { x: -7.8, z: 9.2 },
    { x: 7.6, z: 17.4 },
    { x: -9.4, z: -12.0 },
    { x: 3.2, z: -24.0 },
    // a few cool glows out in the right-hand field so it is not a dead zone
    { x: 18.2, z: 13.4 },
    { x: 22.6, z: 7.8 },
    { x: 29.4, z: 5.0 },
  ];
  for (const c of clusters) {
    const count = 4 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      const x = c.x + (rng() - 0.5) * 2.2;
      const z = c.z + (rng() - 0.5) * 2.2;
      // keep the trail itself clear of glowing caps
      if (pathDistance(x, z) < 1.4) continue;
      const gy = groundHeightAt(x, z);
      const s = 0.03 + Math.pow(rng(), 1.6) * 0.075;
      e.set((rng() - 0.5) * 0.3, rng() * TAU, (rng() - 0.5) * 0.3);
      q.setFromEuler(e);
      sc.set(s, s * (0.7 + rng() * 0.5), s);
      m.compose(pv.set(x, gy + s * 0.5, z), q, sc);
      caps.push(m.clone());
      capPositions.push(pv.clone());
    }
  }
  const shrooms = new THREE.InstancedMesh(capGeo, capMat, caps.length);
  caps.forEach((mm, i) => shrooms.setMatrixAt(i, mm));
  shrooms.instanceMatrix.needsUpdate = true;
  shrooms.frustumCulled = false;
  scene.add(shrooms);

  const shroomLight = new THREE.PointLight(0xffcf3d, 4.5, 9, 2);
  shroomLight.position.set(TREE_POS.x + 4.4, groundHeightAt(TREE_POS.x + 4.4, TREE_POS.z + 3.4) + 0.5, TREE_POS.z + 3.4);
  scene.add(shroomLight);

  /* ---- a fallen log ---- */
  const logGeo = new THREE.CylinderGeometry(0.42, 0.5, 6.8, 9);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 });
  const log = new THREE.Mesh(logGeo, logMat);
  const logX = -4.2;
  const logZ = 7.5;
  log.position.set(logX, groundHeightAt(logX, logZ) + 0.35, logZ);
  log.rotation.set(0.12, 0.7, Math.PI / 2 - 0.1);
  scene.add(log);

  /* ---- path pebbles ---- */
  const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x4b453b, roughness: 0.9, flatShading: true });
  const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, 120);
  for (let i = 0; i < 120; i++) {
    const t = rng();
    const x = lerp(HOME_POS.x, TREE_POS.x, t) + (rng() - 0.5) * 4.2;
    const z = lerp(HOME_POS.z, TREE_POS.z, t) + (rng() - 0.5) * 4.2;
    const gy = groundHeightAt(x, z);
    const s = 0.03 + Math.pow(rng(), 2) * 0.12;
    e.set(rng() * TAU, rng() * TAU, rng() * TAU);
    q.setFromEuler(e);
    sc.set(s, s * 0.6, s);
    m.compose(pv.set(x, gy + s * 0.2, z), q, sc);
    pebbles.setMatrixAt(i, m);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.frustumCulled = false;
  scene.add(pebbles);

  /* ---- the worn trail ---- */
  const bendAt = (z: number): number => Math.sin((z - HOME_POS.z) * 0.085) * 1.9;
  const SEG = 150;
  const trailPos: number[] = [];
  const trailUv: number[] = [];
  const trailCol: number[] = [];
  const trailIdx: number[] = [];
  const tc = new THREE.Color();
  for (let i = 0; i <= SEG; i++) {
    const t = -0.1 + (i / SEG) * 1.16;
    const z = lerp(HOME_POS.z, TREE_POS.z, t);
    const cx = lerp(HOME_POS.x, TREE_POS.x, t) - bendAt(z);
    const dx = TREE_POS.x - HOME_POS.x + 4.6 * Math.cos((z - HOME_POS.z) * 0.085);
    const dz = TREE_POS.z - HOME_POS.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = dz / len;
    const pz = -dx / len;
    const half = 1.05 + Math.sin(t * 9.1) * 0.14 + Math.sin(t * 23.7 + 2) * 0.06;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      const x = cx + px * half * side;
      const zz = z + pz * half * side;
      const gy = groundHeightAt(x, zz);
      trailPos.push(x, gy + 0.06, zz);
      trailUv.push(s, t * 4.6);
      const shade = 0.82 + rng() * 0.3;
      tc.setRGB(shade, shade * 0.96, shade * 0.9);
      trailCol.push(tc.r, tc.g, tc.b);
    }
    if (i < SEG) {
      const a = i * 2;
      trailIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.Float32BufferAttribute(trailPos, 3));
  trailGeo.setAttribute("uv", new THREE.Float32BufferAttribute(trailUv, 2));
  trailGeo.setAttribute("color", new THREE.Float32BufferAttribute(trailCol, 3));
  trailGeo.setIndex(trailIdx);
  trailGeo.computeVertexNormals();
  const trailTex = makeTrailTextures(seed ^ 0x0a11);
  const trail = new THREE.Mesh(
    trailGeo,
    new THREE.MeshStandardMaterial({
      map: trailTex.map,
      normalMap: trailTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0,
      color: 0xe1b957,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  trail.renderOrder = 1;
  trail.frustumCulled = false;
  scene.add(trail);

  /* ---- stepping stones down the trail ---- */
  const stepGeo = new THREE.IcosahedronGeometry(1, 1);
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0x3a352d,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  });
  const STEPS = 24;
  const steps = new THREE.InstancedMesh(stepGeo, stepMat, STEPS);
  let stepCount = 0;
  for (let i = 0; i < STEPS; i++) {
    // irregular spacing: little clusters and gaps instead of an even ladder
    if (rng() < 0.22) continue;
    const t = 0.05 + ((i + rng() * 0.9) / STEPS) * 0.97;
    const z = lerp(HOME_POS.z, TREE_POS.z, t);
    const cx = lerp(HOME_POS.x, TREE_POS.x, t) - bendAt(z);
    const x = cx + (rng() - 0.5) * 1.7;
    const zz = z + (rng() - 0.5) * 1.3;
    const gy = groundHeightAt(x, zz);
    const s = 0.045 + Math.pow(rng(), 1.6) * 0.16;
    e.set((rng() - 0.5) * 0.35, rng() * TAU, (rng() - 0.5) * 0.35);
    q.setFromEuler(e);
    sc.set(s * (1 + rng() * 0.8), s * 0.24, s * (1 + rng() * 0.8));
    m.compose(pv.set(x, gy - s * 0.04, zz), q, sc);
    steps.setMatrixAt(stepCount, m);
    col.setHSL(0.09, 0.05, 0.035 + rng() * 0.035);
    steps.setColorAt(stepCount, col);
    stepCount++;
  }
  steps.count = stepCount;
  steps.instanceMatrix.needsUpdate = true;
  if (steps.instanceColor) steps.instanceColor.needsUpdate = true;
  steps.frustumCulled = false;
  scene.add(steps);

  /* ---- fallen leaves ---- */
  const leafGeo = new THREE.PlaneGeometry(1, 1);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({
    map: makeLeafTexture(seed ^ 0x6f2a),
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  const LEAVES = 1500;
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAVES);
  for (let i = 0; i < LEAVES; i++) {
    let x: number;
    let z: number;
    if (rng() < 0.5) {
      const t = rng();
      z = lerp(HOME_POS.z, TREE_POS.z, t) + (rng() - 0.5) * 7;
      x = lerp(HOME_POS.x, TREE_POS.x, t) + (rng() - 0.5) * 14;
    } else {
      const a = rng() * TAU;
      const r = Math.pow(rng(), 0.8) * 40;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    const gy = groundHeightAt(x, z);
    const s = 0.1 + Math.pow(rng(), 1.5) * 0.22;
    e.set(0, rng() * TAU, (rng() - 0.5) * 0.35);
    q.setFromEuler(e);
    sc.set(s * (0.8 + rng() * 0.7), 1, s);
    m.compose(pv.set(x, gy + 0.02 + rng() * 0.02, z), q, sc);
    leaves.setMatrixAt(i, m);
    col.setHSL(0.07 + rng() * 0.06, 0.25 + rng() * 0.28, 0.16 + rng() * 0.2);
    leaves.setColorAt(i, col);
  }
  leaves.instanceMatrix.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  leaves.frustumCulled = false;
  scene.add(leaves);

  /* ---- a few leaves drifting down from the crown, for quiet motion ---- */
  const FALLING = 34;
  const falling = new THREE.InstancedMesh(leafGeo, leafMat, FALLING);
  const fallers = Array.from({ length: FALLING }, () => {
    const a = rng() * TAU;
    const r = 3 + rng() * 11;
    return {
      x: TREE_POS.x + Math.cos(a) * r,
      y: 3 + rng() * 11,
      z: TREE_POS.z + Math.sin(a) * r,
      vy: 0.34 + rng() * 0.4,
      phase: rng() * TAU,
      spin: 0.4 + rng() * 0.8,
      size: 0.1 + rng() * 0.13,
    };
  });
  falling.frustumCulled = false;
  scene.add(falling);
  let lastFloraT = 0;

  return {
    update(time) {
      timeUniform.value = time;
      const dt = clamp(time - lastFloraT, 0, 0.05);
      lastFloraT = time;
      if (dt <= 0) return;
      for (let i = 0; i < FALLING; i++) {
        const f = fallers[i];
        f.y -= f.vy * dt;
        f.phase += dt;
        f.x += Math.sin(f.phase * 1.3) * 0.55 * dt;
        f.z += Math.cos(f.phase * 0.9) * 0.4 * dt;
        if (f.y <= groundHeightAt(f.x, f.z) + 0.08) {
          const a = rng() * TAU;
          const r = 3 + rng() * 11;
          f.x = TREE_POS.x + Math.cos(a) * r;
          f.z = TREE_POS.z + Math.sin(a) * r;
          f.y = 6 + rng() * 9;
          f.vy = 0.34 + rng() * 0.4;
        }
        e.set(f.phase * f.spin, f.phase * 1.7, f.phase * 0.6);
        q.setFromEuler(e);
        sc.set(f.size, f.size, f.size);
        m.compose(pv.set(f.x, f.y, f.z), q, sc);
        falling.setMatrixAt(i, m);
      }
      falling.instanceMatrix.needsUpdate = true;
    },
  };
}
