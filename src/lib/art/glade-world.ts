/**
 * The glade itself: sky, moon, rolling ground, conifer field and one
 * enormous old tree holding the clearing.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  TREE_POS,
  HOME_POS,
  TAU,
  TREE_FIELD_RADIUS,
  clamp,
  lerp,
  makeNoise,
  mulberry32,
  pathDistance,
  pointToSegmentDist2,
  type Collision,
} from "./glade-util";
import {
  makeCanopyTexture,
  makeGroundTextures,
  makeMistTexture,
  makeMoonTexture,
  makeMossTexture,
  makePineTexture,
  makeDeadTreeTexture,
  makeDotTexture,
  makeShadowTexture,
  makeSprigTexture,
} from "./glade-textures";

/* ------------------------------------------------------------------ */
/* sky                                                                 */
/* ------------------------------------------------------------------ */

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float u_time;
uniform float u_stars;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise2(p);
    p = p * 2.03 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return v;
}

vec3 starLayer(vec2 uv, float density, float cutoff, float scale, float twinkle) {
  vec2 g = uv * density;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float rnd = hash21(id);
  if (rnd < cutoff) return vec3(0.0);
  vec2 off = (vec2(hash21(id + 1.7), hash21(id + 9.3)) - 0.5) * 0.74;
  // the uv grid covers 2*pi of azimuth but only pi of elevation, so correct
  // x to keep stars round instead of wide ovals
  float d = length(vec2((f.x - off.x) * 2.0, f.y - off.y));
  // pinpricks: keep the biggest stars a few pixels across, never blobs
  float sz = (0.007 + pow(hash21(id + 3.1), 4.0) * 0.018) * scale;
  float tw = 1.0 - twinkle + twinkle * (0.55 + 0.45 * sin(u_time * (0.6 + rnd * 2.4) + rnd * 62.0));
  float s = smoothstep(sz, sz * 0.1, d) * tw;
  float warm = hash21(id + 6.7);
  vec3 tint = mix(vec3(0.66, 0.8, 1.0), vec3(1.0, 0.84, 0.64), warm);
  tint = mix(tint, vec3(1.0), 0.28);
  return tint * s * (0.5 + pow(hash21(id + 4.2), 2.0));
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  vec2 az = normalize(dir.xz + vec2(0.0001));

  // deep blue-charcoal gradient, darker than before so the details carry it
  vec3 zenith = vec3(0.0015, 0.003, 0.009);
  vec3 upper = vec3(0.006, 0.010, 0.024);
  vec3 horizon = vec3(0.028, 0.036, 0.049);
  vec3 col = mix(horizon, upper, smoothstep(-0.02, 0.28, h));
  col = mix(col, zenith, smoothstep(0.2, 0.9, h));

  // moon azimuth: moon sits high to the west-northwest
  vec2 moonAz = normalize(vec2(-0.4, -0.92));
  vec2 awayAz = -moonAz;

  // zodiacal light: a faint wedge of scattered moonlight rising along the
  // ecliptic on the moon side, brightest low and fading with altitude
  float zo = pow(max(dot(az, moonAz), 0.0), 3.0) * exp(-max(h, 0.0) * 3.6);
  col += vec3(0.05, 0.048, 0.042) * zo;

  // thin cirrus, combed out toward the moon: horizontal striations, not
  // clouds, and never bright enough to soften the stars
  float cirH = exp(-pow((h - 0.34) * 4.6, 2.0));
  float cir = fbm2(vec2(dir.x * 1.9 + dir.z * 1.1 + u_time * 0.004, h * 14.0));
  cir = smoothstep(0.52, 0.86, cir) * cirH;
  float cirMoon = 0.5 + 0.5 * dot(az, moonAz);
  col += mix(vec3(0.028, 0.03, 0.04), vec3(0.075, 0.07, 0.055), cirMoon) * cir * 0.75;

  // a low aurora curtain on the far side, barely there: two drifting
  // filaments, teal with a whisper of violet, folded by fbm
  float asect = pow(max(dot(az, awayAz), 0.0), 2.6);
  float awin = smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.3, 0.62, h));
  float aband = fbm2(vec2(dir.x * 3.1 + u_time * 0.011, dir.z * 3.1 - u_time * 0.007));
  aband = pow(smoothstep(0.42, 0.9, aband), 2.2);
  float afilament = sin(dir.x * 5.0 + aband * 9.0 + u_time * 0.05);
  afilament = pow(0.5 + 0.5 * afilament, 3.0);
  float aur = aband * afilament * asect * awin;
  col += vec3(0.035, 0.085, 0.055) * aur * 0.8;
  col += vec3(0.05, 0.035, 0.085) * aur * aur * 0.9;

  // a faint warm breath over the great tree's side of the horizon
  float warm = pow(max(dot(az, normalize(vec2(0.36, -0.93))), 0.0), 5.0) * exp(-max(h, 0.0) * 5.4);
  col += vec3(0.13, 0.06, 0.02) * warm * 0.32;

  // stars
  vec2 suv = vec2(atan(dir.z, dir.x) / 6.2831853 + 0.5, asin(clamp(h, -1.0, 1.0)) / 3.1415926 + 0.5);
  vec3 stars = vec3(0.0);
  stars += starLayer(suv, 168.0, 0.8, 1.0, 0.7);
  stars += starLayer(suv, 74.0, 0.88, 1.9, 0.55) * 1.5;
  stars += starLayer(suv, 31.0, 0.94, 2.9, 0.35) * 2.6;

  // one tight cluster, pleiades-like, high on the moon side: a knot of
  // blue-white pinpricks in a breath of reflection nebulosity
  vec3 cc = normalize(vec3(-0.52, 0.44, -0.73));
  float cd = clamp(dot(dir, cc), 0.0, 1.0);
  float cluster = smoothstep(0.9965, 0.9995, cd);
  if (cluster > 0.001) {
    vec3 upv = abs(cc.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 t1 = normalize(cross(upv, cc));
    vec3 t2 = cross(cc, t1);
    vec2 cuv = vec2(dot(dir, t1), dot(dir, t2));
    // a fine dense scatter of faint members
    stars += starLayer(cuv * 90.0 + 3.7, 1.0, 0.35, 0.5, 0.4) * 1.1 * cluster;
    // nine bright named members on fixed offsets
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      vec2 off = vec2(hash21(vec2(fi, 1.3)) - 0.5, hash21(vec2(fi, 7.9)) - 0.5) * 0.052;
      float mag = 0.6 + pow(hash21(vec2(fi, 4.1)), 2.0) * 1.7;
      float d = length(cuv - off);
      float dwin = smoothstep(0.012, 0.0025, d);
      stars += vec3(0.82, 0.88, 1.0) * dwin * mag * cluster;
    }
    // the sheen of the cluster's dust, brightest behind the members
    col += vec3(0.022, 0.03, 0.045) * (exp(-pow(length(cuv) * 34.0, 2.0))) * cluster;
  }

  stars *= smoothstep(-0.06, 0.1, h);
  col += stars * u_stars * 0.85;

  // thin haze where the fog meets the treeline
  col = mix(vec3(0.026, 0.032, 0.045), col, smoothstep(-0.09, 0.1, h));

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface SkyRig {
  update: (camera: THREE.Camera, time: number) => void;
}

