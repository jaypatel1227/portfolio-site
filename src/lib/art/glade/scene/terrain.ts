/** Ash bowl, distant crags and the broken flagstone approach. */
import * as THREE from "three";
import { makeNoise, mulberry32 } from "../math";
import { CAUSEWAY_WIDTH, DOOR, HOME, causewayDistance } from "./layout";
import { makeStone } from "./masonry";

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

  const outline = new THREE.Shape();
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2, radius = 0.48 + rng() * 0.12;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) outline.moveTo(x, y); else outline.lineTo(x, y);
  }
  outline.closePath();
  const slabGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.035, bevelSegments: 2, steps: 1 });
  const uv = slabGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  slabGeo.rotateX(-Math.PI / 2);
  const slabs = new THREE.InstancedMesh(slabGeo, makeStone(seed), 300);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let count = 0;
  for (let row = 0; row < 60; row++) {
    const t = row / 59;
    const x = THREE.MathUtils.lerp(HOME.x, DOOR.x, t);
    const z = THREE.MathUtils.lerp(HOME.z, DOOR.z, t);
    for (let col = 0; col < 5; col++) {
      if (rng() < 0.13) continue;
      const px = x + (col - 2) * 0.93 + (rng() - 0.5) * 0.4;
      const pz = z + (rng() - 0.5) * 0.55;
      position.set(px, heightAt(px, pz) - 0.03 + rng() * 0.015, pz);
      rotation.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.035, rng() * 6.28, (rng() - 0.5) * 0.035));
      scale.set(0.65 + rng() * 0.5, 1, 0.65 + rng() * 0.5);
      matrix.compose(position, rotation, scale);
      slabs.setMatrixAt(count, matrix);
      slabs.setColorAt(count++, color.setHSL(0.09, 0.035, 0.65 + rng() * 0.2));
    }
  }
  slabs.count = count;
  scene.add(slabs);
}
