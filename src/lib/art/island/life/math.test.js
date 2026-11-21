import { it } from "node:test";
import assert from "node:assert/strict";
import { cycle, fishJump, critterTarget } from "./math.ts";
import { fish, fox, owl, rabbit } from "../models/animals.ts";

void it("cycles predictably and gives jumping fish a bounded arc with a resting interval", () => {
  assert.equal(cycle(0, 9), 0); assert.equal(cycle(18, 9), 0);
  assert.equal(cycle(-1, 9), 8 / 9);
  assert.equal(fishJump(0), 0); assert.equal(fishJump(4), 0);
  assert.ok(Math.abs(fishJump(0.8) - 1.65) < 1e-8);
  for (let t = 0; t < 20; t += 0.1) assert.ok(fishJump(t) >= 0 && fishJump(t) <= 1.65);
});

void it("wanders deterministically and flees nearby players without NaNs at exact overlap", () => {
  const home = { x: -3, z: 7 }, far = { x: 15, z: -15 };
  const calm = critterTarget(4, home, 2, far);
  assert.deepEqual(calm, critterTarget(4, home, 2, far));
  assert.equal(calm.scared, false);
  const close = critterTarget(4, home, 2, { x: calm.x - 1, z: calm.z });
  assert.equal(close.scared, true); assert.ok(close.x > calm.x);
  const overlap = critterTarget(4, home, 2, calm);
  assert.ok(Number.isFinite(overlap.x) && Number.isFinite(overlap.z));
});

void it("builds repeatable nonempty pixel-slice creatures and a distinct blinking owl", () => {
  for (const build of [fish, fox, rabbit, () => owl(false), () => owl(true), () => owl(true, true)]) {
    const a = build();
    assert.deepEqual(a.cells, build().cells);
    assert.ok(a.cells.some((index) => index > 0));
    assert.ok(a.cells.every((index) => index < 24));
  }
  assert.notDeepEqual(owl(true).cells, owl(true, true).cells);
});
