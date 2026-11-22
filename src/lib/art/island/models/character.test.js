import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { character, CHARACTER_HEAD, CHARACTER_SCALE } from "./character.ts";
import { voxel } from "../voxel/grid.ts";
import { PALETTE } from "./palette.ts";
import { createAvatar } from "../life/avatar.ts";

void it("uses an eight-cube head, twelve-high body and limbs at the existing world-space height", () => {
  const m = character();
  assert.deepEqual([m.width, m.height, m.depth], [16, 32, 8]);
  assert.equal(m.cells.filter(Boolean).length, 1664);
  assert.equal(CHARACTER_HEAD, 24); assert.equal(m.height * CHARACTER_SCALE, 1.575);
  assert.equal(voxel(m, 0, 0, 0), 0);
  assert.equal(voxel(m, 4, 0, 2), 31);
  assert.equal(voxel(m, 4, 8, 2), 30);
  assert.equal(voxel(m, 0, 12, 2), 24);
  assert.equal(voxel(m, 0, 20, 2), 29);
  assert.equal(voxel(m, 6, 20, 2), 29);
  for (let x = 4; x < 12; x++) for (let z = 0; z < 8; z++) assert.equal(voxel(m, x, 31, z), 26);
  for (let x = 4; x < 12; x++) for (let y = 24; y < 32; y++) assert.equal(voxel(m, x, y, 0), 26);
  assert.equal(voxel(m, 5, 28, 7), 27);
  assert.equal(voxel(m, 6, 28, 7), 28);
  assert.equal(voxel(m, 7, 24, 7), 26);
  assert.ok(m.cells.every((c) => c < PALETTE.length));
});

void it("keeps the original palette indices unchanged and appends the character colors", () => {
  assert.deepEqual(PALETTE.slice(0, 24), ["#000000", "#152330", "#3f374c", "#71586a", "#ab887e", "#193b48", "#285969", "#43808a", "#8cb9aa", "#365959", "#527567", "#ada99a", "#808b8c", "#52627b", "#8195a8", "#b7c9cc", "#d18f58", "#ffd58a", "#ffe9b2", "#a95d69", "#d38483", "#eee1c1", "#557594", "#84a6b4"]);
});

void it("turns only the new head, breathes at its configured scale and restores that scale on movement", () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.scale.setScalar(CHARACTER_SCALE);
  const life = createAvatar(mesh), frame = { time: 5, motion: 0, dt: 0.05, player: { x: 0, z: 0 } };
  const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>" };
  mesh.material.onBeforeCompile(shader, {});
  assert.ok(shader.vertexShader.includes("position.y > 23.5"));
  for (let i = 0; i < 100; i++) life.update(frame);
  assert.ok(Math.abs(mesh.scale.y - CHARACTER_SCALE) < 0.001);
  assert.notEqual(shader.uniforms.idleTurn.value, 0);
  frame.motion = 3; life.update(frame);
  assert.equal(mesh.scale.y, CHARACTER_SCALE); assert.equal(shader.uniforms.idleTurn.value, 0);
});
