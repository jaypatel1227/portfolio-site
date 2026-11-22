import * as THREE from "three";
import { MAX_FRAME_DELTA } from "../config";

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let pixelSize = 3, width = 1, height = 1;
  let raf = 0, last = 0, running = false;
  let update: (now: number, dt: number) => void = () => {};
  function frame(now: number): void {
    raf = 0;
    const dt = Math.min(MAX_FRAME_DELTA, Math.max(0, (now - last) / 1000)); last = now;
    update(now, dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  return {
    get info() { return renderer.info.render; },
    get memory() { return renderer.info.memory; },
    get resolution() { return { width: canvas.width, height: canvas.height, pixels: pixelSize }; },
    resize(w: number, h: number) {
      width = w; height = h;
    },
    setRunning(next: boolean, callback: typeof update) {
      running = next; update = callback;
      if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    render(scene: THREE.Scene, camera: THREE.Camera, pixels: number) {
      pixelSize = pixels;
      const w = Math.ceil(width / pixels), h = Math.ceil(height / pixels);
      if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
