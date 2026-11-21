/** Drifting mist sprites. */
import * as THREE from "three";
import { TAU, clamp, mulberry32 } from "../math";
import { TREE_POS } from "./layout";
import { makeMistTexture } from "./textures";

export interface MistRig {
  update: (dt: number, time: number, playerPos: THREE.Vector3) => void;
}

export function buildMist(scene: THREE.Scene, seed: number): MistRig {
  const rng = mulberry32(seed ^ 0x6d15);
  const mistTex = makeMistTexture();
  const banks: THREE.Sprite[] = [];
  const sheets: THREE.Mesh[] = [];

  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.016 + rng() * 0.026,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: i % 3 === 0 ? 0x8fa9df : 0x345dcc,
      fog: false,
    });
    const sprite = new THREE.Sprite(mat);
    const a = rng() * TAU;
    const r = 12 + rng() * 66;
    sprite.position.set(Math.cos(a) * r, 0.9 + rng() * 4.4, Math.sin(a) * r);
    const s = 26 + rng() * 44;
    sprite.scale.set(s, s * (0.36 + rng() * 0.3), 1);
    scene.add(sprite);
    banks.push(sprite);
  }

  for (let i = 0; i < 12; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.02 + rng() * 0.018,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x779bda,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.rotation.x = -Math.PI / 2;
    const a = rng() * TAU;
    const r = 6 + rng() * 56;
    mesh.position.set(Math.cos(a) * r, 0.32 + rng() * 1.4, Math.sin(a) * r);
    const s = 38 + rng() * 56;
    mesh.scale.set(s, s, 1);
    scene.add(mesh);
    sheets.push(mesh);
  }

  // a low bank of mist right where the walk begins
  const near = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.026,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x6a7080,
      fog: false,
    })
  );
  near.rotation.x = -Math.PI / 2;
  near.position.set(1, 0.55, 18);
  scene.add(near);
  sheets.push(near);

  // low mist pooling around the great tree and along the path: this is what
  // makes the clearing feel damp and deep rather than a painted backdrop
  const pools: THREE.Mesh[] = [];
  [
    { x: TREE_POS.x, z: TREE_POS.z + 2.4, s: 30, y: 0.4, o: 0.028, c: 0x7a8088 },
    { x: TREE_POS.x - 4.5, z: TREE_POS.z + 7, s: 22, y: 0.34, o: 0.02, c: 0x6d7c93 },
    { x: 3.4, z: 12, s: 24, y: 0.38, o: 0.022, c: 0x6d7c93 },
    { x: -6.5, z: 0.5, s: 26, y: 0.44, o: 0.019, c: 0x6a7080 },
    { x: 16, z: 6, s: 34, y: 0.36, o: 0.019, c: 0x6a7080 },
    { x: 26, z: 14, s: 40, y: 0.5, o: 0.016, c: 0x707888 },
  ].forEach((p) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: mistTex,
        transparent: true,
        opacity: p.o,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: p.c,
        fog: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, p.y, p.z);
    m.scale.set(p.s, p.s, 1);
    m.renderOrder = 3;
    scene.add(m);
    pools.push(m);
  });

  // layered haze in the middle distance: a cool, thin veil that separates the
  // near grass from the treeline and gives the forest real depth
  const hazeMat = (opacity: number, color: number): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color,
      fog: false,
    });
  const hazes: THREE.Mesh[] = [];
  [
    { y: 1.2, z: -14, s: 120, o: 0.09 },
    { y: 2.4, z: -34, s: 180, o: 0.07 },
    { y: 3.8, z: -58, s: 240, o: 0.05 },
  ].forEach((h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h.s, h.s * 0.6), hazeMat(h.o, 0x6d7c93));
    m.position.set(0, h.y, h.z);
    m.renderOrder = 2;
    scene.add(m);
    hazes.push(m);
  });

  return {
    update(dt, time, playerPos) {
      for (let i = 0; i < banks.length; i++) {
        const b = banks[i];
        const mat = b.material as THREE.SpriteMaterial;
        mat.rotation += dt * 0.012 * (i % 2 ? 1 : -1);
        b.position.x += Math.sin(time * 0.05 + i * 2.1) * 0.006;
        b.position.z += Math.cos(time * 0.04 + i * 1.3) * 0.006;
        const d = Math.hypot(b.position.x - playerPos.x, b.position.z - playerPos.z);
        const t = clamp((d - 10) / 60, 0.15, 1);
        mat.opacity = (0.017 + (i % 5) * 0.005) * t;
      }
      for (let i = 0; i < sheets.length; i++) {
        const s = sheets[i];
        s.rotation.z += dt * 0.01 * (i % 2 ? 1 : -1);
      }
      for (let i = 0; i < pools.length; i++) {
        const p = pools[i];
        p.rotation.z += dt * 0.006 * (i % 2 ? 1 : -1);
        p.position.x += Math.sin(time * 0.033 + i * 1.7) * 0.004;
        p.position.z += Math.cos(time * 0.028 + i * 2.3) * 0.004;
      }
    },
  };
}
