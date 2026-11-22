import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bakeStack, pixelTexture } from "./bake.ts";
import { fill, model, voxel } from "./grid.ts";
import { greatTree } from "../models/oak.ts";
import { pine } from "../models/pine.ts";
import { rock } from "../models/rock.ts";
import { character } from "../models/character.ts";
import { PALETTE } from "../models/palette.ts";

void describe("voxel models", () => {
  void it("rejects invalid grid dimensions", () => {
    for (const n of [0, -1, 1.5, Infinity, NaN]) assert.throws(() => model(n, 1, 1), RangeError);
  });
  void it("starts empty and treats out-of-bounds cells as air", () => {
    const m = model(3, 4, 5);
    assert.equal(m.cells.length, 60);
    assert.equal(voxel(m, 0, 0, 0), 0);
    for (const p of [[-1, 0, 0], [3, 0, 0], [0, 4, 0], [0, 0, 5]]) assert.equal(voxel(m, ...p), 0);
  });

  void it("samples centered horizontal coordinates and bottom-up layers", () => {
    const m = model(3, 2, 3);
    fill(m, (x, y, z) => x === 0 && z === 0 ? y + 1 : 0);
    assert.equal(voxel(m, 1, 0, 1), 1);
    assert.equal(voxel(m, 1, 1, 1), 2);
    assert.equal(voxel(m, 0, 0, 0), 0);
  });

  void it("generates repeatable seed-dependent art", () => {
    for (const generate of [pine, greatTree, rock]) {
      assert.deepEqual(generate(2026).cells, generate(2026).cells);
      assert.notDeepEqual(generate(2026).cells, generate(42).cells);
    }
  });
});

void describe("slice baking", () => {
  function withCanvas(run) {
    const previous = globalThis.document;
    const pixels = new Map();
    const context = { fillStyle: "", fillRect(x, y) { pixels.set(`${x},${y}`, this.fillStyle); } };
    const canvas = { width: 0, height: 0, getContext: () => context };
    globalThis.document = { createElement: () => canvas };
    try { run(canvas, pixels); } finally { globalThis.document = previous; }
  }

  void it("keeps texture pixels crisp", () => withCanvas((canvas) => {
    const t = pixelTexture(canvas);
    assert.equal(t.minFilter, THREE.NearestFilter);
    assert.equal(t.magFilter, THREE.NearestFilter);
    assert.equal(t.generateMipmaps, false);
    t.dispose();
  }));

  void it("bakes one quad per layer plus closed voxel side walls", () => withCanvas(() => {
    const m = model(1, 2, 1);
    fill(m, () => 1);
    const baked = bakeStack(m, ["#000000", "#99aaaa"]);
    assert.equal(baked.geometry.attributes.position.count, 2 * 6 + 2 * 4 * 6);
    assert.equal(baked.material.alphaTest, 0.5);
    assert.ok([...baked.geometry.attributes.uv.array].every((v) => v >= 0 && v <= 1));
    baked.geometry.dispose(); baked.material.map.dispose(); baked.material.dispose();
  }));

  void it("bakes empty art without introducing opaque walls", () => withCanvas(() => {
    const baked = bakeStack(model(2, 3, 2), ["#000000"]);
    assert.equal(baked.geometry.attributes.position.count, 3 * 6);
    baked.geometry.dispose(); baked.material.map.dispose(); baked.material.dispose();
  }));

  void it("rejects an unknown palette index", () => withCanvas(() => {
    const m = model(1, 1, 1);
    fill(m, () => 2);
    assert.throws(() => bakeStack(m, ["#000000", "#ffffff"]), /Missing voxel palette index 2/);
  }));

  void it("preserves default sky tint but keeps every character top-hair texel brown when disabled", () => withCanvas((_canvas, pixels) => {
    const m = character();
    const tinted = bakeStack(m, PALETTE);
    const defaultTop = pixels.get("24,44");
    const untinted = bakeStack(m, PALETTE, { topTint: 0 });
    assert.notEqual(pixels.get("24,44"), defaultTop);
    for (let x = 4; x < 12; x++) for (let z = 0; z < 8; z++) {
      const color = new THREE.Color(pixels.get(`${16 + x},${40 + z}`));
      assert.ok(color.r > color.g && color.g > color.b);
    }
    const expected = new THREE.Color(PALETTE[26]).multiplyScalar(0.72 + 0.36 * 31 / 32);
    assert.equal(pixels.get("24,44"), `#${expected.getHexString()}`);
    assert.equal(defaultTop, `#${expected.lerp(new THREE.Color("#98b6c5"), 0.18).getHexString()}`);
    for (const b of [tinted, untinted]) { b.geometry.dispose(); b.material.map.dispose(); b.material.dispose(); }
  }));

  void it("allows untinted empty art and rejects invalid top tint", () => withCanvas(() => {
    const m = model(1, 1, 1), baked = bakeStack(m, PALETTE, { topTint: 0 });
    assert.equal(baked.geometry.attributes.position.count, 6);
    for (const topTint of [-1, 2, NaN, Infinity]) assert.throws(() => bakeStack(m, PALETTE, { topTint }), /Top tint/);
    baked.geometry.dispose(); baked.material.map.dispose(); baked.material.dispose();
  }));
});
