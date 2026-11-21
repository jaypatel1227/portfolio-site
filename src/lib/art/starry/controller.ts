/** A small ground-following walk; escape returns the painting to its frame. */
import * as THREE from "three";
import { heightAt } from "./terrain";

type Phase = "rest" | "engaged" | "away" | "drifting";
const HOME = new THREE.Vector3(0, 0, 20);
const HOME_PITCH = 0.14;
const EYE = 2.1;
const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "ShiftLeft", "ShiftRight"]);

export function walking(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
  const position = HOME.clone();
  const keys = new Set<string>();
  let yaw = 0;
  let pitch = HOME_PITCH;
  let enabled = false;
  let dragging = false;
  let phase: Phase = "rest";
  let drift = 0;
  const from = new THREE.Vector3();
  let fromYaw = 0;
  let fromPitch = 0;

  function report(next: Phase): void {
    phase = next;
    document.body.dataset.glade = next;
  }
  function pose(): void {
    camera.position.set(position.x, heightAt(position.x, position.z) + EYE, position.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
  function reset(): void {
    position.copy(HOME);
    yaw = 0;
    pitch = HOME_PITCH;
    drift = 0;
    keys.clear();
    report("rest");
    pose();
  }
  function goHome(): void {
    if (!enabled) return reset();
    from.copy(position);
    fromYaw = yaw;
    fromPitch = pitch;
    drift = 0.001;
    keys.clear();
    dragging = false;
    report("drifting");
  }
  window.addEventListener("keydown", event => {
    if (!enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.code === "Escape") {
      goHome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (!movement.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    drift = 0;
    if (phase === "rest" || phase === "drifting") report("engaged");
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  window.addEventListener("blur", () => { keys.clear(); dragging = false; });
  canvas.addEventListener("pointerdown", event => {
    if (!enabled || event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    dragging = true;
    drift = 0;
    if (phase === "rest" || phase === "drifting") report("engaged");
  });
  canvas.addEventListener("pointermove", event => {
    if (!enabled || !dragging) return;
    yaw -= event.movementX * 0.003;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.003, -1.15, 1.25);
  });
  const release = (): void => { dragging = false; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  reset();

  return {
    position,
    setEnabled(on: boolean) { enabled = on; dragging = false; reset(); },
    goHome,
    teleport(x: number, z: number) {
      position.set(x, 0, z);
      if (Math.hypot(x, z) > 55) position.multiplyScalar(55 / Math.hypot(x, z));
      drift = 0;
      report("away");
      pose();
    },
    look(nextYaw: number, nextPitch: number) {
      yaw = nextYaw;
      pitch = THREE.MathUtils.clamp(nextPitch, -1.15, 1.25);
      pose();
    },
    step(dt: number) {
      if (drift > 0) {
        drift += dt / 1.9;
        const t = Math.min(1, drift);
        const ease = t * t * (3 - 2 * t);
        position.lerpVectors(from, HOME, ease);
        yaw = THREE.MathUtils.lerp(fromYaw, 0, ease);
        pitch = THREE.MathUtils.lerp(fromPitch, HOME_PITCH, ease);
        if (t === 1) reset();
      } else if (enabled) {
        const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
        const sideways = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
        const length = Math.hypot(forward, sideways) || 1;
        const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7 : 4;
        const x = position.x + (sideways * Math.cos(yaw) - forward * Math.sin(yaw)) / length * speed * dt;
        const z = position.z + (-forward * Math.cos(yaw) - sideways * Math.sin(yaw)) / length * speed * dt;
        if (Math.hypot(x, z) < 55 && Math.hypot(x + 10.5, z) > 2.9 && Math.hypot(x - 14, z + 15) > 2.1) {
          position.set(x, 0, z);
        }
        if (position.distanceTo(HOME) > 0.7 && phase !== "away") report("away");
      }
      pose();
    },
  };
}
