/**
 * "The Dark Glade" - the walkable first-person ambient piece behind the
 * home hero.
 *
 * A dark forest at the far edge of everything: rolling hills, a fogged
 * conifer field, a path leading to one enormous old tree, a moonlit
 * sky with faint stars, mist, fireflies. Nothing jumps, nothing flashes.
 *
 *   - wasd / arrows walk (first step grabs pointer lock for fps look,
 *     drag-to-look as fallback), shift to hurry, escape to drift back
 *     to the hero framing
 *   - bloom and a light film grade so the lights actually glow
 *
 * Reduced motion renders a single composed frame. Paused off-screen /
 * hidden. DPR capped. Canvas is aria-hidden.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import {
  BOUND_RADIUS,
  TREE_LOOK,
  TREE_POS,
  HOME_POS,
  HURRY_SPEED,
  PLAYER_HEIGHT,
  WALK_SPEED,
  clamp,
  easeInOutCubic,
  lerp,
  makeGroundHeight,
  shortestAngle,
  type Collision,
} from "./glade-util";
import { buildGreatTree, buildGround, buildLandmarks, buildMist, buildNote, buildRidge, buildSky, buildTrees } from "./glade-world";
import { buildFireflies, buildFlora, buildSkyAccents } from "./glade-life";

/* ------------------------------------------------------------------ */
/* film grade                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

export function bootGlade(canvas: HTMLCanvasElement): void {
  const gate = window.matchMedia("(min-width: 64rem)");
  let teardown: (() => void) | null = null;

  const enable = (): void => {
    if (teardown) return;
    teardown = setupGlade(canvas);
  };
  const disable = (): void => {
    if (!teardown) return;
    teardown();
    teardown = null;
  };
  // the full walkable scene needs a wide viewport, but phones still get a
  // composed still frame rather than an empty gradient
  const resync = (): void => {
    disable();
    enable();
  };

  gate.addEventListener?.("change", resync);
  enable();
}

/** builds the world and returns a teardown that idles it */
function setupGlade(canvas: HTMLCanvasElement): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // narrow screens get one beautifully composed still frame: no controls,
  // no per-frame cost, but the glade still carries the hero
  const still = reduced || window.matchMedia("(max-width: 63.99rem)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
  } catch {
    canvas.style.display = "none";
    return () => undefined;
  }

  renderer.setClearColor(0x080a0f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const seed = Number(canvas.dataset.seed ?? 2026) || 2026;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x131a25, 22, 132);

  const groundHeightAt = makeGroundHeight(seed);
  const homeGround = groundHeightAt(HOME_POS.x, HOME_POS.z);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);
  camera.rotation.order = "YXZ";
  camera.position.set(HOME_POS.x, homeGround + PLAYER_HEIGHT, HOME_POS.z);
  camera.lookAt(TREE_LOOK);
  const HOME_YAW = camera.rotation.y;
  const HOME_PITCH = camera.rotation.x;

  /* lights */
  scene.add(new THREE.HemisphereLight(0x1e2c40, 0x070605, 0.48));
  const moonLight = new THREE.DirectionalLight(0xa8bfe4, 1.05);
  moonLight.position.set(-90, 120, 40);
  scene.add(moonLight);
  const rim = new THREE.DirectionalLight(0x46587a, 0.3);
  rim.position.set(60, 40, -90);
  scene.add(rim);
  // a soft moon bounce from behind the viewer, so the near grass and path
  // keep some shape instead of falling to pure black
  const fill = new THREE.DirectionalLight(0xaab9d6, 0.13);
  fill.position.set(14, 26, 42);
  scene.add(fill);

  /* world */
  const sky = buildSky(scene, seed);
  buildRidge(scene, seed ^ 0x0d1d);
  const ground = buildGround(scene, seed, groundHeightAt);

  const collisions: Collision[] = [{ x: TREE_POS.x, z: TREE_POS.z, r: 2.7 }];
  const trees = buildTrees(scene, seed ^ 0x77aa, collisions, groundHeightAt);
  const greatTree = buildGreatTree(
    scene,
    seed ^ 0x310e,
    groundHeightAt(TREE_POS.x, TREE_POS.z)
  );
  const mist = buildMist(scene, seed);
  const skyAccents = buildSkyAccents(scene, seed);
  const fireflies = buildFireflies(scene, seed ^ 0x51f1);
  const flora = buildFlora(scene, seed ^ 0x2c4d, groundHeightAt, collisions);
  buildLandmarks(scene, seed ^ 0x5eed, groundHeightAt, collisions);
  buildNote(scene, groundHeightAt);

  /* post */
  const size = new THREE.Vector2(1, 1);
  renderer.getSize(size);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.72, 0.85);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  /* ---------------------------------------------------------------- */
  /* control state                                                     */
  /* ---------------------------------------------------------------- */

  const keys = new Set<string>();
  let yaw = HOME_YAW;
  let pitch = HOME_PITCH;
  const player = new THREE.Vector3(HOME_POS.x, homeGround, HOME_POS.z);
  const vel = new THREE.Vector3();
  let eyeY = homeGround + PLAYER_HEIGHT;
  let bobPhase = 0;
  let distanceMoved = 0;
  let moveAuthority = 0;
  let locked = false;
  let wasLocked = false;

  const tween = {
    active: false,
    t: 0,
    dur: 1.9,
    fromPos: new THREE.Vector3(),
    fromEyeY: 0,
    fromYaw: 0,
    fromPitch: 0,
  };

  const markWandering = (): void => {
    document.body.classList.add("glade-wandering");
  };
  const clearWandering = (): void => {
    document.body.classList.remove("glade-wandering");
  };
  const startDriftBack = (): void => {
    if (tween.active) return;
    tween.active = true;
    tween.t = 0;
    tween.fromPos.copy(player);
    tween.fromEyeY = eyeY;
    tween.fromYaw = yaw;
    tween.fromPitch = pitch;
    clearWandering();
    document.body.classList.remove("glade-away");
    document.body.classList.add("glade-drifting");
    keys.clear();
  };
  const cancelDrift = (): void => {
    tween.active = false;
    document.body.classList.remove("glade-drifting");
    document.body.classList.add("glade-wandering");
  };

  const MOVE_CODES = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
  ]);
  let lastLockAttempt = 0;
  const tryLock = (): void => {
    if (locked) return;
    const now = performance.now();
    if (now - lastLockAttempt < 800) return;
    lastLockAttempt = now;
    try {
      const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    } catch {
      // lock denied; drag-look still works
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

    const code = e.code;
    if (code === "Escape") {
      if (!tween.active && !still) startDriftBack();
      return;
    }
    if (!MOVE_CODES.has(code)) return;
    e.preventDefault();

    if (!locked && !e.repeat) tryLock();
    if (tween.active) cancelDrift();
    keys.add(code);
    markWandering();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
  };
  const onBlur = (): void => {
    keys.clear();
  };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const onMouseDown = (e: MouseEvent): void => {
    if (still) return;
    if (tween.active) cancelDrift();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = (): void => {
    dragging = false;
  };
  const onPointerLockChange = (): void => {
    locked = document.pointerLockElement === canvas;
    if (locked) {
      wasLocked = true;
      markWandering();
      // do not clear held keys here: the key press that requested the lock is
      // already registered and would otherwise swallow the first step
    } else {
      clearWandering();
      if (wasLocked && !tween.active && !still) startDriftBack();
    }
  };
  const onMouseMove = (e: MouseEvent): void => {
    if (locked) {
      yaw -= e.movementX * 0.0023;
      pitch = clamp(pitch - e.movementY * 0.0021, -1.25, 1.25);
      return;
    }
    if (dragging) {
      yaw -= (e.clientX - lastX) * 0.0042;
      pitch = clamp(pitch - (e.clientY - lastY) * 0.0038, -1.25, 1.25);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  const onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    if (still) composer.render();
  };

  const onContextLost = (e: Event): void => {
    e.preventDefault();
    canvas.style.opacity = "0";
  };

  let raf = 0;
  let running = true;
  let pageVisible = true;
  let inView = true;
  let last = performance.now();

  const teardown = (): void => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (io) io.disconnect();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("visibilitychange", onVisibility);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    canvas.style.display = "none";
    document.body.classList.remove("glade-away", "glade-wandering", "glade-drifting");
    const dbgHost = window as unknown as { __glade?: unknown };
    if (dbgHost.__glade) delete dbgHost.__glade;

    const disposed = new Set<THREE.Material>();
    scene.traverse((obj) => {
      const target = obj as unknown as {
        type?: string;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (target.type !== "Sprite" && target.type !== "Points") target.geometry?.dispose();
      const mats = Array.isArray(target.material)
        ? target.material
        : target.material
          ? [target.material]
          : [];
      for (const mat of mats) {
        if (disposed.has(mat)) continue;
        disposed.add(mat);
        const withMap = mat as THREE.Material & { map?: THREE.Texture | null };
        withMap.map?.dispose?.();
        mat.dispose();
      }
    });
    composer.dispose();
    renderer.dispose();
  };

  if (!still) {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("pointerlockchange", onPointerLockChange);
  }
  window.addEventListener("resize", onResize);
  canvas.addEventListener("webglcontextlost", onContextLost);
  onResize();

  /* ---------------------------------------------------------------- */
  /* frame loop                                                        */
  /* ---------------------------------------------------------------- */

  let fps = 60;
  let fpsAccum = 0;
  let fpsFrames = 0;

  const step = (now: number): void => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum > 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
    }

    /* drift back to the hero framing */
    if (tween.active) {
      tween.t += dt / tween.dur;
      const k = easeInOutCubic(Math.min(1, tween.t));
      player.lerpVectors(tween.fromPos, new THREE.Vector3(HOME_POS.x, homeGround, HOME_POS.z), k);
      eyeY = lerp(tween.fromEyeY, homeGround + PLAYER_HEIGHT, k);
      yaw = tween.fromYaw + shortestAngle(tween.fromYaw, HOME_YAW) * k;
      pitch = lerp(tween.fromPitch, HOME_PITCH, k);
      vel.set(0, 0, 0);
      if (tween.t >= 1) {
        tween.active = false;
        player.set(HOME_POS.x, homeGround, HOME_POS.z);
        eyeY = homeGround + PLAYER_HEIGHT;
        yaw = HOME_YAW;
        pitch = HOME_PITCH;
        distanceMoved = 0;
        moveAuthority = 0;
        document.body.classList.remove("glade-drifting", "glade-away");
      }
    } else {
      /* movement */
      const forward =
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
      const strafe =
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
      const hurry = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const speed = hurry ? HURRY_SPEED : WALK_SPEED;

      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const wish = new THREE.Vector3(strafe * cos - forward * sin, 0, -forward * cos - strafe * sin);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
      const response = wish.lengthSq() > 0 ? 9.5 : 11;
      vel.lerp(wish, Math.min(1, dt * response));

      const stepLen = Math.hypot(vel.x, vel.z) * dt;
      if (stepLen > 0.0004) {
        player.x += vel.x * dt;
        player.z += vel.z * dt;
        distanceMoved += stepLen;
        if (distanceMoved > 0.7) document.body.classList.add("glade-away");
      }

      /* collisions: trees + roots + boulders + grove bound */
      for (const c of collisions) {
        const dx = player.x - c.x;
        const dz = player.z - c.z;
        const d2 = dx * dx + dz * dz;
        const rr = c.r + 0.42;
        if (d2 < rr * rr && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          player.x += dx * push;
          player.z += dz * push;
        }
      }
      const bound = Math.hypot(player.x, player.z);
      if (bound > BOUND_RADIUS) {
        player.x *= BOUND_RADIUS / bound;
        player.z *= BOUND_RADIUS / bound;
      }

      /* terrain following: the glade is walkers-only, no jumping */
      player.y = groundHeightAt(player.x, player.z);
    }

    /* head bob + camera */
    const speedNow = Math.hypot(vel.x, vel.z);
    if (speedNow > 0.4) bobPhase += speedNow * dt * 1.9;
    const bob = Math.sin(bobPhase * 2) * 0.05 * clamp(speedNow / WALK_SPEED, 0, 1);

    const targetEye = player.y + PLAYER_HEIGHT;
    if (!tween.active) {
      eyeY += (targetEye - eyeY) * Math.min(1, dt * 18);
    }

    const sway = Math.sin(t * 0.24) * 0.045 + Math.sin(t * 0.11 + 1.7) * 0.035;
    const roll =
      Math.sin(t * 0.17) * 0.003 +
      (tween.active ? 0 : -((keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0)) * 0.012);

    camera.position.set(
      player.x + Math.cos(yaw) * sway * 0.12,
      eyeY + bob,
      player.z - Math.sin(yaw) * sway * 0.12
    );
    camera.rotation.set(pitch, yaw, roll);

    /* fov eases with speed, stays close to neutral */
    const targetFov = 68 + clamp(speedNow / HURRY_SPEED, 0, 1) * 2;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3.5);
      camera.updateProjectionMatrix();
    }

    /* movement authority stills the sky accents */
    const authorityTarget = clamp(speedNow / WALK_SPEED, 0, 1);
    moveAuthority +=
      (authorityTarget - moveAuthority) * (authorityTarget > moveAuthority ? dt * 2.4 : dt * 0.55);

    /* world life */
    sky.update(camera, t);
    trees.update(t);
    greatTree.update(t);
    skyAccents.update(dt, t, player, moveAuthority);
    fireflies.update(dt, t, player);
    mist.update(dt, t, player);
    flora.update(t);

    composer.render();
    schedule();
  };

  const schedule = (): void => {
    if (!running || !pageVisible || !inView || still) return;
    if (!raf) raf = requestAnimationFrame(step);
  };

  const pause = (): void => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const resume = (): void => {
    if (running) return;
    running = true;
    last = performance.now();
    schedule();
  };

  const onVisibility = (): void => {
    pageVisible = document.visibilityState === "visible";
    if (pageVisible) resume();
    else pause();
  };
  document.addEventListener("visibilitychange", onVisibility);
  let io: IntersectionObserver | null = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((en) => en.isIntersecting);
        if (inView) resume();
        else pause();
      },
      { threshold: 0 }
    );
    io.observe(canvas);
  }

  /* debug hooks: handy for framing checks, harmless in production */
  const dbgHost = window as unknown as {
    __glade?: {
      state: () => Record<string, unknown>;
      look: (y: number, p: number) => void;
      teleport: (x: number, z: number) => void;
      home: () => void;
    };
  };
  dbgHost.__glade = {
    state: () => ({
      x: player.x,
      y: player.y,
      z: player.z,
      eyeY,
      yaw,
      pitch,
      fov: camera.fov,
      speed: Math.hypot(vel.x, vel.z),
      fps,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    }),
    look: (y, p) => {
      yaw = y;
      pitch = clamp(p, -1.25, 1.25);
    },
    teleport: (x, z) => {
      player.x = x;
      player.z = z;
      player.y = groundHeightAt(x, z);
      eyeY = player.y + PLAYER_HEIGHT;
    },
    home: () => {
      player.set(HOME_POS.x, homeGround, HOME_POS.z);
      eyeY = homeGround + PLAYER_HEIGHT;
      yaw = HOME_YAW;
      pitch = HOME_PITCH;
      vel.set(0, 0, 0);
      document.body.classList.remove("glade-away");
    },
  };

  /* ---------------------------------------------------------------- */
  /* still frame for reduced motion                                    */
  /* ---------------------------------------------------------------- */

  if (still) {
    sky.update(camera, 40);
    greatTree.update(40);
    skyAccents.update(0.016, 40, player, 0);
    fireflies.update(0.016, 40, player);
    mist.update(0.016, 40, player);
    flora.update(40);
    composer.render();
    canvas.style.opacity = "1";
    // a still frame should never intercept scrolling or taps on a phone
    canvas.style.pointerEvents = "none";
    canvas.style.cursor = "default";
    return teardown;
  }

  schedule();
  return teardown;
}