import * as THREE from "three";
import { MAX_FRAME_DELTA } from "../config";

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const targets = [1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false }));
  const screen = new THREE.Scene();
  const outputCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = { fine: { value: targets[0].texture }, coarse: { value: targets[0].texture }, blend: { value: 0 } };
  let pixelSize = 3;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 screenUv;
      void main() { screenUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D fine;
      uniform sampler2D coarse;
      uniform float blend;
      varying vec2 screenUv;
      void main() {
        gl_FragColor = mix(texture2D(fine, screenUv), texture2D(coarse, screenUv), smoothstep(0.0, 1.0, blend));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  screen.add(quad);
  let info = { ...renderer.info.render }, raf = 0, last = 0, running = false;
  let update: (now: number, dt: number) => void = () => {};
  function frame(now: number): void {
    raf = 0;
    const dt = Math.min(MAX_FRAME_DELTA, Math.max(0, (now - last) / 1000)); last = now;
    update(now, dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  return {
    get info() { return info; },
    get memory() { return renderer.info.memory; },
    get resolution() { return { width: targets[0].width, height: targets[0].height, pixels: pixelSize, targets: targets.map((t) => [t.width, t.height]) }; },
    resize(width: number, height: number) {
      renderer.setSize(width, height);
      targets.forEach((target, i) => target.setSize(Math.ceil(width / (i + 1)), Math.ceil(height / (i + 1))));
    },
    setRunning(next: boolean, callback: typeof update) {
      running = next; update = callback;
      if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    render(scene: THREE.Scene, camera: THREE.Camera, pixels: number) {
      pixelSize = pixels;
      const lower = Math.floor(pixels), upper = Math.ceil(pixels);
      uniforms.fine.value = targets[lower - 1].texture;
      uniforms.coarse.value = targets[upper - 1].texture;
      uniforms.blend.value = pixels - lower;
      renderer.setRenderTarget(targets[lower - 1]); renderer.render(scene, camera);
      info = { ...renderer.info.render };
      if (upper !== lower) {
        renderer.setRenderTarget(targets[upper - 1]); renderer.render(scene, camera);
        info.calls += renderer.info.render.calls; info.triangles += renderer.info.render.triangles;
        info.points += renderer.info.render.points; info.lines += renderer.info.render.lines;
      }
      renderer.setRenderTarget(null); renderer.render(screen, outputCamera);
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      targets.forEach((target) => target.dispose()); quad.geometry.dispose(); quad.material.dispose(); renderer.dispose();
    },
  };
}
