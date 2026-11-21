import * as THREE from "three";
import { pixelTexture } from "../voxel/bake";

export function createLightPool(scene: THREE.Scene) {
  return function pool(x: number, z: number, size: number, color: string, opacity: number) {
    const c = document.createElement("canvas"); c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot(x - 15.5, y - 15.5) / 16;
      if (r > 1) continue;
      ctx.globalAlpha = Math.floor((1 - r) * 4) / 4;
      ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: pixelTexture(c), transparent: true, opacity, depthWrite: false }));
    mesh.rotateX(-Math.PI / 2); mesh.position.set(x, 0.04, z); scene.add(mesh);
    return mesh;
  };
}
