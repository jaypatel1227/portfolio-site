import * as THREE from "three";
import { restFraming } from "./framing";
import { movePlayer, relativeMove, smooth } from "./math";
import { createWorld, HOME, NOTE } from "./world";
import { prepareVapor } from "./vapor";
import { clampZoom, pixelScale } from "./zoom";

const HOME_YAW = 0.55;
const SPEED = 3.3;
const ZOOM_KEYS = new Set(["Equal", "Minus", "NumpadAdd", "NumpadSubtract"]);
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"]);

export function bootIsland(canvas: HTMLCanvasElement, note: HTMLElement | null): void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let sceneRender = { ...renderer.info.render };
  const world = createWorld(2026);
  const camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 180);
  camera.add(world.sky); world.scene.add(camera);
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
  const screen = new THREE.Scene();
  const outputCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false })));
  const wide = matchMedia("(min-width: 64rem)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const keys = new Set<string>();
  const player = new THREE.Vector3(HOME.x, 0, HOME.z);
  const focus = new THREE.Vector3(0, 1.2, 1.5);
  let yaw = HOME_YAW, wantedYaw = yaw, enabled = false, raf = 0, last = 0;
  let dragging = false, dragX = 0, phase = "rest", facing = Math.PI, steps = 0;
  let rest = restFraming(innerWidth, innerHeight, { right: innerWidth * 0.44, bottom: 320 }, 74, innerHeight - 120);
  let zoom = 0;
  let exploreVertical = 24, wantedVertical = 24;
  let zoomTransition = { from: 0, to: 0, elapsed: 1.05 };
  const zoomTo = (to: number): void => {
    if (zoomTransition.to !== to) zoomTransition = { from: zoom, to, elapsed: 0 };
  };
  let drift: { elapsed: number; x: number; z: number; yaw: number } | null = null;
  const setPhase = (next: string): void => { phase = next; document.body.dataset.island = next; };
  setPhase("rest");
  function draw(time: number, motion: number, dt: number): void {
    zoomTransition.elapsed += dt;
    zoom = THREE.MathUtils.lerp(zoomTransition.from, zoomTransition.to, smooth(zoomTransition.elapsed / 1.05));
    exploreVertical += (clampZoom(wantedVertical, rest.vertical) - exploreVertical) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 8));
    const vertical = THREE.MathUtils.lerp(rest.vertical, exploreVertical, zoom);
    const pixels = pixelScale(vertical, innerWidth);
    const renderWidth = Math.ceil(innerWidth / pixels), renderHeight = Math.ceil(innerHeight / pixels);
    if (target.width !== renderWidth || target.height !== renderHeight) target.setSize(renderWidth, renderHeight);
    const horizontal = vertical * innerWidth / innerHeight;
    const cx = THREE.MathUtils.lerp(rest.centerX, 0.5, zoom), cy = THREE.MathUtils.lerp(rest.centerY, 0.54, zoom);
    camera.left = -horizontal * cx; camera.right = horizontal * (1 - cx);
    camera.top = vertical * cy; camera.bottom = -vertical * (1 - cy);
    camera.updateProjectionMatrix(); world.setView(camera);
    const follow = new THREE.Vector3(player.x * zoom, 1.2, THREE.MathUtils.lerp(1.5, player.z - 1.5, zoom));
    focus.lerp(follow, dt === 0 ? 1 : 1 - Math.exp(-dt * 5));
    const distance = 65, pitch = Math.PI * 0.24;
    camera.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * distance, focus.y + Math.sin(pitch) * distance, focus.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    camera.lookAt(focus);
    world.walker.position.set(player.x, motion ? Math.abs(Math.sin(steps)) * 0.065 : 0, player.z);
    world.walker.rotation.y = facing;
    world.shadow.position.x = player.x; world.shadow.position.z = player.z;
    world.update(time, player, motion, dt, vertical, camera);
    const nearNote = enabled && !drift && Math.hypot(player.x - NOTE.x, player.z - NOTE.z) < 2.35;
    if (note) note.hidden = !nearNote;
    renderer.setRenderTarget(target); renderer.render(world.scene, camera);
    sceneRender = { ...renderer.info.render };
    renderer.setRenderTarget(null); renderer.render(screen, outputCamera);
  }
  function frame(now: number): void {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    let motion = 0;
    if (drift) {
      drift.elapsed += dt;
      const t = smooth(drift.elapsed / 1.8);
      player.set(THREE.MathUtils.lerp(drift.x, HOME.x, t), 0, THREE.MathUtils.lerp(drift.z, HOME.z, t));
      wantedYaw = THREE.MathUtils.lerp(drift.yaw, HOME_YAW, t);
      if (t >= 1) { drift = null; setPhase("rest"); }
    } else {
      const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      const strafe = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      wantedYaw += (Number(keys.has("KeyE")) - Number(keys.has("KeyQ"))) * dt * 1.5;
      const zoomDirection = Number(keys.has("Minus") || keys.has("NumpadSubtract")) - Number(keys.has("Equal") || keys.has("NumpadAdd"));
      if (zoomDirection) wantedVertical = clampZoom(wantedVertical * Math.exp(zoomDirection * dt * 1.8), rest.vertical);
      const direction = relativeMove(forward, strafe, yaw);
      const speed = SPEED * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.6 : 1);
      const next = movePlayer(player, { x: direction.x * speed * dt, z: direction.z * speed * dt }, world.obstacles, 18);
      motion = Math.hypot(next.x - player.x, next.z - player.z) / Math.max(dt, 0.001);
      player.set(next.x, 0, next.z);
      if (motion > 0.1) { facing = Math.atan2(direction.x, direction.z); steps += motion * dt * 8; }
      if (Math.hypot(player.x - HOME.x, player.z - HOME.z) > 0.7 && phase !== "away") setPhase("away");
    }
    yaw += (wantedYaw - yaw) * (1 - Math.exp(-dt * 9));
    draw(now / 1000, motion, dt);
    if (enabled && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function syncLoop(): void {
    if (enabled && !document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else if ((!enabled || document.hidden) && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function resize(): void {
    const width = innerWidth, height = innerHeight;
    renderer.setSize(width, height);
    const hero = document.querySelector(".home-intro");
    let right = 0;
    if (hero) {
      const nodes = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      while (nodes.nextNode()) {
        if (!nodes.currentNode.textContent?.trim()) continue;
        range.selectNodeContents(nodes.currentNode);
        for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
      }
    }
    rest = restFraming(width, height,
      { right, bottom: hero?.getBoundingClientRect().bottom ?? height * 0.38 },
      document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 64,
      document.querySelector(".site-footer")?.getBoundingClientRect().top ?? height * 0.84);
    if (!enabled) draw(40, 0, 0);
  }
  function sync(): void {
    enabled = wide.matches && !reduced.matches;
    canvas.toggleAttribute("data-walkable", enabled);
    keys.clear(); dragging = false; drift = null;
    zoom = 0; zoomTransition = { from: 0, to: 0, elapsed: 1.05 };
    exploreVertical = wantedVertical = 24;
    player.set(HOME.x, 0, HOME.z); yaw = wantedYaw = HOME_YAW;
    facing = Math.PI; setPhase("rest");
    resize(); syncLoop();
  }
  function engage(): void {
    if (drift) drift = null;
    zoomTo(1);
    if (phase === "rest" || phase === "drifting") setPhase("engaged");
  }
  window.addEventListener("keydown", (e) => {
    if (!enabled || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
    if (e.code === "Escape") {
      e.preventDefault(); keys.clear(); dragging = false;
      drift = { elapsed: 0, x: player.x, z: player.z, yaw };
      wantedYaw = yaw; zoomTo(0); setPhase("drifting"); return;
    }
    if (!MOVE_KEYS.has(e.code) && !ZOOM_KEYS.has(e.code)) return;
    e.preventDefault(); engage(); keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); dragging = false; });
  canvas.addEventListener("wheel", (e) => {
    if (!enabled) return;
    e.preventDefault(); engage();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    wantedVertical = clampZoom(wantedVertical * Math.exp(Math.max(-1, Math.min(1, delta * (e.ctrlKey ? 0.012 : 0.002)))), rest.vertical);
  }, { passive: false });
  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled || e.button !== 0) return;
    engage(); dragging = true; dragX = e.clientX; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!enabled || !dragging) return;
    wantedYaw -= (e.clientX - dragX) * 0.008; dragX = e.clientX;
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", syncLoop);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); enabled = false; syncLoop(); canvas.style.opacity = "0"; });
  wide.addEventListener("change", sync); reduced.addEventListener("change", sync);
  void document.fonts.ready.then(resize);
  const hero = document.querySelector<HTMLElement>(".home-intro");
  if (hero) { prepareVapor(hero); new ResizeObserver(resize).observe(hero); }
  if (import.meta.env.DEV) {
    (window as unknown as { __island: unknown }).__island = {
      player,
      teleport(x: number, z: number) { player.set(x, 0, z); setPhase("away"); },
      rotate(angle: number) { wantedYaw = angle; },
      get yaw() { return yaw; },
      get enabled() { return enabled; },
      get zoom() { return zoom; },
      get vertical() { return exploreVertical; },
      get detailCount() { return world.detailCount; },
      get framing() { return rest; },
      get renderInfo() { return sceneRender; },
      get memory() { return renderer.info.memory; },
    };
  }
  sync();
}
