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
      col *= mix(0.4, 1.0, vig);

      // ash midtones, wine-black shadows and burnished highlights
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float warm = smoothstep(0.025, 0.2, col.r - col.b);
      col = mix(vec3(l), col, mix(0.65, 1.0, warm));
      col *= mix(vec3(0.88, 0.95, 1.13), vec3(1.04, 0.99, 0.92), warm);
      col = max(vec3(0.0), col - 0.0045);
      col = clamp(col, 0.0, 1.0);

      // very fine grain, keeps the fog from banding
      float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.016;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};


export function createGladePost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): Post {
  renderer.setClearColor(0x140d0e, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.85, 0.55);
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
