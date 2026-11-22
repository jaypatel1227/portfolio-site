import { it } from "node:test";
import assert from "node:assert/strict";
import { createPlayer } from "./controller.ts";

void it("moves and resets the character without a renderer", () => {
  const actor = createPlayer({ x: 0, z: 0 }, []);
  assert.equal(actor.move(0, 0, 0, false, 0), 0);
  assert.equal(actor.steps, 0);
  assert.equal(actor.move(1, 0, 0, false, 1), 3.3);
  assert.deepEqual(actor.position, { x: 0, z: -3.3 });
  assert.ok(actor.steps > 0);
  actor.reset();
  assert.deepEqual(actor.position, { x: 0, z: 0 });
  assert.equal(actor.facing, Math.PI);
});
void it("resolves blocked and large-delta movement through the shared collision solver", () => {
  const actor = createPlayer({ x: -9, z: 6 }, [{ x: -12, z: 6, r: 0.38 }]);
  actor.move(0, -1, 0, true, 10);
  assert.ok(actor.position.x > -12);
  assert.ok(Math.hypot(actor.position.x + 12, actor.position.z - 6) >= 0.72 - 1e-9);
});

void it("runs back around a blocker at sprint speed, advances its gait, and stops at home", () => {
  const actor = createPlayer({ x: -3, z: 0 }, [{ x: 0, z: 0, r: 1 }]), dt = 0.02;
  for (const [forward, strafe, frames] of [[1, 0, 38], [0, 1, 91], [-1, 0, 38]]) {
    for (let i = 0; i < frames; i++) actor.move(forward, strafe, 0, false, dt);
  }
  assert.ok(actor.position.x > 2.9);
  const steps = actor.steps;
  for (let i = 0; i < 200 && !actor.atHome; i++) {
    const old = { ...actor.position }, speed = actor.runHome(dt);
    assert.ok(speed > 0 && speed <= 5.28 + 1e-9);
    assert.ok(Math.hypot(actor.position.x - old.x, actor.position.z - old.z) <= speed * dt + 1e-9);
    assert.ok(Math.hypot(actor.position.x, actor.position.z) >= 1.34 - 1e-6);
  }
  assert.ok(actor.steps > steps && actor.atHome);
  assert.equal(actor.runHome(dt), 0);
});
