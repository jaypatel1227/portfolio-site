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
