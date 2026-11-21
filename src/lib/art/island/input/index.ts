import { CAMERA } from "../config";
import { controlAxes, isControl, wheelExponent } from "./controls";

interface Actions {
  enabled: () => boolean;
  engage: () => void;
  home: () => void;
  orbit: (delta: number) => void;
  magnify: (exponent: number) => void;
}
export function bindInput(canvas: HTMLCanvasElement, actions: Actions, signal: AbortSignal) {
  const keys = new Set<string>();
  let dragging = false, dragX = 0;
  const clear = (): void => { keys.clear(); dragging = false; };
  window.addEventListener("keydown", (e) => {
    if (!actions.enabled() || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
    if (e.code === "Escape") { e.preventDefault(); clear(); actions.home(); return; }
    if (!isControl(e.code)) return;
    e.preventDefault(); actions.engage(); keys.add(e.code);
  }, { signal });
  window.addEventListener("keyup", (e) => keys.delete(e.code), { signal });
  window.addEventListener("blur", clear, { signal });
  canvas.addEventListener("wheel", (e) => {
    if (!actions.enabled()) return;
    e.preventDefault(); actions.engage(); actions.magnify(wheelExponent(e.deltaY, e.deltaMode, e.ctrlKey, innerHeight));
  }, { passive: false, signal });
  canvas.addEventListener("pointerdown", (e) => {
    if (!actions.enabled() || e.button !== 0) return;
    actions.engage(); dragging = true; dragX = e.clientX; canvas.setPointerCapture(e.pointerId);
  }, { signal });
  canvas.addEventListener("pointermove", (e) => {
    if (!actions.enabled() || !dragging) return;
    actions.orbit(-(e.clientX - dragX) * CAMERA.dragSpeed); dragX = e.clientX;
  }, { signal });
  canvas.addEventListener("pointerup", () => { dragging = false; }, { signal });
  canvas.addEventListener("pointercancel", () => { dragging = false; }, { signal });
  return { clear, axes: () => controlAxes(keys) };
}
