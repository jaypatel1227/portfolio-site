import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createLighting } from "./lighting.ts";

void it("keeps animated color and scale on the right plants when the camera pans", () => {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2);
  const flora = [0, 20].map(x => ({ x, z: 0, scale: 1 }));
  const frustum = new THREE.Frustum(), camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 20);
  const light = createLighting({ mushrooms: mesh, lamps: mesh, pools: [], flora }, frustum);
  function pan(x) {
    camera.position.set(x, 0, 5); camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    light.update({ player: { x: 0, z: 0 }, time: 1, motion: 0, dt: 0 });
  }
  const color = new THREE.Color(), matrix = new THREE.Matrix4();
  pan(0); assert.equal(mesh.count, 1); mesh.getColorAt(0, color); assert.ok(color.r > 1);
  pan(20); assert.equal(mesh.count, 1); mesh.getMatrixAt(0, matrix); assert.equal(matrix.elements[12], 20);
  mesh.getColorAt(0, color); assert.equal(color.r, 1);
  const version = mesh.instanceMatrix.version; pan(20); assert.equal(mesh.instanceMatrix.version, version);
  pan(50); assert.equal(mesh.visible, false); assert.equal(mesh.count, 0);
  pan(0); assert.equal(mesh.visible, true); mesh.getColorAt(0, color); assert.ok(color.r > 1);
});
