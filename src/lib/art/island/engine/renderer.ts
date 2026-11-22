import * as THREE from "three";
import { MAX_FRAME_DELTA } from "../config";

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
  const screen = new THREE.Scene();
  const outputCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let pixelSize = 3, width = 1, height = 1;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false }));
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
    get resolution() { return { width: target.width, height: target.height, pixels: pixelSize }; },
    resize(w: number, h: number) {
      width = w; height = h; renderer.setSize(w, h);
    },
    setRunning(next: boolean, callback: typeof update) {
      running = next; update = callback;
      if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    render(scene: THREE.Scene, camera: THREE.Camera, pixels: number) {
      pixelSize = pixels;
      const w = Math.ceil(width / pixels), h = Math.ceil(height / pixels);
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      renderer.setRenderTarget(target); renderer.render(scene, camera);
      info = { ...renderer.info.render };
      renderer.setRenderTarget(null); renderer.render(screen, outputCamera);
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      target.dispose(); quad.geometry.dispose(); quad.material.dispose(); renderer.dispose();
    },
  };
}