export function buildSky(scene: THREE.Scene, seed: number): SkyRig {
  const geo = new THREE.SphereGeometry(420, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { u_time: { value: 0 }, u_stars: { value: 1 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const dot = makeDotTexture();
  const moonTex = makeMoonTexture(seed ^ 0x30e);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 64),
    new THREE.MeshBasicMaterial({ map: moonTex, fog: false, color: 0xf6ecd8 })
  );
  moon.position.set(-92, 92, -212);
  moon.lookAt(0, 1.7, 0);
  scene.add(moon);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xb8c6e2,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  halo.position.copy(moon.position);
  halo.scale.setScalar(86);
  halo.renderOrder = -9;
  scene.add(halo);

  const innerHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xfff2d8,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  innerHalo.position.copy(moon.position);
  innerHalo.scale.setScalar(34);
  innerHalo.renderOrder = -8;
  scene.add(innerHalo);

  return {
    update(camera, time) {
      sky.position.copy(camera.position);
      (mat.uniforms.u_time as THREE.IUniform).value = time;
    },
  };
}

/* ------------------------------------------------------------------ */
/* ground                                                              */
/* ------------------------------------------------------------------ */

export function buildGround(
  scene: THREE.Scene,
  seed: number,
  groundHeightAt: (x: number, z: number) => number
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(360, 360, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const noise = makeNoise(seed ^ 0x44ee);
  const c = new THREE.Color();
  const moss = new THREE.Color(0x2c3f20);
  const dirt = new THREE.Color(0x4a3a27);
  const stone = new THREE.Color(0x2a2b27);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);
    const path = pathDistance(x, z);
    const pathMix = 1 - Math.min(1, path / 3.8);
    const patch = noise(x * 0.12, z * 0.12) * 0.5 + 0.5;
    const broad = noise(x * 0.031 + 5.2, z * 0.031 + 2.7) * 0.5 + 0.5;
    const stony = clamp((noise(x * 0.055 + 31, z * 0.055 + 12) - 0.42) * 3.4, 0, 1);
    c.copy(moss).lerp(dirt, pathMix * 0.9 + patch * 0.22);
    c.lerp(new THREE.Color(0x5a4830), (1 - Math.min(1, path / 1.7)) * 0.6);
    c.lerp(stone, stony * 0.5 + clamp((y - 1.2) / 6, 0, 1) * 0.35);
    const shade = (0.7 + patch * 0.5) * (0.82 + broad * 0.4);
    colors[i * 3] = c.r * shade;
    colors[i * 3 + 1] = c.g * shade;
    colors[i * 3 + 2] = c.b * shade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const { map, normalMap } = makeGroundTextures(seed);
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    color: 0xffffff,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.name = "ground";
  scene.add(ground);
  return ground;
}

/* ------------------------------------------------------------------ */
/* conifers                                                            */
/* ------------------------------------------------------------------ */

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

function crossCardGeometry(planes = 4): THREE.BufferGeometry {
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

export interface TreeField {
  update: (time: number) => void;
}

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
): TreeField {
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
      color: 0xffffff,
      // a whisper of cool sky-light keeps the nearest silhouettes from
      // crushing to pure black and losing their bough detail
      emissive: 0x0c161d,
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
        0.26 + rng() * 0.055,
        (0.15 + rng() * 0.15) * (1 - far * 0.55),
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

  return {
    update(_time) {},
  };
}

/* ------------------------------------------------------------------ */
/* distant ridge                                                       */
/* ------------------------------------------------------------------ */

/**
 * Two rings of far hills that fill the gaps between trunks with hazy
 * silhouettes, so the treeline reads as depth instead of a black wall.
 */
export function buildRidge(scene: THREE.Scene, seed: number): void {
  const layers = [
    { radius: 150, height: 24, base: 0x0a0e15, top: 0x131a25, haze: 0.9 },
    { radius: 96, height: 13, base: 0x0b0f16, top: 0x111823, haze: 0.55 },
  ];
  const noise = makeNoise(seed ^ 0x51dd);
  const noise2 = makeNoise(seed ^ 0x77c1);

  layers.forEach((layer, li) => {
    const segs = 220;
    const positions: number[] = [];
    const colors: number[] = [];
    const baseCol = new THREE.Color(layer.base);
    const topCol = new THREE.Color(layer.top);
    const c = new THREE.Color();
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * TAU;
      const a1 = ((i + 1) / segs) * TAU;
      const h0 =
        layer.height *
        (0.34 +
          0.4 * noise(Math.cos(a0) * 1.8 + li * 4, Math.sin(a0) * 1.8) +
          0.24 * noise2(Math.cos(a0) * 5.1 + 9, Math.sin(a0) * 5.1));
      const h1 =
        layer.height *
        (0.34 +
          0.4 * noise(Math.cos(a1) * 1.8 + li * 4, Math.sin(a1) * 1.8) +
          0.24 * noise2(Math.cos(a1) * 5.1 + 9, Math.sin(a1) * 5.1));
      const r0x = Math.cos(a0) * layer.radius;
      const r0z = Math.sin(a0) * layer.radius;
      const r1x = Math.cos(a1) * layer.radius;
      const r1z = Math.sin(a1) * layer.radius;
      // a quad: base at y=-4, ridge line at y=h
      positions.push(r0x, -6, r0z, r1x, -6, r1z, r1x, h1, r1z);
      positions.push(r0x, -6, r0z, r1x, h1, r1z, r0x, h0, r0z);
      c.copy(baseCol);
      const b = [c.r, c.g, c.b];
      const t = topCol.clone().lerp(baseCol, (1 - layer.haze) * 0.35);
      colors.push(...b, ...b, t.r, t.g, t.b);
      colors.push(...b, t.r, t.g, t.b, ...b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: THREE.DoubleSide,
        depthWrite: true,
      })
    );
    mesh.renderOrder = -6;
    mesh.frustumCulled = false;
    scene.add(mesh);
  });
}

