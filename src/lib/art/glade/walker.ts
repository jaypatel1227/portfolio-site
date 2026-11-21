/**
 * First-person walking: wasd / arrows walk (the first step grabs pointer
 * lock for mouse look, drag-to-look as fallback), shift to hurry, escape
 * to drift back to the home framing.
 */
import * as THREE from "three";
import { clamp, easeInOutCubic, lerp, shortestAngle } from "./math";
import type { World } from "./world";

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4.2;
const HURRY_SPEED = 7.0;
const BODY_RADIUS = 0.42;
const BASE_FOV = 68;
const MAX_PITCH = 1.25;
const DRIFT_SECONDS = 1.9;
/** metres walked before the walker counts as having left home */
const AWAY_DISTANCE = 0.7;

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

/** rest: at home, untouched. engaged: input taken. away: walked off. drifting: easing home. */
export type WalkPhase = "rest" | "engaged" | "away" | "drifting";

export interface Walker {
  readonly camera: THREE.PerspectiveCamera;
  /** the walker's feet */
  readonly player: THREE.Vector3;
  /** 0 standing still .. 1 walking, eased */
  readonly motion: number;
  /** start or stop listening for input; disabling puts the walker and camera back home */
  setEnabled(on: boolean): void;
  /** advances the walk and places the camera */
  step(dt: number, time: number): void;
  teleport(x: number, z: number): void;
  look(yaw: number, pitch: number): void;
  goHome(): void;
}

