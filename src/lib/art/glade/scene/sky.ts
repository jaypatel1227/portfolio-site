/** Smoke-veiled charcoal sky and a low blood moon. */
import * as THREE from "three";
import { makeDotTexture, makeMoonTexture } from "./textures";

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

  vec3 zenith = vec3(0.009, 0.006, 0.009);
  vec3 upper = vec3(0.038, 0.019, 0.023);
  vec3 horizon = vec3(0.18, 0.065, 0.033);
  vec3 col = mix(horizon, upper, smoothstep(-0.02, 0.28, h));
  col = mix(col, zenith, smoothstep(0.2, 0.9, h));

  // scattered ember light through the smoke
  vec2 moonAz = normalize(vec2(-0.4, -0.92));
  vec2 awayAz = -moonAz;

  // zodiacal light: a faint wedge of scattered moonlight rising along the
  // ecliptic on the moon side, brightest low and fading with altitude
  float zo = pow(max(dot(az, moonAz), 0.0), 3.0) * exp(-max(h, 0.0) * 3.6);
  col += vec3(0.12, 0.035, 0.009) * zo;

  // smoke combed toward the moon
  float cirH = exp(-pow((h - 0.34) * 4.6, 2.0));
  float cir = fbm2(vec2(dir.x * 1.9 + dir.z * 1.1 + u_time * 0.004, h * 14.0));
  cir = smoothstep(0.52, 0.86, cir) * cirH;
  float cirMoon = 0.5 + 0.5 * dot(az, moonAz);
  col += mix(vec3(0.04, 0.024, 0.027), vec3(0.17, 0.07, 0.035), cirMoon) * cir * 1.4;

  // drifting smoke filaments on the far side
  float asect = pow(max(dot(az, awayAz), 0.0), 2.6);
  float awin = smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.3, 0.62, h));
  float aband = fbm2(vec2(dir.x * 3.1 + u_time * 0.011, dir.z * 3.1 - u_time * 0.007));
  aband = pow(smoothstep(0.42, 0.9, aband), 2.2);
  float afilament = sin(dir.x * 5.0 + aband * 9.0 + u_time * 0.05);
  afilament = pow(0.5 + 0.5 * afilament, 3.0);
  float aur = aband * afilament * asect * awin;
  col += vec3(0.07, 0.028, 0.02) * aur * 0.8;
  col += vec3(0.07, 0.025, 0.02) * aur * aur * 0.9;

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
  col = mix(vec3(0.09, 0.052, 0.042), col, smoothstep(-0.09, 0.1, h));

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
    uniforms: { u_time: { value: 0 }, u_stars: { value: 0.035 } },
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
    new THREE.CircleGeometry(23, 64),
    new THREE.MeshBasicMaterial({ map: moonTex, fog: false, color: new THREE.Color(2.8, 0.27, 0.055) })
  );
  moon.position.set(-25, 78, -212);
  moon.lookAt(0, 1.7, 0);
  scene.add(moon);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xc74318,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  halo.position.copy(moon.position);
  halo.scale.setScalar(140);
  halo.renderOrder = -9;
  scene.add(halo);

  const innerHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xff681f,
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
