import { REDUCED_MEDIA, WALK_MEDIA } from "./config";
import { createRuntime } from "./engine/runtime";
import { measureRestFrame } from "./page/bounds";
import { prepareVapor } from "./page/vapor";

export function bootIsland(canvas: HTMLCanvasElement, note: HTMLElement | null): () => void {
  const events = new AbortController(), { signal } = events;
  const hero = document.querySelector<HTMLElement>(".home-intro");
  let runtime: ReturnType<typeof createRuntime>;
  try {
    runtime = createRuntime(canvas, {
      phase: (phase) => {
        document.body.dataset.island = phase;
        if (hero) hero.inert = phase === "engaged" || phase === "away";
      },
      note: (visible) => { if (note) note.hidden = !visible; },
    }, signal);
  } catch {
    canvas.style.display = "none";
    return () => {};
  }
  const wide = matchMedia(WALK_MEDIA), reduced = matchMedia(REDUCED_MEDIA);
  const resize = (): void => runtime.resize(innerWidth, innerHeight, measureRestFrame(hero, innerWidth, innerHeight));
  const syncLoop = (): void => runtime.run(!document.hidden);
  function sync(): void {
    const enabled = wide.matches && !reduced.matches;
    canvas.toggleAttribute("data-walkable", enabled);
    runtime.reset(enabled); resize(); syncLoop();
  }
  window.addEventListener("resize", resize, { signal });
  document.addEventListener("visibilitychange", syncLoop, { signal });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault(); runtime.reset(false); syncLoop(); canvas.style.opacity = "0";
  }, { signal });
  wide.addEventListener("change", sync, { signal }); reduced.addEventListener("change", sync, { signal });
  void document.fonts.ready.then(() => { if (!signal.aborted) resize(); });
  const observer = new ResizeObserver(resize);
  if (hero) { prepareVapor(hero); observer.observe(hero); }
  if (import.meta.env.DEV) (window as unknown as { __island: unknown }).__island = runtime.debug;
  sync();
  return () => { events.abort(); observer.disconnect(); runtime.dispose(); if (hero) hero.inert = false; delete document.body.dataset.island; };
}
