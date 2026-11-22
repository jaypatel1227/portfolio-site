import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { approachReveal, lodNearby, staggerReveal, zoomReveal } from "./reveal-math.ts";
import { createReveal } from "./reveal.ts";
import { dissolve } from "./dissolve.ts";

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

void it("uses complementary LOD coverage and preserves existing wind shaders", () => {
  const low = mesh(), high = mesh(), weights = new Float32Array([0, 0.5]);
  for (const object of [low, high]) {
    object.material.onBeforeCompile = (shader) => { shader.vertexShader += "\n// existing wind"; };
    object.material.customProgramCacheKey = () => "wind";
  }
  const dirty = dissolve(low, weights, true);
  dissolve(high, weights);
  const shaders = [low, high].map((object) => {
    const shader = { vertexShader: "#include <begin_vertex>", fragmentShader: "#include <alphatest_fragment>" };
    object.material.onBeforeCompile(shader, {});
    assert.ok(shader.vertexShader.includes("existing wind"));
    assert.ok(shader.vertexShader.includes("stackMix = stackCoverage"));
    assert.equal(object.geometry.getAttribute("stackCoverage").array, weights);
    return shader;
  });
  assert.ok(shaders[0].fragmentShader.includes("threshold < stackMix"));
  assert.ok(shaders[1].fragmentShader.includes("threshold >= stackMix"));
  assert.notEqual(low.material.customProgramCacheKey(), high.material.customProgramCacheKey());
  const attribute = low.geometry.getAttribute("stackCoverage"), version = attribute.version;
  dirty(); assert.equal(attribute.version, version + 1);
});
