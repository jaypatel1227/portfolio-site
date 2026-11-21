import { it } from "node:test";
import assert from "node:assert/strict";
import { bindInput } from "./index.ts";

void it("preserves native navigation until engagement and releases semantic keys by physical code", () => {
  const previous = { window: globalThis.window, HTMLElement: globalThis.HTMLElement, innerHeight: globalThis.innerHeight };
  const events = new AbortController(), canvas = new EventTarget();
  globalThis.window = new EventTarget();
  globalThis.HTMLElement = class {};
  globalThis.innerHeight = 900;
  const send = (target, type, props = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, props); target.dispatchEvent(event); return event;
  };
  let enabled = true, engaged = false, engagements = 0, exponent = 0;
  try {
    const input = bindInput(canvas, {
      enabled: () => enabled, engaged: () => engaged,
      engage() { engaged = true; engagements++; },
      home() { engaged = false; }, orbit() {}, magnify(value) { exponent = value; },
    }, events.signal);
    assert.equal(send(canvas, "wheel", { deltaY: 20, deltaMode: 0 }).defaultPrevented, false);
    assert.equal(send(window, "keydown", { code: "ShiftLeft", key: "Shift" }).defaultPrevented, false);
    assert.equal(send(window, "keydown", { code: "Tab", key: "Tab", shiftKey: true }).defaultPrevented, false);
    assert.equal(engagements, 0);
    assert.equal(input.axes().sprint, true);
    send(window, "keyup", { code: "ShiftLeft" });
    send(window, "keydown", { code: "BracketRight", key: "+" });
    assert.equal(input.axes().zoom, -1);
    send(window, "keyup", { code: "BracketRight", key: "*" });
    assert.equal(input.axes().zoom, 0);
    assert.equal(engagements, 1);
    assert.equal(send(canvas, "wheel", { deltaY: 20, deltaMode: 0 }).defaultPrevented, true);
    assert.ok(exponent > 0);
    send(window, "keydown", { code: "Escape", key: "Escape" });
    assert.equal(send(canvas, "wheel", { deltaY: 20 }).defaultPrevented, false);
    assert.equal(send(window, "keydown", { code: "KeyW", key: "w", ctrlKey: true }).defaultPrevented, false);
    enabled = false;
    send(window, "keydown", { code: "KeyW", key: "w" });
    assert.equal(engagements, 1);
  } finally {
    events.abort(); Object.assign(globalThis, previous);
  }
});
