import { it } from "node:test";
import assert from "node:assert/strict";
import { clampZoom, createZoom, pixelScale } from "./zoom.ts";

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

void it("blends pixel grids continuously across both former resolution steps in either direction", () => {
  for (const center of [10, 22]) {
    const values = [];
    for (let i = 0; i <= 100; i++) values.push(pixelScale(center - 2 + i * 0.04, 1440));
    for (let i = 1; i < values.length; i++) assert.ok(values[i] >= values[i - 1] && values[i] - values[i - 1] < 0.016);
    for (let i = 100; i >= 0; i--) assert.equal(pixelScale(center - 2 + i * 0.04, 1440), values[i]);
    assert.ok(Math.abs(pixelScale(center + 0.001, 1440) - pixelScale(center - 0.001, 1440)) < 0.001);
  }
});

void it("keeps first zoom-out at the resting limit and zooms in from the displayed height", () => {
  for (const exponent of [0.04, 0.24, 1]) {
    const zoom = createZoom(60);
    zoom.hold(); zoom.magnify(exponent, 60);
    for (let i = 0; i < 40; i++) assert.equal(zoom.update(0.05), 60);
    zoom.magnify(-0.1, 60);
    assert.ok(zoom.update(0.05) < 60);
  }
});

void it("reverses zoom immediately relative to the shown height, including during engagement", () => {
  const zoom = createZoom(60);
  zoom.transition(24); zoom.update(0.2);
  let before = zoom.height;
  zoom.magnify(0.1, 60);
  assert.ok(zoom.update(0.05) >= before);
  before = zoom.height;
  zoom.magnify(-0.1, 60);
  assert.ok(zoom.update(0.05) < before);
  zoom.transition(60);
  assert.equal(zoom.update(2), 60);
  zoom.reset(45); zoom.magnify(0, 45);
  assert.equal(zoom.update(1), 45);
});

void it("reconciles displayed and pending free zoom with resized limits without discarding an in-bounds choice", () => {
  const zoom = createZoom(78);
  zoom.resize(58);
  assert.equal(zoom.height, 58);
  zoom.magnify(0.1, 58);
  for (let i = 0; i < 40; i++) assert.equal(zoom.update(0.05), 58);
  zoom.reset(40); zoom.magnify(Math.log(2), 100);
  zoom.update(0.05); zoom.resize(58);
  assert.equal(zoom.update(100), 58);
  zoom.reset(40); zoom.magnify(Math.log(1.25), 100);
  const before = zoom.update(0.05);
  zoom.resize(58);
  assert.equal(zoom.height, before);
  assert.equal(zoom.update(100), 50);
  zoom.resize(90);
  assert.equal(zoom.update(100), 50);
});

void it("rebases active transitions inside resized limits", () => {
  for (const [initial, target] of [[78, 24], [40, 78]]) {
    const zoom = createZoom(initial);
    zoom.transition(target); zoom.update(0.2); zoom.resize(58);
    for (let i = 0; i < 40; i++) {
      const height = zoom.update(0.05);
      assert.ok(height >= 6 && height <= 58);
    }
    assert.equal(zoom.height, Math.min(target, 58));
  }
});
