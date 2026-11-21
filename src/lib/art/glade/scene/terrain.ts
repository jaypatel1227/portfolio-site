/** Ash bowl, distant crags and the broken flagstone approach. */
import * as THREE from "three";
import { makeNoise, mulberry32 } from "../math";
import { CAUSEWAY_WIDTH, DOOR, HOME, causewayDistance } from "./layout";

export function buildTerrain(scene: THREE.Scene, seed: number, heightAt: (x: number, z: number) => number): void {
  const rng = mulberry32(seed);
  const noise = makeNoise(seed ^ 0x619);
  const geo = new THREE.PlaneGeometry(340, 340, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  const ash = new THREE.Color(0x42434b);
  const rock = new THREE.Color(0x242630);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    color.copy(ash).lerp(rock, Math.min(1, Math.max(0, y / 18)));
    color.multiplyScalar(0.7 + noise(x * 0.24, z * 0.24) * 0.3);
    if (causewayDistance(x, z) < CAUSEWAY_WIDTH) color.multiplyScalar(0.7);
    color.toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));

  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.22, 1.9), new THREE.MeshStandardMaterial({ color: 0x66626a, roughness: 1 }), 54);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let row = 0; row < 18; row++) {
    const t = row / 17;
    const x = THREE.MathUtils.lerp(HOME.x, DOOR.x, t);
    const z = THREE.MathUtils.lerp(HOME.z, DOOR.z, t);
    for (let col = 0; col < 3; col++) {
      position.set(x + (col - 1) * 1.72 + (rng() - 0.5) * 0.18, -0.04 + rng() * 0.05, z);
      rotation.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.06, -0.25 + (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.06));
      scale.set(0.82 + rng() * 0.18, 1, 0.8 + rng() * 0.2);
      matrix.compose(position, rotation, scale);
      slabs.setMatrixAt(row * 3 + col, matrix);
      slabs.setColorAt(row * 3 + col, color.setHSL(0.09, 0.035, 0.26 + rng() * 0.13));
    }
  }
  scene.add(slabs);
}