/* ------------------------------------------------------------------ */
/* the note: about me, pinned to the great tree                        */
/* ------------------------------------------------------------------ */

/** hand-written note on odds and ends of paper, pinned to the bark */
function makeNoteTexture(redraw: (canvas: HTMLCanvasElement) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  redraw(canvas);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // the jay display font may not be decoded yet on first paint
  if (typeof document !== "undefined" && document.fonts) {
    document.fonts.ready.then(() => {
      redraw(canvas);
      t.needsUpdate = true;
    });
  }
  return t;
}

function paintNote(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // paper: warm rag with a darker burnt edge and a soft fold
  const rr = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
  };
  const rng = rr(918273);
  const px = 14, py = 10, pw = W - 28, ph = H - 20;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 7);
  ctx.fillStyle = "#cfc3a4";
  ctx.fill();
  // rag fibers
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${120 + rng() * 80}, ${110 + rng() * 70}, ${85 + rng() * 50}, ${0.05 + rng() * 0.1})`;
    ctx.fillRect(px + rng() * pw, py + rng() * ph, 1 + rng() * 9, 0.6 + rng() * 1.6);
  }
  // edge burn
  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  edge.addColorStop(0, "rgba(64, 48, 28, 0)");
  edge.addColorStop(0.82, "rgba(64, 48, 28, 0.16)");
  edge.addColorStop(1, "rgba(46, 33, 18, 0.5)");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 7);
  ctx.clip();
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  // a faint diagonal fold crease
  ctx.strokeStyle = "rgba(74, 58, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.28, py);
  ctx.lineTo(px + pw * 0.74, py + ph);
  ctx.stroke();
  ctx.restore();

  // text: basic ascii only (the jay display face covers nothing else)
  const ink = "#3a2c1c";
  ctx.fillStyle = ink;
  ctx.textBaseline = "top";
  const font = (size: number): string => `${size}px Jay, cursive`;
  ctx.font = font(34);
  ctx.fillText("field notes", 44, 44);
  // underline flourish
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(46, 92);
  ctx.quadraticCurveTo(140, 100, 226, 90);
  ctx.stroke();

  ctx.font = font(27);
  const lines = [
    "i'm jay. i lead a software",
    "team at epic in madison, wi.",
    "i spend way too much time",
    "tinkering with ai, and i'm",
    "always happy to chat.",
  ];
  let y = 122;
  for (const line of lines) {
    ctx.fillText(line, 44, y);
    y += 41;
  }

  ctx.font = font(22);
  ctx.fillStyle = "rgba(58, 44, 28, 0.85)";
  ctx.fillText("jaypatel122700@gmail.com", 44, y + 14);
  ctx.fillText("github.com/jaypatel1227", 44, y + 46);

  ctx.font = font(30);
  ctx.fillStyle = ink;
  ctx.fillText("- jay", W - 96, H - 92);

  // a rusty pin at the top with a soft cast shadow
  const pinX = W / 2, pinY = 26;
  const pinShadow = ctx.createRadialGradient(pinX + 3, pinY + 3, 1, pinX + 3, pinY + 3, 12);
  pinShadow.addColorStop(0, "rgba(0,0,0,0.5)");
  pinShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pinShadow;
  ctx.fillRect(pinX - 14, pinY - 10, 34, 34);
  const pin = ctx.createRadialGradient(pinX - 2, pinY - 2, 0.5, pinX, pinY, 8);
  pin.addColorStop(0, "#d8d4c8");
  pin.addColorStop(0.55, "#8e8a7e");
  pin.addColorStop(1, "#4c4941");
  ctx.fillStyle = pin;
  ctx.beginPath();
  ctx.arc(pinX, pinY, 7.2, 0, TAU);
  ctx.fill();
}

export function buildNote(
  scene: THREE.Scene,
  groundHeightAt: (x: number, z: number) => number
): void {
  const toHome = new THREE.Vector3().subVectors(HOME_POS, TREE_POS).normalize();
  const treeGround = groundHeightAt(TREE_POS.x, TREE_POS.z);
  const texture = makeNoteTexture(paintNote);
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.98),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      fog: true,
      side: THREE.DoubleSide,
      color: 0xbcb198,
    })
  );
  // on the trunk at reading height, facing the glade's path
  const trunkR = 2.28;
  const pos = new THREE.Vector3()
    .copy(TREE_POS)
    .addScaledVector(toHome, trunkR);
  note.position.set(pos.x, treeGround + 1.62, pos.z);
  note.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toHome);
  // a slight sag and lean off the bark, pinned at the top
  note.rotateX(-0.075);
  note.rotateZ(0.028);
  scene.add(note);
}

/* ------------------------------------------------------------------ */
/* the great tree                                                        */
/* ------------------------------------------------------------------ */

const BARK_VERT = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vView = -mvPosition.xyz;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vObj = position;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const BARK_FRAG = /* glsl */ `
#include <fog_pars_fragment>
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vNormal;
varying vec3 vView;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.04 + vec3(11.3, 7.7, 5.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  // bark coordinates: cylindrical around the trunk so the furrows wrap around
  // it instead of slicing across it in diagonal bands
  vec3 o = vObj;
  float ang = atan(o.z, o.x);
  vec2 cs = vec2(cos(ang), sin(ang));

  // fine grain running down the limb
  float grain = fbm(vec3(cs * 9.0, o.y * 1.15) + 3.7);
  float grain2 = fbm(vec3(cs * 22.0, o.y * 2.75) + 11.1);
  // fine vertical fibre: the strands that catch sidelight on real bark
  float fibre = fbm(vec3(cs * 31.0, o.y * 0.6) + 5.4);
  fibre = pow(clamp(fibre, 0.0, 1.0), 1.6);

  // deep vertical flutes: ridged noise wrapped around the trunk
  float flute =
    1.0 - abs(2.0 * fbm(vec3(cs * 2.35, o.y * 0.46) + 2.0) - 1.0);
  flute = pow(clamp(flute, 0.0, 1.0), 1.8);
  float crevice = smoothstep(0.62, 0.2, flute);

  // cross-cracks break the flutes into bark plates
  float cross =
    1.0 - abs(2.0 * fbm(vec3(cs * 3.6, o.y * 2.2) + 13.0) - 1.0);
  cross = pow(clamp(cross, 0.0, 1.0), 2.8);
  float crack = smoothstep(0.58, 0.12, cross);

  // organic patches for lichen and moss, in world space so they ignore the
  // trunk's cylindrical mapping
  vec3 q = vec3(vWorld.x * 1.6, vWorld.y * 0.26, vWorld.z * 1.6);
  float fine = fbm(vec3(vWorld.x * 6.0, vWorld.y * 0.9, vWorld.z * 6.0) + 9.0);

  vec3 c1 = vec3(0.006, 0.006, 0.005); // deep pore
  vec3 c2 = vec3(0.048, 0.046, 0.039); // bark body, cool and damp
  vec3 c3 = vec3(0.088, 0.086, 0.075); // moonlit ridge

  vec3 bark = mix(c1, c2, 0.32 + 0.68 * grain);
  bark = mix(bark, c3, smoothstep(0.46, 0.94, flute) * 0.46);
  bark *= 0.52 + 0.76 * grain2;
  bark *= 0.55 + 0.9 * fibre;
  bark *= 1.0 - crevice * 0.74 - crack * 0.45;

  // pale lichen crusting the shaded side
  float lich =
    smoothstep(0.6, 0.86, fbm(q * 2.1 + 7.0)) * smoothstep(0.28, 0.7, fine);
  bark = mix(bark, vec3(0.095, 0.105, 0.088), lich * 0.42);

  // moss creeping up the roots
  float mossMask =
    smoothstep(0.4, 0.78, fbm(q * 1.5 + 19.0)) *
    smoothstep(0.0, 0.3, vWorld.y) *
    (1.0 - smoothstep(4.5, 9.5, vWorld.y));
  bark = mix(bark, vec3(0.04, 0.062, 0.03), mossMask * 0.72);

  // the flare sits in the shadow of its own crown, so it stays dark and damp
  bark *= 0.34 + 0.66 * smoothstep(0.0, 1.7, o.y);

  // physical-ish response: moon from the upper left, cool sky fill,
  // faint blue rim
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 L = normalize(vec3(-0.58, 0.77, 0.26));
  float ndl = max(dot(n, L), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  bark *= 0.28 + ndl * 0.72 + sky * 0.18;
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
  bark += vec3(0.2, 0.3, 0.48) * rim * 0.26;

  gl_FragColor = vec4(bark, 1.0);
  #include <fog_fragment>
}
`;

function makeBarkMaterial(): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
  ]) as Record<string, THREE.IUniform>;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: BARK_VERT,
    fragmentShader: BARK_FRAG,
    fog: true,
  });
}

const FOLIAGE_VERT = /* glsl */ `
#include <fog_pars_vertex>
attribute vec3 color;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vView;
varying vec3 vTint;
void main() {
  vUv = uv;
  vTint = color;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  vView = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FOLIAGE_FRAG = /* glsl */ `
#include <fog_pars_fragment>
uniform sampler2D u_map;
uniform float u_alphaTest;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vView;
varying vec3 vTint;

void main() {
  vec4 texel = texture2D(u_map, vUv);
  if (texel.a < u_alphaTest) discard;

  vec3 n = normalize(vNormalW);
  vec3 v = normalize(vView);
  vec3 L = normalize(vec3(-0.58, 0.77, 0.26));

  // wrapped diffuse: leaves scatter rather than terminate hard into shadow
  float wrapped = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  wrapped = pow(wrapped, 1.35);

  // cool sky above, warm dark earth below
  float sky = 0.5 + 0.5 * n.y;
  vec3 ambient = mix(vec3(0.02, 0.03, 0.032), vec3(0.1, 0.13, 0.16), sky);

  // moonlight bleeding through the leaf from behind
  float back = pow(clamp(dot(-v, L), 0.0, 1.0), 2.4);
  vec3 transmit = vec3(0.28, 0.38, 0.17) * back * 0.4;

  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

  // leaf albedo, lifted out of the near-black so the crown reads as foliage
  vec3 leaf = texel.rgb * vTint;
  vec3 col = leaf * (ambient * 1.55 + wrapped * vec3(0.2, 0.25, 0.15));
  col += leaf * transmit;
  // moonlight catching the sky-facing leaves and the silhouette edge
  col += vec3(0.12, 0.17, 0.25) * rim * 0.08;
  col += vec3(0.04, 0.055, 0.08) * max(n.y, 0.0) * 0.11;

  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
`;

/** foliage with wrapped diffuse + backlit translucency; alpha-tested cards */
function makeFoliageMaterial(
  map: THREE.Texture,
  alphaTest = 0.32
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      u_map: { value: null as THREE.Texture | null },
      u_alphaTest: { value: alphaTest },
    },
  ]) as Record<string, THREE.IUniform>;
  uniforms.u_map.value = map;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FOLIAGE_VERT,
    fragmentShader: FOLIAGE_FRAG,
    fog: true,
    side: THREE.DoubleSide,
  });
}

