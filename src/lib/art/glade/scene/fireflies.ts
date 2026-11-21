/** Rising embers, golden tree motes and windblown ash. */
import * as THREE from "three";
import { TAU, mulberry32 } from "../math";
import { TREE_POS } from "./layout";

export interface FireflyField {
  update: (dt: number, time: number, playerPos: THREE.Vector3) => void;
}

const FIREFLY_VERT = /* glsl */ `
attribute float aSize;
attribute float aTwinkle;
attribute vec3 aTint;
varying float vAlpha;
varying vec3 vTint;
uniform float u_time;
void main() {
  vTint = aTint;
  vAlpha = 0.22 + 0.78 * pow(0.5 + 0.5 * sin(u_time * 1.1 + aTwinkle * 6.2831), 3.4);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * (240.0 / max(0.2, -mv.z)), 9.0);
  gl_Position = projectionMatrix * mv;
}
`;

const FIREFLY_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.08, d);
  a *= a * a;
  gl_FragColor = vec4(vTint, a * vAlpha);
}
`;

export function buildFireflies(scene: THREE.Scene, seed: number): FireflyField {
  const COUNT = 150;
  const rng = mulberry32(seed ^ 0x3f17);
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  const tints = new Float32Array(COUNT * 3);
  const homes = new Float32Array(COUNT * 2);

  for (let i = 0; i < COUNT; i++) {
    const a = rng() * TAU;
    const r = 4 + Math.pow(rng(), 0.7) * 62;
    const x = i < 60 ? TREE_POS.x + Math.cos(a) * rng() * 9 : Math.cos(a) * r;
    const z = i < 60 ? TREE_POS.z + Math.sin(a) * rng() * 9 : Math.sin(a) * r;
    homes[i * 2] = x;
    homes[i * 2 + 1] = z;
    positions[i * 3] = x;
    positions[i * 3 + 1] = 0.5 + rng() * 18;
    positions[i * 3 + 2] = z;
    seeds[i] = rng() * TAU;
    sizes[i] = 0.16 + Math.pow(rng(), 2.4) * 0.6;
    const warm = rng();
    if (warm < 0.68) {
      tints[i * 3] = 3.0;
      tints[i * 3 + 1] = 0.85 + rng() * 0.6;
      tints[i * 3 + 2] = 0.08 + rng() * 0.12;
    } else {
      tints[i * 3] = 2.5;
      tints[i * 3 + 1] = 0.35 + rng() * 0.3;
      tints[i * 3 + 2] = 0.025;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aTwinkle", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: FIREFLY_VERT,
    fragmentShader: FIREFLY_FRAG,
    uniforms: { u_time: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const ashPositions = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    ashPositions[i * 3] = (rng() - 0.5) * 120;
    ashPositions[i * 3 + 1] = rng() * 28;
    ashPositions[i * 3 + 2] = (rng() - 0.5) * 120;
  }
  const ashGeo = new THREE.BufferGeometry();
  ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPositions, 3));
  const ash = new THREE.Points(ashGeo, new THREE.PointsMaterial({
    color: 0xa79c8d,
    size: 0.055,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }));
  ash.frustumCulled = false;
  scene.add(ash);

  return {
    update(dt, time, playerPos) {
      (mat.uniforms.u_time as THREE.IUniform).value = time;
      for (let i = 0; i < COUNT; i++) {
        const s = seeds[i];
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];
        let z = positions[i * 3 + 2];
        x = homes[i * 2] + Math.sin(time * 0.31 + s * 2.3) * 0.8;
        z = homes[i * 2 + 1] + Math.cos(time * 0.27 + s * 1.7) * 0.8;
        y = 0.35 + ((time * (0.22 + s * 0.025) + s * 3.1) % 19);
        if (Math.hypot(x - playerPos.x, z - playerPos.z) > 92) {
          const a = Math.random() * TAU;
          const r = 6 + Math.random() * 54;
          x = playerPos.x + Math.cos(a) * r;
          z = playerPos.z + Math.sin(a) * r;
          homes[i * 2] = x;
          homes[i * 2 + 1] = z;
          y = 0.5 + Math.random() * 5;
        }
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
      for (let i = 0; i < 240; i++) {
        ashPositions[i * 3] += dt * 0.17;
        ashPositions[i * 3 + 1] -= dt * (0.18 + (i % 5) * 0.035);
        if (ashPositions[i * 3 + 1] < 0) ashPositions[i * 3 + 1] = 28;
        if (ashPositions[i * 3] > 60) ashPositions[i * 3] = -60;
      }
      ashGeo.attributes.position.needsUpdate = true;
    },
  };
}
