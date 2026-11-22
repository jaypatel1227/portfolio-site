import { createCamera, type RestFrame } from "../camera/controller";
import { pixelScale } from "../camera/zoom";
import { CAMERA, PLAYER, SEED, STILL_TIME } from "../config";
import { bindInput } from "../input";
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
  let returning = false, settling = 0;
  const setPhase = (next: Phase): void => { phase = next; bridge.phase(next); };
  const input = bindInput(canvas, {
    enabled: () => enabled,
    engaged: () => phase === "engaged" || phase === "away",
    engage(zooming = false) { returning = false; settling = 0; view.transition(1, zooming); if (phase === "rest" || phase === "drifting") setPhase("engaged"); },
    home() { if (phase !== "rest" && phase !== "drifting") returning = true; },
    orbit: (delta) => view.orbit(delta), magnify: (exponent) => view.magnify(exponent),
  }, signal);
  function draw(time: number, motion: number, dt: number): void {
    const vertical = view.update(dt, player, width, height);
    world.setView(view.camera);
    const floor = world.floorHeight(player);
    world.walker.position.set(player.x, floor + (motion ? Math.abs(Math.sin(actor.steps)) * PLAYER.bobHeight : 0), player.z);
    world.walker.rotation.y = actor.facing;
    world.shadow.position.set(player.x, floor + 0.05, player.z);
    world.update(time, player, motion, dt, vertical, view.camera);
    bridge.note(enabled && !returning && Math.hypot(player.x - NOTE.x, player.z - NOTE.z) < PLAYER.noteDistance);
    pixels = pixelScale(vertical, width, pixels);
    renderer.render(world.scene, view.camera, pixels);
  }
  function frame(now: number, dt: number): void {
    let motion = 0;
    if (returning) {
      motion = actor.runHome(dt);
      if (actor.atHome) {
        returning = false; settling = CAMERA.transitionSeconds;
        view.rotate(view.yaw + Math.atan2(Math.sin(CAMERA.homeYaw - view.yaw), Math.cos(CAMERA.homeYaw - view.yaw)));
        view.transition(0); setPhase("drifting");
      }
    } else if (phase === "drifting") {
      settling -= dt;
      if (settling <= 0) { actor.reset(); setPhase("rest"); }
    } else {
      const axes = input.axes();
      view.orbit(axes.orbit * dt * CAMERA.orbitSpeed);
      if (axes.zoom) view.magnify(axes.zoom * dt * CAMERA.keyZoomSpeed);
      motion = actor.move(axes.forward, axes.strafe, view.yaw, axes.sprint, dt);
      const carry = world.carryDelta(player, dt);
      if (carry) actor.carry(carry);
      if (Math.hypot(player.x - HOME.x, player.z - HOME.z) > PLAYER.awayDistance && phase !== "away") setPhase("away");
    }
    draw(now / 1000, motion, dt);
  }
  return {
    reset(active: boolean) { enabled = active; input.clear(); returning = false; settling = 0; view.reset(); actor.reset(); setPhase("rest"); },
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
