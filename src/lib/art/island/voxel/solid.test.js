import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { model, fill } from "./grid.ts";
import { solidGeometry } from "./solid.ts";

void it("draws an unbroken, outward-facing quad per side of a solid block, including the underside", () => {
  const m = model(4, 12, 4); fill(m, () => 1);
  const geometry = solidGeometry(m, ["#000000", "#16b3b0"]);
  assert.equal(geometry.index.count, 36);
  const pos = geometry.attributes.position, color = geometry.attributes.color;
  const point = (i) => new THREE.Vector3().fromBufferAttribute(pos, geometry.index.getX(i));
  for (let i = 0; i < 36; i += 3) {
    const a = point(i), ab = point(i + 1).sub(a), ac = point(i + 2).sub(a);
    assert.ok(ab.cross(ac).dot(a.sub(new THREE.Vector3(0, 5.5, 0))) > 0);
  }
  for (let i = 0; i < color.count; i += 4) {
    for (let j = 1; j < 4; j++) assert.equal(color.getY(i), color.getY(i + j));
  }
  geometry.computeBoundingBox();
  assert.deepEqual(geometry.boundingBox.min.toArray(), [-2, -0.5, -2]);
  assert.deepEqual(geometry.boundingBox.max.toArray(), [2, 11.5, 2]);
  geometry.dispose();
});
