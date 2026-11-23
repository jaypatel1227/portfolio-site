import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { approachReveal, lodNearby, staggerReveal, zoomReveal } from "./reveal-math.ts";
import { createReveal } from "./reveal.ts";
import { createLodSwap, normalizeLodGeometry } from "./lod.ts";

void it("reveals gradually inside each zoom band, with identical values in either direction", () => {
  for (const [threshold, band] of [[18, 4], [10, 2]]) {
    assert.equal(zoomReveal(threshold + 1, threshold, band), 0);
    assert.equal(zoomReveal(threshold, threshold, band), 0);
    assert.equal(zoomReveal(threshold - band / 2, threshold, band), 0.5);
    assert.equal(zoomReveal(threshold - band - 1, threshold, band), 1);
    let previous = 0;
    const samples = [];
    for (let i = 0; i <= 100; i++) {
      const value = zoomReveal(threshold - band * i / 100, threshold, band);
      assert.ok(value >= previous && value - previous < 0.016);
      samples.push(value); previous = value;
    }
    for (let i = 100; i >= 0; i--) assert.equal(zoomReveal(threshold - band * i / 100, threshold, band), samples[i]);
    assert.ok(zoomReveal(threshold - 0.001, threshold, band) < 0.000001);
  }
  assert.throws(() => zoomReveal(10, 18, 0), RangeError);
  assert.throws(() => zoomReveal(10, 18, -1), RangeError);
});

void it("staggers instances deterministically with no changes to the full-size endpoints", () => {
  const halfway = new Set();
  for (let i = 0; i < 100; i++) {
    assert.equal(staggerReveal(0, i), 0);
    assert.equal(staggerReveal(1, i), 1);
    halfway.add(staggerReveal(0.5, i));
  }
  assert.equal(halfway.size, 100);
});

void it("bounds late builds and direction changes in time, and handles still frames", () => {
  let value = 0;
  for (let i = 0; i < 10; i++) {
    const next = approachReveal(value, 1, 0.03, 0.6);
    assert.ok(next >= value && next - value <= 0.050001); value = next;
  }
  const reversed = approachReveal(value, 0, 0.03, 0.6);
  assert.ok(reversed < value && reversed > 0);
  assert.equal(approachReveal(0.5, 1, -1, 0.6), 0.5);
  assert.equal(approachReveal(0.5, 0, 0, 0.6), 0);
  assert.equal(approachReveal(0.5, 1, 1, 0.6), 1);
  assert.throws(() => approachReveal(0, 1, 0.1, 0), RangeError);
});

void it("holds LOD selection while hovering near a distance boundary in either direction", () => {
  for (const previous of [false, true]) {
    let near = previous;
    for (const distance of [9, 8.99, 9.01, 8.99, 9, 9.5, 8.5]) {
      near = lodNearby(distance, 9, near, 2);
      assert.equal(near, previous);
    }
  }
  assert.equal(lodNearby(7.99, 9, false, 2), true);
  assert.equal(lodNearby(10.01, 9, true, 2), false);
});

function mesh(count = 2) {
  const result = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), count);
  for (let i = 0; i < count; i++) result.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 2, 0.3, 7).scale(new THREE.Vector3(2, 3, 4)));
  return result;
}

void it("grows at original anchors and restores exact matrices without compounding scale", () => {
  const object = mesh(), before = Array.from(object.instanceMatrix.array), matrix = new THREE.Matrix4();
  const reveal = createReveal([object]);
  assert.equal(object.visible, false);
  reveal.update(0.5, 0);
  object.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 0);
  assert.ok(Math.abs(matrix.elements[13] - 0.3) < 1e-6);
  assert.equal(matrix.elements[14], 7);
  assert.ok(matrix.elements[0] > 0 && matrix.elements[0] < 2);
  for (let i = 0; i < 3; i++) { reveal.update(1, 0); reveal.update(0.5, 0); }
  reveal.update(1, 0);
  assert.deepEqual(Array.from(object.instanceMatrix.array), before);
  const version = object.instanceMatrix.version;
  reveal.update(1, 0.016);
  assert.equal(object.instanceMatrix.version, version);
  reveal.update(0, 0);
  assert.equal(object.visible, false);
  reveal.update(1, 0);
  assert.deepEqual(Array.from(object.instanceMatrix.array), before);
});

