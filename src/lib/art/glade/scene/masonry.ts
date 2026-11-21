/** Weathered ashlar and small geometry helpers shared by the ruins. */
import * as THREE from "three";
import { mulberry32 } from "../math";

export function makeStone(seed: number): THREE.MeshStandardMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed);
  ctx.fillStyle = "#17181e";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 16; row++) {
    for (let col = -1; col < 9; col++) {
      const x = col * 128 + (row % 2) * 64, y = row * 64;
      const value = 55 + rng() * 27;
      ctx.fillStyle = `rgb(${value * 0.95},${value},${value * 1.08})`;
      ctx.fillRect(x + 3, y + 3, 122, 58);
      ctx.strokeStyle = "rgba(154,151,161,0.22)";
      ctx.strokeRect(x + 5, y + 5, 118, 54);
      if (rng() < 0.4) {
        ctx.strokeStyle = "rgba(8,9,13,0.7)";
        ctx.lineWidth = 1 + rng() * 2;
        ctx.beginPath();
        ctx.moveTo(x + 20 + rng() * 70, y + 4);
        ctx.lineTo(x + 40 + rng() * 50, y + 29);
        ctx.lineTo(x + 25 + rng() * 70, y + 59);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(23,28,23,0.32)";
      ctx.fillRect(x + 3, y + 46, 122, 15);
    }
  }
  for (let i = 0; i < 18000; i++) {
    ctx.fillStyle = rng() < 0.5 ? "rgba(5,6,10,0.15)" : "rgba(170,165,160,0.09)";
    ctx.fillRect(rng() * 1024, rng() * 1024, 1 + rng() * 6, 1 + rng() * 3);
  }
  for (let i = 0; i < 55; i++) {
    const x = rng() * 1024, y = rng() * 1024;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, 45 + rng() * 90);
    stain.addColorStop(0, "rgba(5,6,10,0.32)");
    stain.addColorStop(1, "rgba(5,6,10,0)");
    ctx.fillStyle = stain;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.11, roughness: 0.98, color: 0xd6d9e2, emissiveMap: map, emissive: 0x9099b2, emissiveIntensity: 0.5 });
}

export function pointed(width: number, height: number, base = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, base);
  shape.lineTo(width / 2, base);
  shape.lineTo(width / 2, base + height * 0.56);
  shape.quadraticCurveTo(width / 2, base + height * 0.8, 0, base + height);
  shape.quadraticCurveTo(-width / 2, base + height * 0.8, -width / 2, base + height * 0.56);
  shape.closePath();
  return shape;
}

export function extrude(shape: THREE.Shape, depth: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8);
  return new THREE.Mesh(geometry, material);
}

export function box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const pos = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = Math.abs(normal.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i);
    const v = Math.abs(normal.getY(i)) > 0.5 ? pos.getZ(i) : pos.getY(i);
    uv.setXY(i, (u + x) / 8, (v + y) / 8);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y + h / 2, z);
  parent.add(mesh);
  return mesh;
}

export function beam(parent: THREE.Object3D, material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, radius: number): void {
  const delta = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  parent.add(mesh);
}
