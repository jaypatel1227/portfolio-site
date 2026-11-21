/** The one enormous old tree holding the clearing. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TAU, mulberry32 } from "../math";
import { TREE_POS } from "./layout";
import { makeCanopyTexture, makeMossTexture, makeShadowTexture, makeSprigTexture } from "./textures";
import { crossCardGeometry } from "./shared";

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
  bark += vec3(0.48, 0.25, 0.06) * rim * 0.4;
  float vein = pow(smoothstep(0.68, 0.94, flute), 3.0);
  bark += vec3(1.05, 0.34, 0.025) * vein * (0.35 + 0.65 * grain2);

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

  // moonlight bleeding through the leaf from behind
  float back = pow(clamp(dot(-v, L), 0.0, 1.0), 2.4);
  vec3 transmit = vec3(0.28, 0.38, 0.17) * back * 0.4;

  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

  // leaf albedo, lifted out of the near-black so the crown reads as foliage
  vec3 leaf = texel.rgb * vTint;
  float gold = dot(leaf, vec3(0.3, 0.6, 0.1));
  vec3 col = vec3(0.9, 0.36, 0.035) * (0.12 + gold * 2.8) * (0.35 + wrapped * 0.65);
  col += leaf * transmit;
  // moonlight catching the sky-facing leaves and the silhouette edge
  col += vec3(0.6, 0.25, 0.025) * rim * 0.5;
  col += vec3(0.15, 0.065, 0.008) * max(n.y, 0.0);

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

  const treeLight = new THREE.PointLight(0xffb744, 65, 28, 2);
  treeLight.position.set(TREE_POS.x, groundY + 6, TREE_POS.z);
  scene.add(treeLight);

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