export function createWalker(
  canvas: HTMLCanvasElement,
  world: World,
  onPhase: (phase: WalkPhase) => void
): Walker {
  const homeGround = world.heightAt(world.home.x, world.home.z);
  const homeEye = homeGround + EYE_HEIGHT;
  const homeFeet = new THREE.Vector3(world.home.x, homeGround, world.home.z);
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 900);
  camera.rotation.order = "YXZ";
  const frameHome = (): void => {
    camera.fov = BASE_FOV;
    camera.position.set(world.home.x, homeEye, world.home.z);
    camera.lookAt(world.home.lookAt);
    camera.updateProjectionMatrix();
  };
  frameHome();
  const homeYaw = camera.rotation.y;
  const homePitch = camera.rotation.x;

  const keys = new Set<string>();
  const player = homeFeet.clone();
  const vel = new THREE.Vector3();
  const wish = new THREE.Vector3();
  let yaw = homeYaw;
  let pitch = homePitch;
  let eyeY = homeEye;
  let bobPhase = 0;
  let distanceMoved = 0;
  let motion = 0;

  let enabled = false;
  let locked = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastLockAttempt = 0;

  let engaged = false;
  let away = false;
  const drift = {
    active: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    fromEyeY: 0,
    fromYaw: 0,
    fromPitch: 0,
  };

  let phase: WalkPhase = "rest";
  const syncPhase = (): void => {
    const next = drift.active ? "drifting" : away ? "away" : engaged ? "engaged" : "rest";
    if (next === phase) return;
    phase = next;
    onPhase(phase);
  };

  const goHome = (): void => {
    player.copy(homeFeet);
    eyeY = homeEye;
    yaw = homeYaw;
    pitch = homePitch;
    vel.set(0, 0, 0);
    distanceMoved = 0;
    motion = 0;
    drift.active = false;
    away = false;
    syncPhase();
  };

  const startDrift = (): void => {
    if (drift.active) return;
    drift.active = true;
    drift.t = 0;
    drift.fromPos.copy(player);
    drift.fromEyeY = eyeY;
    drift.fromYaw = yaw;
    drift.fromPitch = pitch;
    engaged = false;
    away = false;
    keys.clear();
    syncPhase();
  };
  const cancelDrift = (): void => {
    drift.active = false;
    engaged = true;
    syncPhase();
  };

  const tryLock = (): void => {
    const now = performance.now();
    if (now - lastLockAttempt < 800) return;
    lastLockAttempt = now;
    // a denied lock is fine; drag-look still works
    void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

    if (e.code === "Escape") {
      startDrift();
      return;
    }
    if (!MOVE_CODES.has(e.code)) return;
    e.preventDefault();

    if (!locked && !e.repeat) tryLock();
    if (drift.active) cancelDrift();
    keys.add(e.code);
    engaged = true;
    syncPhase();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
  };
  const onBlur = (): void => {
    keys.clear();
  };
  const onMouseDown = (e: MouseEvent): void => {
    if (drift.active) cancelDrift();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = (): void => {
    dragging = false;
  };
  const onMouseMove = (e: MouseEvent): void => {
    if (locked) {
      yaw -= e.movementX * 0.0023;
      pitch = clamp(pitch - e.movementY * 0.0021, -MAX_PITCH, MAX_PITCH);
    } else if (dragging) {
      yaw -= (e.clientX - lastX) * 0.0042;
      pitch = clamp(pitch - (e.clientY - lastY) * 0.0038, -MAX_PITCH, MAX_PITCH);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  const onPointerLockChange = (): void => {
    const wasLocked = locked;
    locked = document.pointerLockElement === canvas;
    if (locked) {
      // held keys stay held: the key press that asked for the lock is
      // already registered and clearing it would swallow the first step
      engaged = true;
      syncPhase();
    } else if (wasLocked) {
      engaged = false;
      syncPhase();
      startDrift();
    }
  };

  const listeners: Array<[EventTarget, string, EventListener]> = [
    [window, "keydown", onKeyDown as EventListener],
    [window, "keyup", onKeyUp as EventListener],
    [window, "blur", onBlur],
    [window, "mousemove", onMouseMove as EventListener],
    [window, "mouseup", onMouseUp],
    [canvas, "mousedown", onMouseDown as EventListener],
    [document, "pointerlockchange", onPointerLockChange],
  ];
  const setEnabled = (on: boolean): void => {
    if (on === enabled) return;
    enabled = on;
    for (const [target, type, fn] of listeners) {
      if (on) target.addEventListener(type, fn);
      else target.removeEventListener(type, fn);
    }
    if (on) return;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    locked = false;
    dragging = false;
    engaged = false;
    keys.clear();
    goHome();
    frameHome();
  };

  const walk = (dt: number): void => {
    const forward =
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const strafe =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? HURRY_SPEED : WALK_SPEED;

    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    wish.set(strafe * cos - forward * sin, 0, -forward * cos - strafe * sin);
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize().multiplyScalar(speed);
    vel.lerp(wish, Math.min(1, dt * (moving ? 9.5 : 11)));

    const stepLen = Math.hypot(vel.x, vel.z) * dt;
    if (stepLen > 0.0004) {
      player.x += vel.x * dt;
      player.z += vel.z * dt;
      distanceMoved += stepLen;
      if (distanceMoved > AWAY_DISTANCE) away = true;
    }

    for (const c of world.collisions) {
      const dx = player.x - c.x;
      const dz = player.z - c.z;
      const d2 = dx * dx + dz * dz;
      const rr = c.r + BODY_RADIUS;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (rr - d) / d;
        player.x += dx * push;
        player.z += dz * push;
      }
    }
    const fromCentre = Math.hypot(player.x, player.z);
    if (fromCentre > world.boundRadius) {
      player.x *= world.boundRadius / fromCentre;
      player.z *= world.boundRadius / fromCentre;
    }

    // terrain following: walkers only, no jumping
    player.y = world.heightAt(player.x, player.z);
    eyeY += (player.y + EYE_HEIGHT - eyeY) * Math.min(1, dt * 18);
  };

  const driftHome = (dt: number): void => {
    drift.t += dt / DRIFT_SECONDS;
    const k = easeInOutCubic(Math.min(1, drift.t));
    player.lerpVectors(drift.fromPos, homeFeet, k);
    eyeY = lerp(drift.fromEyeY, homeEye, k);
    yaw = drift.fromYaw + shortestAngle(drift.fromYaw, homeYaw) * k;
    pitch = lerp(drift.fromPitch, homePitch, k);
    vel.set(0, 0, 0);
    if (drift.t >= 1) goHome();
  };

  const step = (dt: number, time: number): void => {
    const drifting = drift.active;
    if (drifting) driftHome(dt);
    else walk(dt);
    syncPhase();

    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.4) bobPhase += speed * dt * 1.9;
    const bob = Math.sin(bobPhase * 2) * 0.05 * clamp(speed / WALK_SPEED, 0, 1);
    const sway = Math.sin(time * 0.24) * 0.045 + Math.sin(time * 0.11 + 1.7) * 0.035;
    const lean = drifting ? 0 : (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const roll = Math.sin(time * 0.17) * 0.003 - lean * 0.012;

    camera.position.set(
      player.x + Math.cos(yaw) * sway * 0.12,
      eyeY + bob,
      player.z - Math.sin(yaw) * sway * 0.12
    );
    camera.rotation.set(pitch, yaw, roll);

    // fov eases with speed, stays close to neutral
    const targetFov = BASE_FOV + clamp(speed / HURRY_SPEED, 0, 1) * 2;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3.5);
      camera.updateProjectionMatrix();
    }

    const target = clamp(speed / WALK_SPEED, 0, 1);
    motion += (target - motion) * (target > motion ? dt * 2.4 : dt * 0.55);
  };

  return {
    camera,
    player,
    get motion() {
      return motion;
    },
    setEnabled,
    step,
    goHome,
    teleport(x, z) {
      player.set(x, world.heightAt(x, z), z);
      eyeY = player.y + EYE_HEIGHT;
    },
    look(y, p) {
      yaw = y;
      pitch = clamp(p, -MAX_PITCH, MAX_PITCH);
    },
  };
}
