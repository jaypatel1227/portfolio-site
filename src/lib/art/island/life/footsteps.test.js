import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFootsteps } from "./footsteps.ts";
import { random, trailX } from "../math.ts";

function setup() {
  const meshes = [];
  const life = createFootsteps((_model, spots) => {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), spots.length);
    meshes.push(mesh); return mesh;
  }, random(2026));
  const frame = { time: 10, player: { x: 2, z: 12 }, dt: 0.05, motion: 1 };
  const step = (x, z) => { frame.player.x = x; frame.player.z = z; frame.time += 0.05; life.update(frame); };
  const active = (index) => {
    const matrix = new THREE.Matrix4(); let count = 0;
    for (let i = 0; i < meshes[index].count; i++) { meshes[index].getMatrixAt(i, matrix); if (Math.abs(matrix.determinant()) > 1e-14) count++; }
    return count;
  };
  return { meshes, frame, step, active };
}
void it("leaves alternating prints while walking on the path and expires them", () => {
  const s = setup();
  for (let i = 0; i < 20; i++) { const z = 12 - i * 0.1; s.step(trailX(z), z); }
  assert.ok(s.active(1) >= 3);
  s.frame.motion = 0; s.frame.time += 8; s.step(s.frame.player.x, s.frame.player.z);
  assert.equal(s.active(1), 0);
});
void it("splashes at a reachable bank, but not on dry ground, on teleport or in still frames", () => {
  const s = setup();
  s.step(-3.5, 0.5);
  for (let i = 0; i < 10; i++) s.step(-3.5, 0.5 + i * 0.1);
  assert.ok(s.active(2) > 0); assert.ok(s.active(3) > 0); assert.equal(s.active(1), 0);
  const dry = setup();
  for (let i = 0; i < 20; i++) dry.step(7, 8 + i * 0.1);
  assert.equal(dry.active(2), 0);
  dry.frame.dt = 0; dry.step(-3.5, 1); assert.equal(dry.active(2), 0);
  assert.ok(dry.meshes.every((m) => Array.from(m.instanceMatrix.array).every(Number.isFinite)));
});
