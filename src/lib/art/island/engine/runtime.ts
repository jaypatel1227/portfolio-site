import { createCamera, type RestFrame } from "../camera/controller";
import { pixelScale } from "../camera/zoom";
import { CAMERA, PLAYER, SEED, STILL_TIME } from "../config";
import { bindInput } from "../input";
import { smooth } from "../math";
import { createPlayer } from "../player/controller";
import { createWorld, HOME, NOTE } from "../world";
import { createRenderer } from "./renderer";

export type Phase = "rest" | "engaged" | "away" | "drifting";
interface Bridge { phase: (phase: Phase) => void; note: (visible: boolean) => void }

export function createRuntime(canvas: HTMLCanvasElement, bridge: Bridge, signal: AbortSignal) {
  const renderer = createRenderer(canvas), view = createCamera(), world = createWorld(SEED);
  view.camera.add(world.sky); world.scene.add(view.camera);
  const actor = createPlayer(HOME, world.obstacles), player = actor.position;
  let enabled = false, phase: Phase = "rest", width = innerWidth, height = innerHeight, pixels = 3;
  let drift: { elapsed: number; x: number; z: number; yaw: number } | null = null;
  const setPhase = (next: Phase): void => { phase = next; bridge.phase(next); };
  const input = bindInput(canvas, {
    enabled: () => enabled,
    engaged: () => phase === "engaged" || phase === "away",
    engage(zooming = false) { drift = null; view.transition(1, zooming); if (phase === "rest" || phase === "drifting") setPhase("engaged"); },
    home() { drift = { elapsed: 0, ...player, yaw: view.yaw }; view.rotate(view.yaw); view.transition(0); setPhase("drifting"); },
    orbit: (delta) => view.orbit(delta), magnify: (exponent) => view.magnify(exponent),
  }, signal);
  function draw(time: number, motion: number, dt: number): void {
    const vertical = view.update(dt, player, width, height);
    world.setView(view.camera);
    world.walker.position.set(player.x, motion ? Math.abs(Math.sin(actor.steps)) * PLAYER.bobHeight : 0, player.z);
    world.walker.rotation.y = actor.facing;
    world.shadow.position.x = player.x; world.shadow.position.z = player.z;
    world.update(time, player, motion, dt, vertical, view.camera);
    bridge.note(enabled && !drift && Math.hypot(player.x - NOTE.x, player.z - NOTE.z) < PLAYER.noteDistance);
    pixels = pixelScale(vertical, width, pixels);
    renderer.render(world.scene, view.camera, pixels);
  }
  function frame(now: number, dt: number): void {
    let motion = 0;
    if (drift) {
      drift.elapsed += dt;
      const t = smooth(drift.elapsed / PLAYER.driftSeconds);
      player.x = drift.x + (HOME.x - drift.x) * t;
      player.z = drift.z + (HOME.z - drift.z) * t;
      view.rotate(drift.yaw + (CAMERA.homeYaw - drift.yaw) * t);
      if (t >= 1) { drift = null; setPhase("rest"); }
    } else {
      const axes = input.axes();
      view.orbit(axes.orbit * dt * CAMERA.orbitSpeed);
      if (axes.zoom) view.magnify(axes.zoom * dt * CAMERA.keyZoomSpeed);
      motion = actor.move(axes.forward, axes.strafe, view.yaw, axes.sprint, dt);
      if (Math.hypot(player.x - HOME.x, player.z - HOME.z) > PLAYER.awayDistance && phase !== "away") setPhase("away");
    }
    draw(now / 1000, motion, dt);
  }
  return {
    reset(active: boolean) { enabled = active; input.clear(); drift = null; view.reset(); actor.reset(); setPhase("rest"); },
    run(visible: boolean) { renderer.setRunning(enabled && visible, frame); },
    resize(w: number, h: number, rest: RestFrame) {
      width = w; height = h; renderer.resize(w, h); view.resize(rest);
      if (!enabled) draw(STILL_TIME, 0, 0);
    },
    dispose() { renderer.dispose(); world.dispose(); },
    debug: {
      player,
      camera: view.camera,
      teleport(x: number, z: number) { player.x = x; player.z = z; setPhase("away"); },
      rotate(angle: number) { view.rotate(angle); },
      get yaw() { return view.yaw; }, get enabled() { return enabled; },
      get zoom() { return view.zoom; }, get vertical() { return view.vertical; },
      get detailCount() { return world.detailCount; }, get framing() { return view.framing; },
      get detailState() { return world.detailState; }, get resolution() { return renderer.resolution; },
      get renderInfo() { return renderer.info; }, get memory() { return renderer.memory; },
    },
  };
}
