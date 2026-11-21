const ZOOM_KEYS = new Set(["Equal", "Minus", "NumpadAdd", "NumpadSubtract"]);
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"]);
export function isControl(code: string): boolean { return MOVE_KEYS.has(code) || ZOOM_KEYS.has(code); }
export function isModifier(code: string): boolean { return code === "ShiftLeft" || code === "ShiftRight"; }
export function controlCode(code: string, key: string): string | null {
  if (key === "+" || key === "=") return "Equal";
  if (key === "-" || key === "_") return "Minus";
  return isControl(code) ? code : null;
}
export function controlAxes(keys: ReadonlySet<string>) {
  return {
    forward: Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown")),
    strafe: Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft")),
    orbit: Number(keys.has("KeyE")) - Number(keys.has("KeyQ")),
    zoom: Number(keys.has("Minus") || keys.has("NumpadSubtract")) - Number(keys.has("Equal") || keys.has("NumpadAdd")),
    sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
  };
}
export function wheelExponent(deltaY: number, mode: number, pinch: boolean, height: number): number {
  const delta = deltaY * (mode === 1 ? 16 : mode === 2 ? height : 1);
  return Math.max(-1, Math.min(1, delta * (pinch ? 0.012 : 0.002)));
}
