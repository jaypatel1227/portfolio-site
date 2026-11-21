import { it } from "node:test";
import assert from "node:assert/strict";
import { clampZoom, pixelScale } from "./zoom.ts";

void it("clamps free zoom between close inspection and the resting view", () => {
  assert.equal(clampZoom(0.01, 60), 6);
  assert.equal(clampZoom(1000, 60), 60);
  assert.equal(clampZoom(15, 60), 15);
});
void it("increases pixel resolution close up without changing narrow still-frame resolution", () => {
  assert.equal(pixelScale(60, 1440), 3);
  assert.equal(pixelScale(16, 1440), 2);
  assert.equal(pixelScale(6, 1440), 1);
  assert.equal(pixelScale(100, 390), 2);
});
