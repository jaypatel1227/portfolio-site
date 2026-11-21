/** The glade's look: tone mapping, bloom so the lights glow, and a light film grade. */
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
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      float ca = 0.0016 * r2;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + d * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - d * ca).b;

      // a soft vignette; the glade falls away at the edges
      float vig = smoothstep(0.9, 0.22, length(d * vec2(1.04, 1.0)));
      col *= mix(0.56, 1.0, vig);

      // gentle split tone: cool moonlit shadows, faintly warm highlights
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.9, 0.99, 1.12), (1.0 - smoothstep(0.02, 0.42, l)) * 0.6);
      col = mix(col, col * vec3(1.08, 1.01, 0.93), smoothstep(0.34, 1.0, l) * 0.55);
      col = clamp(col, 0.0, 1.0);

      // very fine grain, keeps the fog from banding
      float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.01;

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
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.72, 0.85);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());

  return {
    render: () => composer.render(),
    setSize(width, height) {
      composer.setSize(width, height);
      bloom.setSize(Math.round(width / 2), Math.round(height / 2));
    },
  };
}
