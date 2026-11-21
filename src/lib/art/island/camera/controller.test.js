import { it } from "node:test";
import assert from "node:assert/strict";
import { createCamera } from "./controller.ts";

void it("reconciles engaged zoom on resize and preserves in-bounds free zoom", () => {
  const previous = { innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight };
  Object.assign(globalThis, { innerWidth: 1440, innerHeight: 900 });
  try {
    const view = createCamera();
    const frame = { vertical: 90, centerX: 0.7, centerY: 0.5, side: true };
    const player = { x: 0, z: 0 };
    view.resize(frame); view.transition(1, true);
    view.magnify(Math.log(78 / 90)); view.update(2, player, 1440, 900);
    assert.equal(view.zoom, 1);
    assert.ok(Math.abs(view.vertical - 78) < 1e-5);
    view.resize({ ...frame, vertical: 58 });
    assert.equal(view.vertical, 58);
    view.magnify(0.1);
    for (let i = 0; i < 40; i++) {
      assert.equal(view.update(0.05, player, 1440, 900), 58);
    }
    view.resize(frame);
    assert.equal(view.update(2, player, 1440, 900), 58);
    view.reset(); view.transition(1, true); view.magnify(Math.log(50 / 90));
    view.resize({ ...frame, vertical: 58 });
    assert.equal(view.update(100, player, 1440, 900), 50);
    view.transition(0); view.resize(frame);
    assert.equal(view.update(2, player, 1440, 900), 90);
  } finally {
    Object.assign(globalThis, previous);
  }
});
