import { it } from "node:test";
import assert from "node:assert/strict";
import { narrowFraming, restFraming } from "./framing.ts";

void it("fits the clearing between the hero and footer on phones and narrow tablets", () => {
  for (const [width, height, hero, footer] of [[360, 740, 330, 608], [390, 844, 310, 712], [430, 932, 310, 800], [1023, 768, 300, 636]]) {
    const { vertical, center } = narrowFraming(width, height, hero, footer);
    const top = center * height - 17 / vertical * height;
    const bottom = center * height + 17 / vertical * height;
    assert.ok(top >= hero + 24 - 1e-8);
    assert.ok(bottom <= footer - 24 + 1e-8);
    assert.ok(vertical * width / height >= 45 - 1e-8);
    assert.equal(center * height, (hero + footer) / 2);
  }
});

void it("fits the entire island to the right of measured text on desktops, foldables and landscape phones", () => {
  for (const [width, height, right, bottom, footer] of [[1440, 900, 640, 570, 794], [1024, 768, 480, 530, 635], [884, 1104, 420, 340, 970], [1104, 884, 500, 500, 750], [844, 390, 390, 320, 500]]) {
    const frame = restFraming(width, height, { right, bottom }, 74, footer);
    assert.equal(frame.side, true);
    const scale = height / frame.vertical;
    assert.ok(frame.centerX * width - 25 * scale >= right + 32 - 1e-8);
    assert.ok(frame.centerX * width + 25 * scale <= width - 24 + 1e-8);
    assert.ok(frame.centerY * height - 19 * scale >= 98 - 1e-8);
    assert.ok(frame.centerY * height + 19 * scale <= Math.min(height, footer) - 24 + 1e-8);
  }
});

void it("retains below-text framing on narrow portrait screens and when no side area exists", () => {
  for (const width of [360, 390, 430, 884]) {
    const frame = restFraming(width, 844, { right: width - 24, bottom: 315 }, 74, 711);
    assert.equal(frame.side, false);
    assert.equal(frame.centerX, 0.5);
    assert.deepEqual({ vertical: frame.vertical, center: frame.centerY }, narrowFraming(width, 844, 315, 711));
  }
});

void it("keeps framing finite when the layout leaves no gap", () => {
  for (const footer of [300, 280]) {
    const frame = narrowFraming(360, 740, 300, footer);
    assert.ok(Number.isFinite(frame.vertical) && frame.vertical > 0);
    assert.ok(Number.isFinite(frame.center));
  }
});

void it("keeps the island inside short landscape viewports even when the hero and footer overflow", () => {
  for (const [width, height, right, hero, footer] of [[568, 260, 533, 287, 391], [640, 300, 605, 287, 391], [740, 360, 346, 355, 459]]) {
    const frame = restFraming(width, height, { right, bottom: hero }, 74, footer);
    const radius = (frame.side ? 19 : 17) / frame.vertical;
    assert.ok(frame.centerY - radius >= 0);
    assert.ok(frame.centerY + radius <= 1);
    assert.ok(frame.centerY > 0 && frame.centerY < 1);
    const horizontalRadius = 25 / frame.vertical * height / width;
    assert.ok(frame.centerX - horizontalRadius >= 0);
    assert.ok(frame.centerX + horizontalRadius <= 1);
  }
});
