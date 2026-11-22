import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bird, insect } from "../models/ambient.ts";
import { flightLift, proximity, onPath, shoreBand, createIdlePose } from "./behavior.ts";
import { createBirds } from "./birds.ts";
import { createInsects } from "./insects.ts";
import { createFootsteps } from "./footsteps.ts";

function fakeBatch(meshes) {
  return (_model, spots) => {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), spots.length);
    spots.forEach((spot, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(spot.scale, spot.scale, spot.scale).setPosition(spot.x, spot.y ?? 0, spot.z)));
    meshes.push(mesh); return mesh;
  };
}

void it("has periodic, bounded flights and smooth proximity including exact overlap", () => {
  assert.equal(flightLift(0, 0), 0);
  assert.equal(flightLift(9, 0), 0);
  assert.equal(flightLift(12.5, 0), 1);
  assert.equal(flightLift(16, 0), 0);
  for (let t = -32; t < 32; t += 0.1) assert.ok(flightLift(t, 2) >= 0 && flightLift(t, 2) <= 1);
  assert.equal(proximity(0, 3), 1); assert.equal(proximity(1.5, 3), 0.5); assert.equal(proximity(4, 3), 0);
  assert.throws(() => proximity(1, 0), RangeError);
});

void it("finds reachable shore contact and keeps prints on the path", () => {
  assert.equal(onPath(2, 12), true); assert.equal(onPath(-8, 1), false);
  assert.equal(shoreBand(-3.5, 1), 1);
  assert.equal(shoreBand(-8, 1), 0); assert.equal(shoreBand(12, 12), 0);
});

void it("submits only live footstep particles and releases their slots after fading", () => {
  const meshes = [], steps = createFootsteps(fakeBatch(meshes), () => 0.5);
  const update = (x, time, motion) => steps.update({ time, player: { x, z: 12 }, dt: 0.05, motion });
  update(1.6, 0, 0);
  assert.ok(meshes.every((m) => !m.visible && m.count === 0));
  update(2, 0.1, 1); update(2, 0.2, 0);
  assert.deepEqual(meshes.map((m) => m.count), [1, 1, 0, 0]);
  update(2, 10, 0);
  assert.ok(meshes.every((m) => !m.visible && m.count === 0));
});

void it("reuses idle state, settles into a look-around and resets on movement or still frames", () => {
  const idle = createIdlePose();
  for (let i = 0; i < 100; i++) assert.equal(idle.update(5, 0, 0.05), idle.pose);
  assert.notEqual(idle.pose.turn, 0); assert.ok(idle.pose.breath > 0.98 && idle.pose.breath < 1.02);
  assert.deepEqual(idle.update(5, 3, 0.05), { turn: 0, breath: 1, lean: 0 });
  assert.deepEqual(idle.update(40, 0, 0), { turn: 0, breath: 1, lean: 0 });
});

void it("creates repeatable nonempty ambient models without changing established model factories", () => {
  for (const make of [() => bird(), () => bird(true), () => insect(), () => insect(true)]) {
    const a = make(); assert.ok(a.cells.some((c) => c > 0)); assert.deepEqual(a.cells, make().cells);
    assert.ok(a.cells.every((c) => c < 24));
  }
});

void it("keeps birds finite at overlap and lifts them when approached", () => {
  const meshes = [], birds = createBirds(2026, fakeBatch(meshes));
  birds.update({ time: 0, player: { x: -1.5, z: 6 }, dt: 0.05, motion: 1 });
  const matrix = new THREE.Matrix4(); meshes[0].getMatrixAt(0, matrix);
  assert.ok(matrix.elements[13] > 1);
  for (const mesh of meshes) assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
});

void it("reveals moving insect batches gradually and supports an empty lamp batch", () => {
  for (const count of [0, 2]) {
    const meshes = [], batch = fakeBatch(meshes), lamps = batch(null, Array.from({ length: count }, () => ({ x: 0, z: 0, scale: 1 })));
    const life = createInsects(batch, lamps), camera = new THREE.OrthographicCamera(-10, 10, 6, -6);
    life.setView(camera); life.update({ time: 1, player: { x: 0, z: 0 }, dt: 0.1, motion: 0 });
    assert.equal(meshes[1].count, count * 3);
    assert.equal(meshes[2].visible, true);
    assert.ok(Array.from(meshes[2].instanceMatrix.array).every(Number.isFinite));
    camera.top = 30; camera.bottom = -30; life.setView(camera);
    life.update({ time: 2, player: { x: 0, z: 0 }, dt: 1, motion: 0 });
    assert.equal(meshes[1].visible, false); assert.equal(meshes[2].visible, false);
  }
});