/** a tapered, gently curved branch segment. Bend lives in local X/Z so the
 *  whole thing stays a single cylinder topology and merges cleanly. */
function branchGeometry(
  length: number,
  radius: number,
  bendX: number,
  bendZ: number,
  radialSegments = 7
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.4, radius, length, radialSegments, 5, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / length + 0.5; // 0 at the base, 1 at the tip
    const b = t * t;
    pos.setX(i, pos.getX(i) + bendX * b);
    pos.setZ(i, pos.getZ(i) + bendZ * b);
  }
  geo.computeVertexNormals();
  return geo;
}

function growBranch(
  branchGeos: THREE.BufferGeometry[],
  clumpGeo: THREE.BufferGeometry,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  rng: () => number,
  clumpGeos: THREE.BufferGeometry[],
  mossGeos: THREE.BufferGeometry[],
  sprigGeos: THREE.BufferGeometry[],
  sprigGeo: THREE.BufferGeometry
): void {
  const start = origin.clone();
  const d = dir.clone().normalize();
  const end = start.clone().addScaledVector(d, length);

  const geo = branchGeometry(
    length,
    radius,
    (rng() - 0.5) * length * 0.22,
    (rng() - 0.5) * length * 0.22
  );
  if (depth > 0) {
    geo.rotateY(rng() * TAU);
    geo.translate(0, length / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    geo.applyQuaternion(q);
    geo.translate(start.x, start.y, start.z);
  } else {
    geo.translate(0, length / 2, 0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
    geo.translate(start.x, start.y, start.z);
  }
  branchGeos.push(geo);

  const pushCard = (
    target: THREE.BufferGeometry[],
    source: THREE.BufferGeometry,
    pos: THREE.Vector3,
    rot: THREE.Euler,
    scale: THREE.Vector3,
    tint: number
  ): void => {
    const g = source.clone();
    // per-card tint so the crown is not one flat tone: some leaves read
    // warm olive, others cool blue-green
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const warm = rng();
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tint * (0.8 + warm * 0.34);
      colors[i * 3 + 1] = tint;
      colors[i * 3 + 2] = tint * (0.78 + (1 - warm) * 0.4);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mtx = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), scale);
    g.applyMatrix4(mtx);
    target.push(g);
  };

  if (depth >= 3) {
    // many smaller clumps rather than a few large ones: the crown keeps real
    // mass but its edges stay lacy instead of reading as broccoli
    const terminal = depth >= 5 || radius < 0.16;
    const count = terminal ? 11 + Math.floor(rng() * 5) : 5 + Math.floor(rng() * 3);
    for (let k = 0; k < count; k++) {
      const size = (0.72 + rng() * 1.12) * (terminal ? 0.94 : 1.06);
      const off = terminal ? 0.24 + rng() * 1.45 : 0.16 + rng() * 0.8;
      const a2 = rng() * TAU;
      const up = (rng() - 0.35) * (terminal ? 1.1 : 0.78);
      // push the terminal clumps out past the twig tip so bare stubs never
      // poke through the crown line
      const tipOut = terminal ? 0.15 + rng() * 0.55 : 0;
      const pos = end
        .clone()
        .addScaledVector(d, tipOut + (rng() - 0.3) * 0.8)
        .add(new THREE.Vector3(Math.cos(a2) * off, up, Math.sin(a2) * off));
      const rot = new THREE.Euler((rng() - 0.5) * 1.5, rng() * TAU, (rng() - 0.5) * 1.5);
      const scale = new THREE.Vector3(size, size * (0.75 + rng() * 0.5), size);
      // outer leaves catch more sky; core leaves stay deep green
      const tint = 0.46 + rng() * 0.6 + (terminal ? 0.08 : 0);
      pushCard(clumpGeos, clumpGeo, pos, rot, scale, tint);
    }

    if (rng() < 0.24) {
      const pos = end.clone().add(new THREE.Vector3(0, -0.8 - rng() * 1.0, 0));
      const rot = new THREE.Euler(0, rng() * TAU, 0);
      const scale = new THREE.Vector3(0.45 + rng() * 0.55, 0.8 + rng() * 1.3, 1);
      pushCard(mossGeos, new THREE.PlaneGeometry(0.7, 1).translate(0, -0.5, 0), pos, rot, scale, 1);
    }

    // leaves clothe the outer half of each branch, not just the tips, so the
    // crown reads as one connected mass instead of floating clusters
    if (depth >= 3) {
      const along = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < along; k++) {
        const t = 0.32 + rng() * 0.62;
        const pos = start.clone().addScaledVector(d, length * t);
        pos.x += (rng() - 0.5) * 0.6;
        pos.z += (rng() - 0.5) * 0.6;
        const size = 0.5 + rng() * 0.95;
        const rot = new THREE.Euler((rng() - 0.5) * 1.5, rng() * TAU, (rng() - 0.5) * 1.5);
        pushCard(
          clumpGeos,
          clumpGeo,
          pos,
          rot,
          new THREE.Vector3(size, size * (0.8 + rng() * 0.4), size),
          0.36 + rng() * 0.5
        );
      }
    }

    // fine leafy sprigs hang off the twigs and soften the hard card edges
    if (depth >= 4) {
      const sprigs = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < sprigs; k++) {
        const t = 0.5 + rng() * 0.55;
        const pos = start.clone().addScaledVector(d, length * t);
        pos.x += (rng() - 0.5) * 0.7;
        pos.y += (rng() - 0.5) * 0.5;
        pos.z += (rng() - 0.5) * 0.7;
        const sz = 0.3 + rng() * 0.36;
        const rot = new THREE.Euler(
          (rng() - 0.5) * 0.7,
          rng() * TAU,
          (rng() - 0.5) * 0.9
        );
        pushCard(
          sprigGeos,
          sprigGeo,
          pos,
          rot,
          new THREE.Vector3(sz, sz * (1.05 + rng() * 0.35), 1),
          0.4 + rng() * 0.45
        );
      }
    }

    if (terminal || depth >= 4) return;
  }

  const children = depth === 0 ? 4 : rng() < 0.62 ? 2 : 3;
  for (let i = 0; i < children; i++) {
    const spread = 0.4 + rng() * 0.5;
    const angle = rng() * TAU;
    const axis = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).cross(d).normalize();
    if (axis.lengthSq() < 0.001) axis.set(1, 0, 0);
    const childDir = d.clone().applyAxisAngle(axis, spread);
    childDir.y += 0.16 + rng() * 0.16;
    childDir.normalize();
    growBranch(
      branchGeos,
      clumpGeo,
      end,
      childDir,
      length * (0.66 + rng() * 0.14),
      radius * (0.52 + rng() * 0.12),
      depth + 1,
      rng,
      clumpGeos,
      mossGeos,
      sprigGeos,
      sprigGeo
    );
  }
}

