import { it } from "node:test";
import assert from "node:assert/strict";
import { controlAxes, controlCode, isControl, isModifier, wheelExponent } from "./controls.ts";

void it("maps keyboard aliases and opposing keys without treating unrelated keys as controls", () => {
  assert.deepEqual(controlAxes(new Set()), { forward: 0, strafe: 0, orbit: 0, zoom: 0, sprint: false });
  const axes = controlAxes(new Set(["ArrowUp", "KeyS", "KeyA", "KeyE", "Equal", "ShiftRight"]));
  assert.deepEqual(axes, { forward: 0, strafe: -1, orbit: 1, zoom: -1, sprint: true });
  assert.ok(isControl("NumpadAdd"));
  assert.equal(isControl("Enter"), false);
});
void it("resolves zoom characters independently of layout while retaining physical movement and numpad keys", () => {
  for (const [code, key, expected] of [["BracketRight", "+", "Equal"], ["Slash", "-", "Minus"], ["Digit0", "=", "Equal"], ["Slash", "_", "Minus"], ["NumpadAdd", "Add", "NumpadAdd"], ["NumpadSubtract", "Subtract", "NumpadSubtract"], ["KeyW", "z", "KeyW"], ["KeyQ", "a", "KeyQ"]]) {
    assert.equal(controlCode(code, key), expected);
  }
  assert.equal(controlCode("Tab", "Tab"), null);
  assert.equal(controlCode("KeyZ", "w"), null);
  assert.equal(isModifier("ShiftLeft"), true);
  assert.equal(isModifier("ShiftRight"), true);
  assert.equal(isModifier("KeyW"), false);
});
void it("normalizes wheel modes and pinch while bounding extreme deltas", () => {
  assert.equal(wheelExponent(0, 0, false, 900), 0);
  assert.equal(wheelExponent(16, 0, false, 900), wheelExponent(1, 1, false, 900));
  assert.equal(wheelExponent(1, 2, false, 100), 0.2);
  assert.equal(wheelExponent(10, 0, true, 900), 0.12);
  assert.equal(wheelExponent(Infinity, 0, true, 900), 1);
  assert.equal(wheelExponent(-1e9, 0, false, 900), -1);
});

void it("prioritizes physical movement and orbit over zoom characters on alternate layouts", () => {
  const code = controlCode("KeyA", "-");
  assert.equal(code, "KeyA");
  assert.equal(controlAxes(new Set([code])).strafe, -1);
  assert.equal(controlAxes(new Set([code])).zoom, 0);
  assert.equal(controlCode("KeyQ", "+"), "KeyQ");
  assert.equal(controlCode("Slash", "-"), "Minus");
});
