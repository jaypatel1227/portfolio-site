/**
 * Boots the glade behind the home hero. Wide screens get the walkable
 * scene; narrow screens and reduced motion get one composed still frame.
 */
import { gladeNote } from "../../../data/site";
import { createEngine } from "./engine";
import { createGlade } from "./scene";

/** every tree, stone and blade of grass is placed from this */
const SEED = 2026;

export function bootGlade(canvas: HTMLCanvasElement): void {
  // the page reacts to the walk through this one attribute; see Glade.astro
  const engine = createEngine(
    canvas,
    () => createGlade(SEED, gladeNote),
    (phase) => (document.body.dataset.glade = phase)
  );
  if (!engine) {
    canvas.style.display = "none";
    return;
  }

  if (import.meta.env.DEV) {
    // framing checks from the console: __glade.teleport(x, z), .look(yaw, pitch), .goHome()
    (window as unknown as { __glade: unknown }).__glade = engine.walker;
  }

  const wide = window.matchMedia("(min-width: 64rem)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = (): void => {
    const walkable = wide.matches && !reducedMotion.matches;
    canvas.toggleAttribute("data-walkable", walkable);
    engine.setWalkable(walkable);
  };
  wide.addEventListener("change", sync);
  reducedMotion.addEventListener("change", sync);
  sync();
}
