/** The night sky dome: gradient, stars and the moon. */
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
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main() {
  vec3 dir = normalize(vDir);
  vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
  vec2 q = uv * vec2(1.7, 2.2);
  float turn = u_time * 0.012;
  vec2 warp = q;
  for (int i = 0; i < 3; i++) {
    vec2 center = vec2(float(i) * 2.8 - 2.7, 0.7 + sin(float(i) * 4.0) * 0.5);
    vec2 d = q - center;
    float r = length(d);
    float a = 2.1 * exp(-r * 0.65) + turn;
    warp += vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y) * exp(-r * 0.48);
  }
  float wave = warp.y * 12.0 + sin(warp.x * 2.5 + turn) * 3.0;
  float bands = 0.5 + 0.5 * sin(wave);
  vec2 eddy = q - vec2(-1.8, 1.35);
  float radius = length(eddy);
  float spiral = radius * 18.0 - atan(eddy.y, eddy.x) * 3.0 - turn;
  float curl = exp(-radius * radius * 0.9);
  bands = mix(bands, 0.5 + 0.5 * sin(spiral), curl);
  float stroke = pow(0.5 + 0.5 * sin(wave * 3.0 + sin(warp.x * 32.0) * 0.35), 5.0);
  stroke = mix(stroke, pow(0.5 + 0.5 * sin(spiral * 3.0), 5.0), curl);
  float broken = 0.65 + 0.35 * sin(warp.x * 75.0 + warp.y * 9.0);
  vec3 col = mix(vec3(0.006,0.016,0.085), vec3(0.035,0.16,0.42), bands * 0.8);
  col += vec3(0.09,0.20,0.25) * stroke * broken * 0.65;
  col *= mix(0.6, 1.0, smoothstep(-0.15, 0.3, dir.y));
  vec2 grid = uv * vec2(7.0, 5.0);
  vec2 id = floor(grid);
  vec2 f = fract(grid) - 0.5;
  vec2 off = (vec2(hash(id),hash(id+7.1))-0.5)*0.5;
  float r = length((f-off)*vec2(max(0.22,cos(uv.y)),1.4));
  float seed = hash(id+19.0);
  if (seed > 0.65 && dir.y > 0.04) {
    float radius = 0.065 + seed * 0.025;
    float core = smoothstep(radius, radius * 0.5, r);
    float halo = exp(-r * 9.0);
    float rings = pow(0.5 + 0.5 * sin(r * 120.0 + sin(atan(f.y-off.y,f.x-off.x)*7.0)*0.4), 3.0);
    col = mix(col, vec3(0.25,0.43,0.62), halo * rings * 0.5);
    col += vec3(0.8,0.57,0.08) * halo * rings * 0.65;
    col = mix(col, vec3(1.5,1.12,0.22), core * u_stars);
  }
  float moon = acos(clamp(dot(dir, normalize(vec3(-92.0,92.0,-212.0))), -1.0, 1.0));
  float rings = pow(0.5 + 0.5 * sin(moon * 270.0), 3.0);
  col += mix(vec3(0.09,0.24,0.5),vec3(0.7,0.57,0.1),rings) * exp(-moon*12.0) * 0.8;
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
      color: 0xf4cb50,
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
