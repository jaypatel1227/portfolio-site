/** Flow-aligned paint dabs, raised bristles and a quiet linen ground. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Post } from "../world";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 px = 1.0 / resolution;
      float gx = lum(texture2D(tDiffuse, vUv + vec2(2.0, 0.0) * px).rgb)
               - lum(texture2D(tDiffuse, vUv - vec2(2.0, 0.0) * px).rgb);
      float gy = lum(texture2D(tDiffuse, vUv + vec2(0.0, 2.0) * px).rgb)
               - lum(texture2D(tDiffuse, vUv - vec2(0.0, 2.0) * px).rgb);
      vec2 flow = normalize(vec2(-gy, gx) + vec2(0.001, 0.002));
      vec2 across = vec2(-flow.y, flow.x);
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float best = 100.0;
      // Four overlapping, elongated sectors: choose the calmest paint patch.
      for (int s = 0; s < 4; s++) {
        vec2 signum = vec2(s == 0 || s == 1 ? -1.0 : 1.0, s == 0 || s == 2 ? -1.0 : 1.0);
        vec3 mean = vec3(0.0);
        vec3 square = vec3(0.0);
        for (int j = 0; j < 2; j++) {
          for (int i = 0; i < 2; i++) {
            vec2 offset = flow * float(i) * 4.5 * signum.x + across * float(j) * 2.2 * signum.y;
            vec3 c = texture2D(tDiffuse, vUv + offset * px).rgb;
            mean += c;
            square += c * c;
          }
        }
        mean /= 4.0;
        float variance = dot(abs(square / 4.0 - mean * mean), vec3(1.0));
        if (variance < best) { best = variance; col = mean; }
      }
      float l = lum(col);
      col = mix(vec3(l), col, 1.42);
      float cool = smoothstep(0.0, 0.08, col.b - col.r);
      col = mix(col, col * vec3(0.65, 0.91, 1.4) + vec3(0.003, 0.006, 0.025), cool * 0.65);
      vec2 p = vUv * resolution;
      vec2 cell = floor(p / vec2(18.0, 10.0));
      vec2 local = p - (cell + 0.5) * vec2(18.0, 10.0);
      vec2 brush = vec2(dot(local, flow), dot(local, across));
      float dab = hash(cell);
      float bristle = sin(brush.y * 2.5 + sin(brush.x * 0.15) * 0.8 + dab * 6.28);
      float relief = cos(brush.y * 2.5 + sin(brush.x * 0.15) * 0.8 + dab * 6.28);
      col *= 0.91 + dab * 0.17 + bristle * 0.055 + relief * 0.065;
      col += vec3(0.035, 0.029, 0.014) * max(relief, 0.0) * smoothstep(0.02, 0.25, l);
      float weave = sin(p.x * 3.14159) * sin(p.y * 3.14159);
      col *= 1.0 + weave * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};


export function createGladePost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): Post {
  renderer.setClearColor(0x080a0f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.27, 0.8, 0.9);
  composer.addPass(bloom);
  const paint = new ShaderPass(GradeShader);
  composer.addPass(paint);
  composer.addPass(new OutputPass());

  return {
    render: () => composer.render(),
    setSize(width, height) {
      composer.setSize(width, height);
      paint.uniforms.resolution.value.set(width, height);
      bloom.setSize(Math.round(width / 2), Math.round(height / 2));
    },
  };
}
