import { it } from "node:test";
import assert from "node:assert/strict";
import { controlAxes, isControl, wheelExponent } from "./controls.ts";

void it("maps keyboard aliases and opposing keys without treating unrelated keys as controls", () => {
  assert.deepEqual(controlAxes(new Set()), { forward: 0, strafe: 0, orbit: 0, zoom: 0, sprint: false });
  const axes = controlAxes(new Set(["ArrowUp", "KeyS", "KeyA", "KeyE", "Equal", "ShiftRight"]));
  assert.deepEqual(axes, { forward: 0, strafe: -1, orbit: 1, zoom: -1, sprint: true });
  assert.ok(isControl("NumpadAdd"));
  assert.equal(isControl("Enter"), false);
});
void it("normalizes wheel modes and pinch while bounding extreme deltas", () => {
  assert.equal(wheelExponent(0, 0, false, 900), 0);
  assert.equal(wheelExponent(16, 0, false, 900), wheelExponent(1, 1, false, 900));
  assert.equal(wheelExponent(1, 2, false, 100), 0.2);
  assert.equal(wheelExponent(10, 0, true, 900), 0.12);
  assert.equal(wheelExponent(Infinity, 0, true, 900), 1);
  assert.equal(wheelExponent(-1e9, 0, false, 900), -1);
});
