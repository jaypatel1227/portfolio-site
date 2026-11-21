/** Temporary masses for judging the cathedral, spire and distant castle framing. */
import * as THREE from "three";
import type { Collision } from "../world";
import { CASTLE, CATHEDRAL } from "./layout";

export function buildBlockout(scene: THREE.Scene, collisions: Collision[]): void {
  const stone = new THREE.MeshStandardMaterial({ color: 0x373942, roughness: 1 });
  const farStone = new THREE.MeshBasicMaterial({ color: 0x13151e, fog: false });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    scene.add(mesh);
  };
  const { x, z } = CATHEDRAL;
  box(x - 6, 0, z - 6, 2, 18, 16, stone);
  box(x + 6, 0, z - 6, 2, 21, 16, stone);
  box(x, 7, z + 2, 10, 12, 2, stone);
  box(x + 6, 0, z - 8, 4.4, 31, 4.4, stone);
  box(x + 6.7, 31, z - 8, 3, 4, 2.8, stone);
  const window = new THREE.Mesh(new THREE.CircleGeometry(2.8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.25, 0.015) }));
  window.position.set(x, 13, z + 3.02);
  scene.add(window);
  const glow = new THREE.PointLight(0xff9a35, 65, 28, 2);
  glow.position.set(x, 7, z + 6);
  scene.add(glow);
  for (const wallX of [x - 6, x + 6]) {
    for (let wallZ = z - 14; wallZ <= z + 2; wallZ += 1.8) collisions.push({ x: wallX, z: wallZ, r: 1.5 });
  }
  for (let wallX = x - 4; wallX <= x + 4; wallX += 2) {
    if (Math.abs(wallX - x) > 2) collisions.push({ x: wallX, z: z + 2, r: 1.4 });
  }
  box(CASTLE.x, CASTLE.y, CASTLE.z, 22, 12, 12, farStone);
  for (const [offset, h] of [[-11, 23], [-4, 30], [5, 22], [12, 26]]) {
    box(CASTLE.x + offset, CASTLE.y, CASTLE.z, 3.2, h, 4, farStone);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.1, 8, 4), farStone);
    spire.position.set(CASTLE.x + offset, CASTLE.y + h + 4, CASTLE.z);
    spire.rotation.y = Math.PI / 4;
    scene.add(spire);
  }
  const crag = new THREE.Mesh(new THREE.CylinderGeometry(14, 29, 32, 7), new THREE.MeshStandardMaterial({ color: 0x292b35, roughness: 1, flatShading: true }));
  crag.position.set(CASTLE.x, 8, CASTLE.z);
  scene.add(crag);
}
