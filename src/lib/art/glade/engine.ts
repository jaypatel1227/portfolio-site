/**
 * Runs a World on a canvas: renderer, resize, the frame loop and its
 * pausing. Walkable mode runs the loop and takes input; otherwise the
 * canvas holds one composed still frame at no per-frame cost.
 */
import * as THREE from "three";
import { createWalker, type WalkPhase, type Walker } from "./walker";
import type { World } from "./world";

const MAX_PIXEL_RATIO = 1.75;
const MAX_FRAME_SECONDS = 0.05;
/** the moment the still frame is taken at */
const STILL_TIME = 40;

export interface Engine {
  /** nothing is drawn until this is first called */
  setWalkable(on: boolean): void;
  walker: Walker;
}

export function createEngine(
  canvas: HTMLCanvasElement,
  createWorld: () => World,
  onPhase: (phase: WalkPhase) => void
): Engine | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
  } catch {
    return null;
  }

  const world = createWorld();
  const walker = createWalker(canvas, world, onPhase);
  const camera = walker.camera;
  // built before the first resize on purpose: the post chain keeps the
  // pixel ratio it was created with, so the scene renders at css size
  const post = world.createPost(renderer, camera);

  let walkable = false;
  let raf = 0;
  let last = 0;

  const renderStill = (): void => {
    world.update({ time: STILL_TIME, dt: 0.016, camera, player: walker.player, motion: 0 });
    post.render();
  };

  const frame = (now: number): void => {
    raf = 0;
    const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    walker.step(dt, time);
    world.update({ time, dt, camera, player: walker.player, motion: walker.motion });
    post.render();
    raf = requestAnimationFrame(frame);
  };

  /** the loop only runs while walkable and the tab is showing */
  const syncLoop = (): void => {
    const run = walkable && document.visibilityState === "visible";
    if (run && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(w, h);
    post.setSize(w, h);
  };

  window.addEventListener("resize", () => {
    resize();
    if (!walkable) post.render();
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    canvas.style.opacity = "0";
  });
  document.addEventListener("visibilitychange", syncLoop);

  resize();

  return {
    walker,
    setWalkable(on) {
      walkable = on;
      walker.setEnabled(on);
      syncLoop();
      if (!on) renderStill();
    },
  };
}
