/** Distant stacked keeps and needle roofs above a sheer, fog-separated crag. */
import * as THREE from "three";
import { mulberry32 } from "../math";
import { CASTLE } from "./layout";
import { box } from "./masonry";

export function buildCastle(scene: THREE.Scene, seed: number): void {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.position.copy(CASTLE);
  const near = new THREE.MeshBasicMaterial({ color: 0x11131d, fog: false });
  const far = new THREE.MeshBasicMaterial({ color: 0x1b1c28, fog: false });
  box(group, far, -3, 0, -9, 26, 8, 16);
  box(group, far, 2, 8, -12, 12, 12, 10);
  box(group, near, 0, 0, 2, 34, 5, 9);
  box(group, near, -2, 5, 0, 13, 14, 9);
  for (let x = -16; x <= 16; x += 2) box(group, near, x, 5, 6.2, 1.1, 1.2, 1.4);
  const towers = [[-15, 0, 17, 2.2], [-7, -8, 28, 2.7], [3, -9, 33, 2.3], [14, -1, 23, 2.5], [8, 4, 16, 1.6]];
  for (const [x, z, height, radius] of towers) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, height, 7), near);
    tower.position.set(x, height / 2, z);
    group.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.4, 10 + radius * 2, 7), near);
    roof.position.set(x, height + 5 + radius, z);
    group.add(roof);
    box(group, near, x, height + 10 + radius * 2, z, 0.13, 3.2, 0.13);
  }
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.32, 0.035) });
  for (const [x, y, z] of [[-7, 20, -5.2], [3, 26, -6.6], [14, 15, 1.6]]) {
    box(group, lit, x, y, z, 0.42, 1.05, 0.1);
  }
  const cragGeo = new THREE.CylinderGeometry(19, 36, 53, 13, 5);
  const pos = cragGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const jag = 1 + Math.sin(a * 7 + Math.floor(y / 9)) * 0.12;
    pos.setXYZ(i, pos.getX(i) * jag, y, pos.getZ(i) * jag);
  }
  cragGeo.computeVertexNormals();
  const crag = new THREE.Mesh(cragGeo, new THREE.MeshStandardMaterial({ color: 0x252735, roughness: 1, flatShading: true }));
  crag.position.y = -26.5;
  group.add(crag);
  for (let i = 0; i < 12; i++) {
    const spur = new THREE.Mesh(new THREE.ConeGeometry(3 + rng() * 4, 13 + rng() * 10, 5), far);
    spur.position.set(-24 + rng() * 48, -18 - rng() * 9, 5 + rng() * 10);
    group.add(spur);
  }
  scene.add(group);

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "rgba(95,101,125,0)");
  gradient.addColorStop(0.5, "rgba(95,101,125,0.35)");
  gradient.addColorStop(1, "rgba(95,101,125,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 128);
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(180, 29), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, fog: false, opacity: 0.34 }));
  mist.position.set(55, 12, -88);
  scene.add(mist);
}
