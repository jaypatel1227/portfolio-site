import * as THREE from "three";
import { random, trailX, type Obstacle } from "../math";
import { rock } from "../models/rock";
import { fill, model } from "../voxel/grid";
import type { Batch, Spot } from "../voxel/batch";
import { createReveal } from "../voxel/reveal";

export function createScenery(seed: number, batch: Batch, obstacles: Obstacle[]) {
  const rng = random(seed + 300);
  const flower = model(9, 12, 9);
  fill(flower, (x, y, z) => {
    if (y < 8) return x === 0 && z === 0 || y >= 3 && y <= 5 && x === y - 4 && z === 1 ? 10 : 0;
    const r = Math.hypot(x, z);
    const petals = 3 + 0.9 * Math.cos(Math.atan2(z, x) * 5);
    return r < 1.5 ? y < 11 ? 17 : 0 : y === 8 + Math.round(r / 2) && r <= petals ? 21 : 0;
  });
  const flowers: Spot[] = [];
  for (let i = 0; i < 150; i++) {
    const x = (rng() - 0.5) * 32, z = (rng() - 0.5) * 29;
    if (Math.abs(x - trailX(z)) < 1.6 || Math.hypot(x, z) > 16 || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) continue;
    flowers.push({ x, z, scale: 0.017 + rng() * 0.017, angle: rng() * 6 });
  }
  const clover = model(11, 3, 11);
  fill(clover, (x, y, z) => y < 2 && [Math.hypot(x - 2, z), Math.hypot(x + 2, z), Math.hypot(x, z - 3)].some((r) => r < 2.3) ? z === 0 || x === 0 ? 8 : 10 : 0);
  const pebble = model(5, 3, 5);
  fill(pebble, (x, y, z) => (x + 0.3 * y) ** 2 + (z * 1.23) ** 2 < 5 - y * 1.3 ? y > 1 ? 14 : 13 : 0);
  const pebbleSpots: Spot[] = [], prints: Spot[] = [];
  for (let i = 0; i < 160; i++) {
    const z = -3 + rng() * 18;
    pebbleSpots.push({ x: trailX(z) + (rng() - 0.5) * 2.2, z, y: 0.03, scale: 0.018 + rng() * 0.025 });
    if (i < 35) {
      const pz = i * 0.42 - 2;
      prints.push({ x: trailX(pz) + (i % 2 ? -0.23 : 0.23), z: pz, y: 0.025, scale: 0.025, angle: 0.2 });
    }
  }
  const footprint = model(5, 1, 9);
  fill(footprint, (x, _y, z) => z !== -1 && (x / 2) ** 2 + (z / 4) ** 2 < 1 ? 9 : 0);
  const reed = model(13, 30, 13);
  fill(reed, (x, y, z) => {
    if (y > 21 && y < 29 && Math.hypot(x - 3, z) < (y === 28 ? 1 : 1.5)) return y > 26 || x > 3 ? 4 : 16;
    if (y < 15 && Math.abs(z + Math.round(y * 0.32)) < 1 && Math.abs(x - y * 0.18) < 1.2) return 8;
    if (Math.abs(z) < 0.7 && (Math.abs(x - y * 0.1) < 0.7 || y < 22 && Math.abs(x + y * 0.2) < 0.7)) return 10;
    return 0;
  });
  const pad = model(19, 1, 19);
  fill(pad, (x, _y, z) => Math.hypot(x, z) < 9 && !(x > 0 && z > 0 && Math.abs(x - z) < 2) ? x === -z && x < 0 ? 8 : 10 : 0);
  const shore: Spot[] = Array.from({ length: 42 }, (_, i) => {
    const a = i / 42 * Math.PI * 2;
    return { x: -8 + Math.cos(a) * 4.4, z: 1 + Math.sin(a) * 3.25, y: 0.03, scale: 0.014 + rng() * 0.015 };
  });
  const bug = model(5, 3, 7);
  fill(bug, (x, y, z) => (x / 2) ** 2 + (z / 3) ** 2 < 1 && y < 2 ? z >= 2 || x === 0 || z === -1 && y > 0 ? 2 : 19 : 0);
  const bugs = batch(bug, flowers.slice(0, 12).map((o) => ({ ...o, scale: 0.012 })));
  bugs.frustumCulled = false;
  const meshes = [batch(flower, flowers), batch(clover, flowers.map((o) => ({ ...o, x: o.x + 0.2, scale: 0.025 }))), batch(pebble, pebbleSpots), batch(footprint, prints), batch(reed, [{ x: -11.7, z: 2.7, scale: 0.038 }, { x: -4.8, z: -0.7, scale: 0.035 }, { x: -7, z: -2.2, scale: 0.043 }]), batch(pad, [{ x: -7.8, z: -0.5, y: 0.14, scale: 0.055 }, { x: -7.1, z: 2.2, y: 0.14, scale: 0.04 }]), batch(rock(seed + 1), shore), bugs];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(0.012, 0.012, 0.012), position = new THREE.Vector3();
  const reveal = createReveal(meshes, 0);
  return {
    get amount() { return reveal.amount; },
    update(amount: number, time: number, dt: number, frustum?: THREE.Frustum): void {
      for (let i = 0; i < bugs.count; i++) {
        const o = flowers[i];
        matrix.compose(position.set(o.x + Math.sin(time * 0.3 + i) * 0.3, 0.03, o.z + Math.cos(time * 0.4 + i) * 0.3), rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, time * 0.3 + i), scale);
        bugs.setMatrixAt(i, matrix);
      }
      bugs.instanceMatrix.needsUpdate = true;
      reveal.update(amount, dt, bugs, frustum);
    },
  };
}