void it("uses fresh animation matrices and accepts empty detail batches", () => {
  const object = mesh(1), reveal = createReveal([object]), matrix = new THREE.Matrix4();
  reveal.update(0.5, 0);
  object.setMatrixAt(0, new THREE.Matrix4().makeTranslation(5, 2, 9));
  reveal.update(1, 0, object);
  object.getMatrixAt(0, matrix);
  assert.deepEqual(matrix.elements, new THREE.Matrix4().makeTranslation(5, 2, 9).elements);
  assert.equal(createReveal([]).update(1, 0), 1);
  assert.equal(createReveal([mesh(0)]).update(0, 0), 0);
});

void it("compacts static instances as the camera moves, retaining original scales and anchors", () => {
  const object = mesh(32), before = object.instanceMatrix.array.slice();
  const reveal = createReveal([object], 0), matrix = new THREE.Matrix4();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 50);
  function pan(x) {
    camera.position.set(x, 0, 20); camera.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    reveal.update(1, 0, undefined, frustum);
  }
  pan(0); assert.ok(object.count > 0 && object.count < 16);
  pan(62); object.getMatrixAt(0, matrix); assert.ok(matrix.elements[12] > 40);
  pan(100); assert.equal(object.count, 0); assert.equal(object.visible, false);
  reveal.update(1, 0); assert.equal(object.count, 32); assert.equal(object.visible, true);
  assert.deepEqual(object.instanceMatrix.array, before);
});

void it("draws exactly one complete LOD per instance without changing its material", () => {
  const low = mesh(), high = mesh(), matrix = new THREE.Matrix4();
  const originals = [0, 1].map((i) => { const m = new THREE.Matrix4(); low.getMatrixAt(i, m); return m; });
  const compile = low.material.onBeforeCompile.bind(low.material);
  low.material.onBeforeCompile = compile;
  const swap = createLodSwap(low, high, originals);
  for (const selection of [[false, true], [true, false], [true, true], [false, false]]) {
    swap(selection);
    for (const [batch, close] of [[low, false], [high, true]]) {
      const drawn = originals.filter((_, i) => selection[i] === close);
      assert.equal(batch.count, drawn.length);
      drawn.forEach((original, i) => { batch.getMatrixAt(i, matrix); assert.deepEqual(matrix, original); });
    }
  }
  assert.ok(low.material.onBeforeCompile === compile);
  const version = low.instanceMatrix.version;
  swap([false, false]); assert.equal(low.instanceMatrix.version, version);
  swap([true, true], [false, true]);
  assert.equal(low.count, 0); assert.equal(high.count, 1);
  high.getMatrixAt(0, matrix); assert.deepEqual(matrix, originals[1]);
  assert.throws(() => swap([]), RangeError);
  assert.throws(() => createLodSwap(mesh(0), high, originals), RangeError);
  const emptyLow = mesh(0), emptyHigh = mesh(0);
  createLodSwap(emptyLow, emptyHigh, [])([]);
  assert.equal(emptyLow.visible, false); assert.equal(emptyHigh.visible, false);
});

void it("culls base instances during a bake and restores their original slots when the LOD arrives", () => {
  const low = mesh(), high = mesh(), m = new THREE.Matrix4();
  const originals = [0, 1].map(i => { low.getMatrixAt(i, m); return m.clone(); });
  createLodSwap(low, null, originals)([true, true], [false, true]);
  assert.equal(low.count, 1); low.getMatrixAt(0, m); assert.deepEqual(m, originals[1]);
  createLodSwap(low, high, originals)([true, false], [true, true]);
  assert.equal(low.count, 1); assert.equal(high.count, 1);
  low.getMatrixAt(0, m); assert.deepEqual(m, originals[1]);
  high.getMatrixAt(0, m); assert.deepEqual(m, originals[0]);
});

void it("aligns high-density ground and water surfaces with their original voxel bounds", () => {
  for (const height of [1, 7, 27]) {
    const low = new THREE.BoxGeometry(3, height, 5).translate(0, (height - 1) / 2, 0);
    const high = new THREE.BoxGeometry(6, height * 2, 10).translate(0, (height * 2 - 1) / 2, 0);
    normalizeLodGeometry(high, 2); low.computeBoundingBox(); high.computeBoundingBox();
    assert.deepEqual(high.boundingBox, low.boundingBox);
  }
  normalizeLodGeometry(new THREE.BufferGeometry(), 2);
  assert.throws(() => normalizeLodGeometry(new THREE.BufferGeometry(), 0), RangeError);
});
