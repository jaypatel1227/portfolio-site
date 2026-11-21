/** Distant landmarks, so there is more than one destination: standing stones, a hut, a titan. */
import * as THREE from "three";
import { TAU, lcg, mulberry32, makeNoise } from "../math";
import { HOME_POS } from "./layout";
import { makeDotTexture } from "./textures";
import { addContactShadows } from "./shared";
import type { Collision } from "../world";

/** a rough rune circle, faintly luminous, for the largest stone's face */
function makeGlyphTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(150, 235, 210, 0.9)";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(110, 220, 190, 0.9)";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 9;
  const rng = lcg(20261113);
  // one outer ring
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.38, 0, TAU);
  ctx.lineWidth = 6;
  ctx.stroke();
  // broken inner strokes: not quite writing, closer to memory
  ctx.lineWidth = 8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rng() * 0.5;
    const r0 = s * 0.13;
    const r1 = s * (0.2 + rng() * 0.09);
    ctx.beginPath();
    ctx.moveTo(s / 2 + Math.cos(a) * r0, s / 2 + Math.sin(a) * r0);
    ctx.lineTo(s / 2 + Math.cos(a + (rng() - 0.5) * 0.4) * r1, s / 2 + Math.sin(a + (rng() - 0.5) * 0.4) * r1);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLandmarks(
  scene: THREE.Scene,
  seed: number,
  groundHeightAt: (x: number, z: number) => number,
  collisions: Collision[]
): void {
  const rng = mulberry32(seed ^ 0x1a4d);

  /* ---- the standing stones, back-left against the treeline ---- */
  const stoneGeo = new THREE.CylinderGeometry(0.55, 0.85, 1, 7, 3);
  {
    // weather the slab: nudge vertices off the perfect cylinder
    const pos = stoneGeo.attributes.position;
    const jitter = makeNoise(seed ^ 0x51ab);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = jitter(x * 2.1 + y * 1.3, z * 2.1 - y * 0.7);
      const k = 1 + n * 0.24;
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
      pos.setY(i, y + jitter(x * 3.1, z * 3.7) * 0.08);
    }
    stoneGeo.computeVertexNormals();
    stoneGeo.translate(0, 0.5, 0);
  }
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a5160,
    roughness: 0.95,
    metalness: 0,
    // cold sky-light keeps the faces legible against the ridge
    emissive: 0x131922,
    emissiveIntensity: 1.5,
    flatShading: true,
  });
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 7);
  const sm = new THREE.Matrix4();
  const sq = new THREE.Quaternion();
  const se = new THREE.Euler();
  const ssv = new THREE.Vector3();
  const spv = new THREE.Vector3();
  const stoneCenter = new THREE.Vector3(-30, 0, -33);
  const glyphIndex = 2;
  let glyphPos = new THREE.Vector3();
  for (let i = 0; i < 7; i++) {
    // leave the arc open toward the glade so the ring reads as an invitation
    const a = (i / 7) * TAU + 0.45 + (rng() - 0.5) * 0.22;
    const r = 5.4 + rng() * 1.8;
    const x = stoneCenter.x + Math.cos(a) * r;
    const z = stoneCenter.z + Math.sin(a) * r;
    const gy = groundHeightAt(x, z);
    const hgt = 2.1 + rng() * 1.5;
    const wid = 0.75 + rng() * 0.5;
    se.set((rng() - 0.5) * 0.16, rng() * TAU, (rng() - 0.5) * 0.16);
    sq.setFromEuler(se);
    ssv.set(wid, hgt, wid * (0.62 + rng() * 0.3));
    sm.compose(spv.set(x, gy - 0.12, z), sq, ssv);
    stones.setMatrixAt(i, sm);
    collisions.push({ x, z, r: 0.9 });
    if (i === glyphIndex) glyphPos = new THREE.Vector3(x, gy + hgt * 0.58, z);
  }
  stones.instanceMatrix.needsUpdate = true;
  stones.frustumCulled = false;
  scene.add(stones);
  // one slab has fallen outward against the ring: the circle was finished once
  const fallen = new THREE.Mesh(stoneGeo, stoneMat);
  const fallenGround = groundHeightAt(stoneCenter.x - 4.9, stoneCenter.z + 1.6);
  fallen.position.set(stoneCenter.x - 4.9, fallenGround + 0.5, stoneCenter.z + 1.6);
  fallen.scale.set(0.82, 1.9, 0.55);
  fallen.rotation.set(1.05, 0.5, 0.42);
  scene.add(fallen);
  // chipped rubble at the glyph stone's foot
  const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), stoneMat);
  const rubbleGround = groundHeightAt(stoneCenter.x + 2.1, stoneCenter.z + 2.4);
  rubble.position.set(stoneCenter.x + 2.1, rubbleGround + 0.2, stoneCenter.z + 2.4);
  rubble.scale.set(1, 0.6, 0.85);
  rubble.rotation.set(rng() * TAU, rng() * TAU, 0);
  scene.add(rubble);

  // the glyph: a faint cold ring of writing on the central face, turned home
  const toHome = new THREE.Vector3().subVectors(HOME_POS, glyphPos).normalize();
  const glyph = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.05),
    new THREE.MeshBasicMaterial({
      map: makeGlyphTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      color: 0xbcf5df,
    })
  );
  glyph.position.copy(glyphPos).addScaledVector(toHome, 0.78);
  glyph.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toHome);
  scene.add(glyph);
  const glyphLight = new THREE.PointLight(0x86e2c0, 2.6, 6.5, 2);
  glyphLight.position.copy(glyphPos).addScaledVector(toHome, 1.1);
  scene.add(glyphLight);
  const glyphGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeDotTexture(),
      color: 0x7ce6bd,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  glyphGlow.scale.setScalar(2.6);
  glyphGlow.position.copy(glyphPos).addScaledVector(toHome, 0.9);
  glyphGlow.renderOrder = 6;
  scene.add(glyphGlow);

  /* ---- a rondavel hut, far right: one warm window on, nobody home ---- */
  const hut = new THREE.Group();
  const hutX = 33.5;
  const hutZ = -19;
  const hutGround = groundHeightAt(hutX, hutZ);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2f2822,
    roughness: 0.97,
    metalness: 0,
    emissive: 0x1d140c,
    emissiveIntensity: 0.9,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.98, 2.2, 12), wallMat);
  wall.position.y = 1.1;
  hut.add(wall);
  const thatchMat = new THREE.MeshStandardMaterial({
    color: 0x241d15,
    roughness: 1,
    metalness: 0,
    emissive: 0x17110a,
    emissiveIntensity: 0.8,
  });
  const thatch = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 12), thatchMat);
  thatch.position.y = 2.95;
  hut.add(thatch);
  // the hut faces the path: window is the only warm note in the forest
  const hutToHome = new THREE.Vector3().subVectors(HOME_POS, new THREE.Vector3(hutX, hutGround, hutZ)).normalize();
  const hutDoorDir = hutToHome.clone().setY(0).normalize();
  const hutSide = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), hutDoorDir).normalize();
  // worked-stone foundation ring, half-buried: the hut is seated, not poured
  const found = new THREE.Mesh(
    new THREE.CylinderGeometry(2.12, 2.34, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x36342e, roughness: 1, metalness: 0, flatShading: true, emissive: 0x0a0908, emissiveIntensity: 1 })
  );
  found.position.y = 0.14;
  hut.add(found);
  // a door opening onto the path: dark, low, flanked by rough posts and a lintel
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 1.32),
    new THREE.MeshStandardMaterial({ color: 0x060504, roughness: 1, metalness: 0 })
  );
  door.position.set(hutDoorDir.x * 1.93, 0.84, hutDoorDir.z * 1.93);
  door.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hutDoorDir);
  hut.add(door);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 1, metalness: 0 });
  for (const sgn of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.102, 1.46, 6), postMat);
    post.position.copy(door.position).addScaledVector(hutSide, sgn * 0.56);
    post.position.y = 0.82;
    hut.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.16), postMat);
  lintel.position.set(hutDoorDir.x * 1.98, 1.56, hutDoorDir.z * 1.98);
  lintel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hutDoorDir);
  hut.add(lintel);
  // a thatch overhang where wall meets roof: layered, ragged, old
  const eave = new THREE.Mesh(
    new THREE.CylinderGeometry(2.44, 2.16, 0.36, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2b221a, roughness: 1, metalness: 0, emissive: 0x120d09, emissiveIntensity: 1, side: THREE.DoubleSide })
  );
  eave.position.y = 2.32;
  hut.add(eave);
  // a little woodpile leaning beside the door
  const logGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.72, 6);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x271d13, roughness: 1, metalness: 0, emissive: 0x0d0906, emissiveIntensity: 1 });
  const logQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hutDoorDir);
  const logBase = door.position.clone().addScaledVector(hutSide, 1.42);
  [[-0.11, 0], [0.11, 0], [0, 0.155]].forEach(([ox, oy]) => {
    const log = new THREE.Mesh(logGeo, logMat);
    log.position.copy(logBase).addScaledVector(hutSide, ox);
    log.position.y = 0.1 + oy;
    log.quaternion.copy(logQ);
    hut.add(log);
  });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc276, fog: false });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), winMat);
  // on the wall surface, facing the glade
  const winWorld = new THREE.Vector3(hutX + hutToHome.x * 1.66, hutGround + 1.18, hutZ + hutToHome.z * 1.66);
  win.position.set(winWorld.x - hutX, 1.18, winWorld.z - hutZ);
  win.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hutToHome.clone().setY(0).normalize());
  hut.add(win);
  hut.position.set(hutX, hutGround, hutZ);
  scene.add(hut);
  const windowLight = new THREE.PointLight(0xffb45e, 5.2, 7.5, 2);
  windowLight.position.set(winWorld.x, hutGround + 1.2, winWorld.z).addScaledVector(hutToHome, 0.4);
  scene.add(windowLight);
  // the halo: one ember-bright point that carries the "someone is there"
  const winGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeDotTexture(),
      color: 0xffbe6e,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  winGlow.scale.setScalar(2.6);
  winGlow.position.copy(windowLight.position);
  winGlow.renderOrder = 6;
  scene.add(winGlow);
  collisions.push({ x: hutX, z: hutZ, r: 2.1 });

  /* ---- the titan: a long-dead giant past the great tree ---- */
  const titan = new THREE.Group();
  const titanX = -15;
  const titanZ = -55;
  const titanGround = groundHeightAt(titanX, titanZ);
  const titanMat = new THREE.MeshStandardMaterial({
    color: 0x141821,
    roughness: 0.95,
    metalness: 0,
    emissive: 0x05070c,
    emissiveIntensity: 1.4,
    side: THREE.DoubleSide,
  });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 3.1, 33, 9, 4, true), titanMat);
  {
    // lean and bend the bole a little so it reads as grown, not planted
    const pos = trunk.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + 16.5) / 33;
      pos.setX(i, pos.getX(i) + Math.pow(t, 2) * 2.6);
    }
    // jag the rim into a snapped spire: the giant fell by storm, not by design
    const jagRng = mulberry32(seed ^ 0x77c9);
    const jagLobes = 6;
    const jagPhase = jagRng() * TAU;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 16.3) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const jag = Math.pow(0.5 + 0.5 * Math.sin(a * jagLobes + jagPhase), 1.5) * 4.0 + jagRng() * 0.5;
        pos.setY(i, y - jag);
      }
    }
    trunk.geometry.computeVertexNormals();
  }
  trunk.position.y = 16.0;
  titan.add(trunk);
  // broken branch stubs, angled outward, bare
  for (let i = 0; i < 6; i++) {
    const hFrac = 0.3 + rng() * 0.48;
    const a = rng() * TAU;
    const leanX = Math.pow(hFrac, 2) * 2.6;
    const radius = 3.1 - (3.1 - 1.0) * hFrac;
    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 + rng() * 0.08, 0.34 + rng() * 0.22, 1.5 + rng() * 2.3, 6),
      titanMat
    );
    const dir = new THREE.Vector3(Math.cos(a), 0.72 + rng() * 0.55, Math.sin(a)).normalize();
    stub.position.set(Math.cos(a) * radius * 0.9 + leanX, hFrac * 31.5 + 0.4, Math.sin(a) * radius * 0.9);
    stub.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    titan.add(stub);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + rng() * 0.55;
    const len = 3.0 + rng() * 2.4;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 + rng() * 0.05, 1.05 + rng() * 0.55, len, 6, 1, true),
      titanMat
    );
    const tilt = 0.6 + rng() * 0.4;
    root.position.set(Math.cos(a) * (2.15 + len * 0.3), 0.72, Math.sin(a) * (2.15 + len * 0.3));
    root.rotation.z = Math.cos(a) * tilt;
    root.rotation.x = -Math.sin(a) * tilt;
    titan.add(root);
  }
  titan.rotation.z = 0.045;
  titan.position.set(titanX, titanGround, titanZ);
  scene.add(titan);
  collisions.push({ x: titanX, z: titanZ, r: 3.0 });

  // seat all three destinations into the ground they stand on
  addContactShadows(
    scene,
    [
      { x: stoneCenter.x, z: stoneCenter.z, s: 7.6, sy: 0.75 },
      { x: hutX, z: hutZ, s: 5.6, sy: 0.85 },
      { x: titanX, z: titanZ, s: 7.6, sy: 0.7 },
    ],
    groundHeightAt,
    0.36
  );
}
