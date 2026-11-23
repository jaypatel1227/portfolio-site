import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bakeStack, pixelTexture } from "./bake.ts";
import { fill, model, voxel } from "./grid.ts";
import { greatTree } from "../models/oak.ts";
import { pine } from "../models/pine.ts";
import { rock } from "../models/rock.ts";
import { character } from "../models/character.ts";
import { PALETTE, CHARACTER_PALETTE } from "../models/palette.ts";

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

void describe("surface atlas baking", () => {
  function sample(mesh, origin, normal) {
    const dir = new THREE.Vector3(...normal);
    const ray = new THREE.Raycaster(new THREE.Vector3(...origin).addScaledVector(dir, 0.55), dir.negate(), 0, 0.1);
    const hit = ray.intersectObject(mesh, false)[0];
    assert.ok(hit, `Missing exterior at ${origin} facing ${normal}`);
    const { width, height, data } = mesh.material.map.image;
    const i = (Math.floor(hit.uv.y * height) * width + Math.floor(hit.uv.x * width)) * 4;
    assert.equal(data[i + 3], 255);
    return data[i] * 65536 + data[i + 1] * 256 + data[i + 2];
  }
  void it("uses six opaque outward quads even for a multicolor 12-layer block", () => {
    const m = model(3, 12, 5); fill(m, (x, y, z) => 1 + (x + y + z + 3) % 4);
    const { geometry, material } = bakeStack(m, PALETTE);
    assert.equal(geometry.index.count, 36);
    assert.equal(geometry.attributes.position.count, 24);
    assert.equal(material.alphaTest, 0);
    assert.equal(material.side, THREE.FrontSide);
    assert.ok([...geometry.attributes.uv.array].every((v) => v >= 0 && v <= 1));
    const sprite = pixelTexture({});
    for (const texture of [material.map, sprite]) {
      assert.equal(texture.minFilter, THREE.NearestFilter); assert.equal(texture.magFilter, THREE.NearestFilter);
      assert.equal(texture.generateMipmaps, false); assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    }
  });

  void it("preserves every exposed cell's color and winding across atlas shelves, holes and orientations", () => {
    const m = model(5, 4, 7);
    fill(m, (x, y, z) => x === 1 && z > -2 && y !== 1 || y === 3 && z === -2 ? 0 : 1 + (2*x + 3*y + z + 12) % 13);
    const { geometry, material } = bakeStack(m, PALETTE), mesh = new THREE.Mesh(geometry, material);
    const sky = new THREE.Color("#98b6c5");
    for (let y = 0; y < m.height; y++) for (let z = 0; z < m.depth; z++) for (let x = 0; x < m.width; x++) {
      const c = voxel(m, x, y, z); if (!c) continue;
      for (const [normal, light] of [[[1,0,0],0.82],[[-1,0,0],0.70],[[0,1,0],1],[[0,-1,0],0.58],[[0,0,1],0.92],[[0,0,-1],0.64]]) {
        const [dx, dy, dz] = normal;
        if (voxel(m, x + dx, y + dy, z + dz)) continue;
        const ink = new THREE.Color(PALETTE[c]).multiplyScalar(light * (0.88 + 0.18 * y / m.height));
        if (dy === 1) ink.lerp(sky, 0.18 * 0.55);
        else if (y % 3 === 0) ink.multiplyScalar(0.95);
        if (dy === 0 && voxel(m, x + dx, y + 1, z + dz)) ink.multiplyScalar(0.72);
        assert.equal(sample(mesh, [x - 2, y, z - 3], normal), ink.getHex());
      }
    }
  });

  void it("preserves untinted top hair when requested", () => {
    const m = character(), { geometry, material } = bakeStack(m, CHARACTER_PALETTE, { topTint: 0 });
    const mesh = new THREE.Mesh(geometry, material);
    for (let x = 4; x < 12; x++) for (let z = 0; z < 8; z++) {
      const ink = new THREE.Color(sample(mesh, [x - 7.5,31,z - 3.5], [0,1,0]));
      assert.ok(ink.r > ink.g && ink.g > ink.b);
    }
  });

  void it("handles empty geometry and rejects invalid colors and tint", () => {
    const m = model(1, 1, 1), baked = bakeStack(m, PALETTE);
    assert.equal(baked.geometry.index.count, 0);
    assert.equal(baked.material.map.image.width, 1);
    for (const topTint of [-1, 2, NaN, Infinity]) assert.throws(() => bakeStack(m, PALETTE, { topTint }), /Top tint/);
    fill(m, () => 2);
    assert.throws(() => bakeStack(m, ["#000000", "#ffffff"]), /Missing voxel palette index 2/);
  });
});
