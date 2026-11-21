import { CAMERA } from "../config";
import { controlAxes, controlCode, isModifier, wheelExponent } from "./controls";

interface Actions {
  enabled: () => boolean;
  engaged: () => boolean;
  engage: (zooming?: boolean) => void;
  home: () => void;
  orbit: (delta: number) => void;
  magnify: (exponent: number) => void;
}
export function bindInput(canvas: HTMLCanvasElement, actions: Actions, signal: AbortSignal) {
  const keys = new Map<string, string>();
  let dragging = false, dragX = 0;
  const clear = (): void => { keys.clear(); dragging = false; };
  window.addEventListener("keydown", (e) => {
    if (!actions.enabled() || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
    if (e.code === "Escape") { e.preventDefault(); clear(); actions.home(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const code = controlCode(e.code, e.key);
    if (!code) return;
    keys.set(e.code, code);
    if (isModifier(code)) return;
    e.preventDefault(); actions.engage(controlAxes(new Set([code])).zoom !== 0);
  }, { signal });
  window.addEventListener("keyup", (e) => keys.delete(e.code), { signal });
  window.addEventListener("blur", clear, { signal });
  canvas.addEventListener("wheel", (e) => {
    if (!actions.enabled() || !actions.engaged()) return;
    e.preventDefault(); actions.magnify(wheelExponent(e.deltaY, e.deltaMode, e.ctrlKey, innerHeight));
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
  return { clear, axes: () => controlAxes(new Set(keys.values())) };
}
