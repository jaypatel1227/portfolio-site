import { it } from "node:test";
import assert from "node:assert/strict";
import { TRACK, trackContact, trackPoint, carryDelta } from "./circuit.ts";
import { createPlayer } from "../player/controller.ts";
import { HOME } from "./layout.ts";

void it("keeps a stationary rider in either lane through both turns and across the seam", () => {
  for (const offset of [-0.29, 0, 0.29]) {
    const start = trackPoint(0.85, offset), actor = createPlayer(start, []);
    const frames = 300, dt = TRACK.length / TRACK.speed / frames;
    for (let i = 0; i < frames; i++) {
      const delta = carryDelta(actor.position, dt); assert.ok(delta);
      actor.carry(delta);
      const expected = trackPoint(0.85 + (i + 1) * TRACK.speed * dt, offset);
      assert.ok(Math.hypot(actor.position.x - expected.x, actor.position.z - expected.z) < 1e-9);
    }
    assert.equal(actor.steps, 0);
    assert.ok(Math.hypot(actor.position.x - start.x, actor.position.z - start.z) < 1e-9);
  }
});
void it("allows stepping off a moving belt and running home without its force", () => {
  const actor = createPlayer(HOME, []), on = trackPoint(0);
  assert.equal(trackContact(HOME), null);
  actor.carry({ x: on.x - HOME.x, z: on.z - HOME.z });
  for (let i = 0; i < 15; i++) {
    actor.move(-1, 0, 0, false, 1 / 60);
    const delta = carryDelta(actor.position, 1 / 60);
    if (delta) actor.carry(delta);
  }
  assert.equal(carryDelta(actor.position, 1 / 60), null);
  for (let i = 0; i < 120; i++) actor.runHome(1 / 60);
  assert.ok(actor.atHome);
  for (const s of [0, TRACK.length / 4, TRACK.length / 2, TRACK.length - 0.1])
    assert.equal(trackContact(trackPoint(s, TRACK.halfWidth + 0.02)), null);
});
