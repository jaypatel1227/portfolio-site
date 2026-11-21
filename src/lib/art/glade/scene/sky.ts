/** A low blood moon behind the castle, and slow ash clouds above the bowl. */
import * as THREE from "three";

const VERT = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float u_time;
varying vec3 vDirection;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += noise(p) * amplitude;
    p = p * 2.03 + vec2(7.1, 11.4);
    amplitude *= 0.5;
  }
  return value;
}
void main() {
  vec3 d = normalize(vDirection);
  vec3 moon = normalize(vec3(151.0, 102.0, -255.0));
  float angle = acos(clamp(dot(d, moon), -1.0, 1.0));
  float horizon = exp(-pow((d.y - 0.025) * 5.0, 2.0));
  float moonSide = pow(max(dot(normalize(d.xz), normalize(moon.xz)), 0.0), 9.0);
  vec3 col = mix(vec3(0.027, 0.027, 0.039), vec3(0.004, 0.006, 0.011), smoothstep(0.0, 0.7, d.y));
  col += vec3(0.16, 0.018, 0.012) * horizon * moonSide;
  float clouds = fbm(d.xz * 3.7 / (abs(d.y) + 0.3) + vec2(u_time * 0.006, u_time * 0.002));
  float wisps = fbm(vec2(d.x * 5.0 + u_time * 0.004, d.y * 24.0 + d.z * 3.0));
  col += vec3(0.032, 0.034, 0.046) * smoothstep(0.35, 0.8, clouds) * (0.4 + wisps);
  col += vec3(0.55, 0.065, 0.012) * exp(-angle * angle * 36.0) * (0.4 + clouds * 0.6);
  float disk = 1.0 - smoothstep(0.118, 0.12, angle);
  float limb = sqrt(max(0.0, 1.0 - pow(angle / 0.12, 2.0)));
  float surface = 0.88 + fbm(d.xz * 100.0) * 0.12;
  col = mix(col, vec3(2.2, 0.21, 0.035) * (0.3 + limb * 0.7) * surface, disk);
  float smoke = smoothstep(0.42, 0.86, wisps) * 0.55;
  col = mix(col, vec3(0.018, 0.02, 0.03), smoke);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function buildSky(scene: THREE.Scene): { update(camera: THREE.Camera, time: number): void } {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { u_time: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 24), material);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  scene.add(dome);
  return {
    update(camera, time) {
      dome.position.copy(camera.position);
      material.uniforms.u_time.value = time;
    },
  };
}
