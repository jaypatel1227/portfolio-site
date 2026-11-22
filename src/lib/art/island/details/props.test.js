import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createSmallProps } from "./props.ts";

void it("bakes every close-view prop with its original colors, independently of character colors", () => {
  const expected = ["#000000", "#152330", "#3f374c", "#71586a", "#ab887e", "#193b48", "#285969", "#43808a", "#8cb9aa", "#365959", "#527567", "#ada99a", "#808b8c", "#52627b", "#8195a8", "#b7c9cc", "#d18f58", "#ffd58a", "#ffe9b2", "#a95d69", "#d38483", "#eee1c1", "#557594", "#84a6b4", "#c94c54", "#f1ead8", "#273d50", "#79a66a"];
  const meshes = [], used = new Set(), sky = new THREE.Group();
  createSmallProps(2026, (m, points, colors) => {
    assert.deepEqual(colors, expected);
    for (const index of m.cells) { assert.ok(index < colors.length); used.add(index); }
    const mesh = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), points.length);
    meshes.push(mesh); return mesh;
  }, sky);
  assert.equal(meshes.length, 17);
  for (const index of [24, 25, 26, 27]) assert.ok(used.has(index));
  for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
  for (const mesh of sky.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
});
