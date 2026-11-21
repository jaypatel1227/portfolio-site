/** Cold ash shadows, ember bloom and a grainy, vignetted lens. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Post } from "../world";

const Grade = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float luminance = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float warm = smoothstep(0.03, 0.22, col.r - col.b);
      col = mix(vec3(luminance), col, mix(0.6, 1.0, warm));
      col *= mix(vec3(0.91, 0.96, 1.12), vec3(1.05, 0.98, 0.87), warm);
      float vignette = smoothstep(0.82, 0.17, length((vUv - 0.5) * vec2(1.0, 0.9)));
      col *= mix(0.35, 1.0, vignette);
      col = max(vec3(0.0), col - 0.0035);
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createRuinsPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Post {
  renderer.setClearColor(0x090b12, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.8, 0.65);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(Grade));
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(width, height) {
      composer.setSize(width, height);
      bloom.setSize(Math.round(width / 2), Math.round(height / 2));
    },
  };
}
