/** "The Starry Field": a walk inside thousands of loaded oil-paint strokes. */
import * as THREE from "three";
import { walking } from "./controller";
import { paintedLandscape } from "./landscape";
import { paintedSky } from "./sky";

export function bootStarry(canvas: HTMLCanvasElement): void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    canvas.hidden = true;
    canvas.style.display = "none";
    return;
  }
  renderer.setClearColor(0x101f3c);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 400);
  const sky = paintedSky();
  const land = paintedLandscape();
  scene.add(sky.group, land.group);
  const walker = walking(canvas, camera);
  const wide = matchMedia("(min-width: 64rem)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let live = false;
  let raf = 0;
  let last = 0;
  let clock = 40;

  const render = (): void => {
    sky.group.position.copy(camera.position);
    sky.update(clock);
    land.update(clock);
    renderer.render(scene, camera);
  };
  const frame = (now: number): void => {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    walker.step(dt);
    render();
    raf = requestAnimationFrame(frame);
  };
  const syncLoop = (): void => {
    if (live && document.visibilityState === "visible") {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const size = (): void => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(innerWidth, innerHeight);
    render();
  };
  const mode = (): void => {
    live = wide.matches && !reduced.matches;
    canvas.toggleAttribute("data-walkable", live);
    walker.setEnabled(live);
    if (!live) clock = 40;
    render();
    syncLoop();
  };
  window.addEventListener("resize", size);
  document.addEventListener("visibilitychange", syncLoop);
  wide.addEventListener("change", mode);
  reduced.addEventListener("change", mode);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    live = false;
    syncLoop();
    canvas.hidden = true;
    canvas.style.display = "none";
  });
  size();
  mode();
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __starry: {
        ...walker,
        counts: { sky: sky.count, ...land.counts },
        stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
      },
    });
  }
}
