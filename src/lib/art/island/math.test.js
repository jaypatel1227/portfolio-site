import { it } from "node:test";
import assert from "node:assert/strict";
import { random, relativeMove, movePlayer, smooth } from "./math.ts";

void it("generates deterministic seeded random values", () => {
  const a = random(2026), b = random(2026), c = random(12);
  const values = Array.from({ length: 50 }, () => a());
  assert.deepEqual(values, Array.from({ length: 50 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 50 }, () => c()));
  assert.ok(values.every((n) => n >= 0 && n < 1));
});
void it("moves relative to the camera and normalizes diagonal speed", () => {
  assert.deepEqual(relativeMove(0, 0, 0), { x: 0, z: -0 });
  const north = relativeMove(1, 0, 0);
  assert.equal(north.z, -1);
  const west = relativeMove(1, 0, Math.PI / 2);
  assert.ok(Math.abs(west.x + 1) < 0.0001 && Math.abs(west.z) < 0.0001);
  const diagonal = relativeMove(1, 1, 0.4);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 0.0001);
});
void it("handles open ground, solid obstacles and exact-center overlap", () => {
  assert.deepEqual(movePlayer({ x: 0, z: 0 }, { x: 1, z: 2 }, [], 18), { x: 1, z: 2 });
  for (const delta of [{ x: 0, z: 0 }, { x: 0.4, z: 0.3 }]) {
    const p = movePlayer({ x: 0, z: 0 }, delta, [{ x: 0, z: 0, r: 1 }], 18);
    assert.ok(Math.hypot(p.x, p.z) >= 1.34 - 0.0001);
  }
  const edge = movePlayer({ x: 17, z: 0 }, { x: 4, z: 0 }, [], 18);
  assert.equal(edge.x, 18);
});
void it("clamps the home drift interpolation", () => {
  assert.equal(smooth(-1), 0); assert.equal(smooth(2), 1); assert.equal(smooth(0.5), 0.5);
});
