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
  const dirt = new THREE.Color(0x39342f);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    color.copy(ash).lerp(rock, Math.min(1, Math.max(0, y / 18)));
    color.multiplyScalar(0.7 + noise(x * 0.24, z * 0.24) * 0.3);
    color.lerp(dirt, Math.max(0, noise(x * 0.15 + 53, z * 0.15)) * 0.55);
    if (causewayDistance(x, z) < CAUSEWAY_WIDTH) color.multiplyScalar(0.7);
    color.toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const value = 120 + rng() * 65 + noise(x * 0.07, y * 0.07) * 50;
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(70, 70);
  map.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.12, vertexColors: true, roughness: 1, flatShading: true })));

  const slabGeo = new THREE.CylinderGeometry(1, 1.08, 0.24, 5);
  const slabs = new THREE.InstancedMesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0x77717a, roughness: 1 }), 90);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let count = 0;
  for (let row = 0; row < 30; row++) {
    const t = row / 29;
    const x = THREE.MathUtils.lerp(HOME.x, DOOR.x, t);
    const z = THREE.MathUtils.lerp(HOME.z, DOOR.z, t);
    for (let col = 0; col < 3; col++) {
      if (rng() < 0.17) continue;
      const px = x + (col - 1) * 1.65 + (rng() - 0.5) * 0.8;
      const pz = z + (rng() - 0.5) * 1.15;
      position.set(px, heightAt(px, pz) + 0.12 + rng() * 0.08, pz);
      rotation.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.2, rng() * 6.28, (rng() - 0.5) * 0.22));
      scale.set(0.65 + rng() * 0.45, 0.65 + rng() * 0.5, 0.55 + rng() * 0.5);
      matrix.compose(position, rotation, scale);
      slabs.setMatrixAt(count, matrix);
      slabs.setColorAt(count++, color.setHSL(0.09, 0.035, 0.3 + rng() * 0.22));
    }
  }
  slabs.count = count;
  scene.add(slabs);
}