export interface GreatTreeRig {
  update: (time: number) => void;
}

export function buildGreatTree(
  scene: THREE.Scene,
  seed: number,
  groundY: number
): GreatTreeRig {
  const rng = mulberry32(seed);
  const bark = makeBarkMaterial();
  const clumpTex = makeCanopyTexture(seed ^ 0x7711);
  const clumpMat = makeFoliageMaterial(clumpTex, 0.34);
  const clumpGeo = crossCardGeometry();
  // fine leafy sprigs, hung in the outer twigs to break the card silhouettes
  const sprigTex = makeSprigTexture(seed ^ 0x2f1a);
  const sprigMat = makeFoliageMaterial(sprigTex, 0.22);
  const sprigGeo = new THREE.PlaneGeometry(1, 1);
  sprigGeo.translate(0, -0.5, 0);
  const mossMat = new THREE.MeshStandardMaterial({
    map: makeMossTexture(seed ^ 0x88),
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 1,
    color: 0xc9c2a4,
    vertexColors: true,
  });

  const group = new THREE.Group();
  const clumpGeos: THREE.BufferGeometry[] = [];
  const mossGeos: THREE.BufferGeometry[] = [];
  const branchGeos: THREE.BufferGeometry[] = [];
  const sprigGeos: THREE.BufferGeometry[] = [];

  // a slight lean and a wavering direction make the trunk feel grown
  growBranch(
    branchGeos,
    clumpGeo,
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.04, 1, -0.02),
    6.4,
    2.35,
    0,
    rng,
    clumpGeos,
    mossGeos,
    sprigGeos,
    sprigGeo
  );

  // one draw call for the whole skeleton, crown and moss
  let branches: THREE.Mesh | null = null;
  if (branchGeos.length) {
    const mergedBark = mergeGeometries(branchGeos)!;
    branches = new THREE.Mesh(mergedBark, bark);
    branches.frustumCulled = false;
    group.add(branches);
    for (const g of branchGeos) g.dispose();
  }
  // one draw call for the whole crown
  let crown: THREE.Mesh | null = null;
  let mossMesh: THREE.Mesh | null = null;
  if (clumpGeos.length) {
    const merged = mergeGeometries(clumpGeos)!;
    crown = new THREE.Mesh(merged, clumpMat);
    crown.frustumCulled = false;
    group.add(crown);
    for (const g of clumpGeos) g.dispose();
  }
  if (mossGeos.length) {
    const mergedMoss = mergeGeometries(mossGeos)!;
    mossMesh = new THREE.Mesh(mergedMoss, mossMat);
    group.add(mossMesh);
    for (const g of mossGeos) g.dispose();
  }
  // one draw call for the fine leaf sprigs
  let sprigs: THREE.Mesh | null = null;
  if (sprigGeos.length) {
    const mergedSprigs = mergeGeometries(sprigGeos)!;
    sprigs = new THREE.Mesh(mergedSprigs, sprigMat);
    sprigs.frustumCulled = false;
    group.add(sprigs);
    for (const g of sprigGeos) g.dispose();
  }

  // flared roots
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng() * 0.5;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 1.05, 3.4, 7, 1, true),
      bark
    );
    root.position.set(Math.cos(a) * 1.9, 0.8, Math.sin(a) * 1.9);
    root.rotation.z = Math.cos(a) * 0.8;
    root.rotation.x = -Math.sin(a) * 0.8;
    group.add(root);
  }

  group.position.set(TREE_POS.x, groundY, TREE_POS.z);
  scene.add(group);

  // a broad shadow anchors the tree to the clearing
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);
  const baseShadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: makeShadowTexture(),
      transparent: true,
      depthWrite: false,
      color: 0x000000,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    })
  );
  baseShadow.position.set(TREE_POS.x, groundY + 0.05, TREE_POS.z);
  baseShadow.scale.set(17, 1, 15);
  baseShadow.renderOrder = 1;
  scene.add(baseShadow);

  return {
    update(time) {
      // the whole crown breathes rather than every card twitching
      if (crown) {
        crown.rotation.z = Math.sin(time * 0.21) * 0.006;
        crown.rotation.x = Math.cos(time * 0.17) * 0.005;
      }
      if (mossMesh) {
        mossMesh.rotation.z = Math.sin(time * 0.4) * 0.01;
      }
    },
  };
}

/** keep the forest off the landmarks so they read as destinations */
const LANDMARK_CLEARINGS = [
  { x: -30, z: -33, r: 12 }, // the standing stones
  { x: 33.5, z: -19, r: 8.5 }, // the hut
  { x: -15, z: -55, r: 10 }, // the titan
];

/* ------------------------------------------------------------------ */
/* distant landmarks: more than one destination                        */
/* ------------------------------------------------------------------ */

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
  const rr = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
  };
  const rng = rr(20261113);
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
  const stoneGround = groundHeightAt(stoneCenter.x, stoneCenter.z);
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

/* ------------------------------------------------------------------ */
/* mist                                                                */
/* ------------------------------------------------------------------ */

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
      color: i % 3 === 0 ? 0x8f8a7a : 0x556070,
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
      color: 0x6d6a5f,
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