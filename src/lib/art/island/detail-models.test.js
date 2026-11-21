import { it } from "node:test";
import assert from "node:assert/strict";
import { detailModel } from "./detail-models.ts";
import { fill, model } from "./slices.ts";
import { smallPlaces } from "./props.ts";

void it("doubles voxel density deterministically while adding material detail", () => {
  const base = model(7, 8, 7); fill(base, () => 3);
  for (const kind of ["oak", "cabin", "pine", "rock", "ground", "pond"]) {
    const detailed = detailModel(base, 2026, kind);
    assert.deepEqual([detailed.width, detailed.height, detailed.depth], [14, 16, 14]);
    assert.deepEqual(detailed.cells, detailModel(base, 2026, kind).cells);
    assert.ok(detailed.cells.some((index) => index > 0));
    assert.ok(detailed.cells.every((index) => index < 24));
  }
});
void it("keeps empty models empty", () => {
  assert.ok(detailModel(model(2, 2, 2), 2, "oak").cells.every((index) => index === 0));
});

void it("rejects invalid source dimensions", () => {
  assert.throws(() => detailModel({ width: 0, height: 2, depth: 2, cells: new Uint8Array() }, 2, "oak"));
});

void it("places small props deterministically at distinct sites", () => {
  const a = smallPlaces(2026);
  assert.deepEqual(a, smallPlaces(2026));
  assert.notDeepEqual(a, smallPlaces(13));
  const positions = Object.values(a);
  assert.equal(new Set(positions.map((p) => `${p.x},${p.z}`)).size, positions.length);
  assert.ok(positions.every((p) => Math.hypot(p.x, p.z) < 18));
});
