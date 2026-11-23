import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { character, characterParts, CHARACTER_HEAD, CHARACTER_SCALE } from "./character.ts";
import { voxel } from "../voxel/grid.ts";
import { PALETTE, CHARACTER_PALETTE } from "./palette.ts";
import { createAvatar } from "../life/avatar.ts";

void it("uses an eight-cube head, twelve-high body and limbs at the existing world-space height", () => {
  const m = character();
  assert.deepEqual([m.width, m.height, m.depth], [16, 32, 8]);
  assert.equal(m.cells.filter(Boolean).length, 1664);
  assert.equal(CHARACTER_HEAD, 24); assert.equal(m.height * CHARACTER_SCALE, 1.575);
  assert.equal(voxel(m, 0, 0, 0), 0);
  assert.equal(voxel(m, 4, 0, 2), 31);
  assert.equal(voxel(m, 5, 8, 5), 30);
  assert.equal(voxel(m, 4, 8, 5), 36);
  assert.equal(voxel(m, 5, 5, 5), 37);
  assert.equal(voxel(m, 1, 15, 5), 24);
  assert.equal(voxel(m, 0, 15, 5), 38);
  assert.equal(voxel(m, 1, 20, 5), 29);
  assert.equal(voxel(m, 0, 20, 5), 34);
  assert.equal(voxel(m, 6, 20, 5), 35);
  for (let x = 4; x < 12; x++) for (let z = 0; z < 8; z++) assert.ok([25, 26].includes(voxel(m, x, 31, z)));
  for (let x = 4; x < 12; x++) for (let y = 24; y < 32; y++) assert.ok([25, 26].includes(voxel(m, x, y, 0)));
  assert.equal(voxel(m, 5, 27, 7), 27);
  assert.equal(voxel(m, 6, 27, 7), 28);
  assert.equal(voxel(m, 9, 27, 7), 28);
  assert.equal(voxel(m, 10, 27, 7), 27);
  assert.equal(voxel(m, 4, 29, 7), 26);
  assert.equal(voxel(m, 7, 29, 7), 24);
  assert.equal(voxel(m, 7, 26, 7), 32);
  assert.equal(voxel(m, 7, 24, 7), 39);
  assert.ok(m.cells.every((c) => c < CHARACTER_PALETTE.length));
});

void it("keeps the original world palette intact and isolates the unchanged character colors", () => {
  assert.deepEqual(PALETTE, ["#000000", "#152330", "#3f374c", "#71586a", "#ab887e", "#193b48", "#285969", "#43808a", "#8cb9aa", "#365959", "#527567", "#ada99a", "#808b8c", "#52627b", "#8195a8", "#b7c9cc", "#d18f58", "#ffd58a", "#ffe9b2", "#a95d69", "#d38483", "#eee1c1", "#557594", "#84a6b4"]);
  assert.deepEqual(CHARACTER_PALETTE.slice(0, PALETTE.length), PALETTE);
  assert.deepEqual(CHARACTER_PALETTE.slice(PALETTE.length), ["#b8896a", "#3e291e", "#674331", "#f4f3ed", "#5b52a3", "#16b3b0", "#4148a0", "#45474e", "#9f6f51", "#323b78", "#108b8d", "#22bab3", "#303774", "#5056a4", "#9d7158", "#4e3226"]);
});

void it("assembles separate head, torso and limbs into exactly the fingerprinted model at shoulder and hip pivots", () => {
  const original = character(), assembled = new Uint8Array(original.cells.length), parts = characterParts();
  assert.equal(parts.length, 6);
  for (const { name, voxels: m, position: [px, py, pz], offset } of parts) {
    if (name.endsWith("Arm")) { assert.equal(py, 23.5); assert.equal(offset, -11.5); }
    if (name.endsWith("Leg")) { assert.equal(py, 11.5); assert.equal(offset, -11.5); }
    for (let y = 0; y < m.height; y++) for (let z = 0; z < m.depth; z++) for (let x = 0; x < m.width; x++) {
      const sx = px + x + 8 - m.width / 2, sy = py + offset + y, sz = pz + z + 4 - m.depth / 2;
      assembled[(sy * original.depth + sz) * original.width + sx] = voxel(m, x, y, z);
    }
  }
  assert.deepEqual(assembled, original.cells);
});

void it("turns the rigid head, breathes at the configured scale, swings opposite limbs and settles to an idle sway", () => {
  const walker = new THREE.Group(), parts = { head: new THREE.Group(), arms: [new THREE.Group(), new THREE.Group()], legs: [new THREE.Group(), new THREE.Group()] };
  walker.scale.setScalar(CHARACTER_SCALE);
  const life = createAvatar(walker, parts), frame = { time: 5, motion: 0, dt: 0.05, player: { x: 0, z: 0 } };
  for (let i = 0; i < 100; i++) life.update(frame);
  assert.ok(Math.abs(walker.scale.y - CHARACTER_SCALE) < 0.001);
  assert.notEqual(parts.head.rotation.y, 0);
  assert.notEqual(parts.arms[0].rotation.x, 0);
  frame.motion = 3; life.update(frame);
  assert.equal(walker.scale.y, CHARACTER_SCALE); assert.equal(parts.head.rotation.y, 0);
  assert.ok(parts.arms[0].rotation.x * parts.legs[0].rotation.x < 0);
  assert.equal(parts.legs[0].rotation.x, -parts.legs[1].rotation.x);
  for (let i = 0; i < 30; i++) {
    life.update(frame);
    assert.ok(Math.abs(parts.legs[0].rotation.x) <= 0.65);
    assert.ok(Math.abs(parts.arms[0].rotation.x) <= 0.685);
  }
  frame.motion = 0;
  for (let i = 0; i < 100; i++) life.update(frame);
  assert.ok(Math.abs(parts.legs[0].rotation.x) < 0.001);
  frame.dt = 0; life.update(frame);
  assert.equal(parts.head.rotation.y, 0); assert.equal(walker.scale.y, CHARACTER_SCALE);
});
