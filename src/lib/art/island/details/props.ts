import { smallPlaces } from "./places";
import type { Batch } from "../voxel/batch";
import * as THREE from "three";
import { type Point } from "../math";
import { PALETTE } from "../models/palette";
import { mushroom } from "../models/flora";
import { rock } from "../models/rock";
import { fill, model, type VoxelModel } from "../voxel/grid";
import { createReveal } from "../voxel/reveal";

const COLORS = [...PALETTE, "#c94c54", "#f1ead8", "#273d50", "#79a66a"];
export function createSmallProps(seed: number, batch: Batch, sky: THREE.Group) {
  const places = smallPlaces(seed), meshes: THREE.InstancedMesh[] = [];
  const make = (width: number, height: number, depth: number, sample: (x: number, y: number, z: number) => number) => {
    const m = model(width, height, depth); fill(m, sample); return m;
  };
  function add(m: VoxelModel, at: Point, size: number, y = 0, angle = 0) {
    const mesh = batch(m, [{ ...at, scale: size, y, angle }], COLORS); mesh.visible = false; meshes.push(mesh); return mesh;
  }
  add(make(17, 25, 13, (x, y, z) => {
    if (y < 12) return Math.abs(x) < 1.5 && Math.abs(z) < 1.5 ? x < 0 ? 3 : 4 : 0;
    if (Math.abs(x) <= 6 && Math.abs(z) <= 5 && (y <= 16 || x*x + (y-16)**2 <= 38)) {
      if (z === 5) return y === 18 && Math.abs(x) <= 2 ? 18 : y === 16 || Math.abs(x) === 5 ? 13 : 22;
      return Math.abs(z) === 4 || y === 12 ? 13 : y > 20 && x <= 0 ? 23 : 22;
    }
    return x === 7 && z >= 0 && z < (y >= 21 ? 5 : 2) && y >= 16 && y <= 24 ? 24 : 0;
  }), places.mailbox, 0.045);
  add(make(17, 9, 9, (x, y, z) => {
    if (y < 3 && x > -8 + Math.abs(z) && x < 8 && Math.abs(z) < 2) return y === 0 ? 12 : 11;
    const spiral = Math.hypot(x, y - 5) - Math.atan2(y - 5, x) * 0.45;
    if ((x / 4.5) ** 2 + ((y - 5) / 4) ** 2 + (z / 3) ** 2 < 1) return (spiral + 4) % 2.7 < 1 ? 3 : 16;
    if (x >= 4 && x <= 7 && y <= 3 && Math.abs(z) <= 2) return 11;
    return x === 6 + Number(y > 4) && Math.abs(z) === 2 && y < 7 ? y === 6 ? 2 : 11 : 0;
  }), places.snail, 0.025);
  const trail = make(3, 1, 3, (x, _y, z) => Math.abs(x) + Math.abs(z) < 2 ? 23 : 0);
  const trailSpots = Array.from({ length: 18 }, (_, i) => ({ x: places.snail.x - i * 0.06, z: places.snail.z + Math.sin(i * 0.3) * 0.08, scale: 0.013, y: 0.04 }));
  const trailMesh = batch(trail, trailSpots, COLORS); trailMesh.visible = false; meshes.push(trailMesh);
  add(make(15, 3, 15, (x, y, z) => Math.abs(Math.hypot(x, z) - 5) < 1.2 ? y === 2 && x < 3 ? 18 : y === 0 ? 4 : 16 : 0), places.ring, 0.025, 0.14);
  const letters = ["10001110", "10001001", "10001110", "10001000", "11101000"];
  add(make(19, 17, 1, (x, y) => {
    const row = Math.floor((14 - y) / 2), col = Math.floor((x + 8) / 2);
    return row >= 0 && row < 5 && col >= 0 && col < 8 && letters[row][col] === "1" ? 2 : 3;
  }), places.carving, 0.039, 2.0);
  const cat = add(make(21, 13, 15, (x, y, z) => {
    if (x >= 3 && x <= 8 && z > 1 && z <= 6 && y > 3 && y <= 9) {
      if (z === 6 && y === 7 && (x === 4 || x === 7)) return 2;
      return z >= 5 && y === 6 && x === 6 ? 20 : y < 6 ? 21 : y === 9 && x % 3 === 0 ? 3 : 16;
    }
    if (y > 9 && y < 13 && (x === 3 || x === 8) && z >= 3 && z <= 5) return y > 10 ? 3 : 20;
    if (z > 2 && y <= 4 && Math.abs(Math.hypot(x + 1, z - 1) - 6) < 1.5) return x < 0 ? 3 : 16;
    if ((x / 9) ** 2 + ((y - 4) / 5) ** 2 + (z / 5) ** 2 < 1) return (x + Math.floor(z/2)) % 5 === 0 ? 3 : 16;
    return 0;
  }), places.cat, 0.033, 0.05);
  add(make(17, 17, 5, (x, y, z) => {
    if (y > 13 - Math.abs(x) * 0.5) return 0;
    if (Math.abs(x) < 4 && y <= 10 - Math.abs(x) * 0.35 && z > 0) return x === 2 && y === 5 ? 18 : y === 2 || y === 8 ? 13 : x % 3 === 0 ? 2 : 3;
    return (y + Math.floor(x / 3)) % 4 === 0 ? 3 : 4;
  }), places.door, 0.035, 0.04);
  add(make(15, 14, 9, (x, y, z) => {
    if (y < 5 && Math.abs(x) < 7 && Math.abs(z) < (x > 4 ? 3 : 4)) return y < 2 ? 2 : 3;
    if (y < 13 && x <= 0 && x >= -5 && Math.abs(z) < 3) return y >= 11 ? Math.abs(x + 2) < 2 && Math.abs(z) < 2 ? 2 : 4 : x === 0 && y % 3 === 0 ? 16 : 3;
    return 0;
  }), places.boot, 0.035, 0.02, 0.7);
  add(make(23, 1, 23, (x, _y, z) => Math.hypot(x, z) < 11 && !(x > 0 && z > 0 && Math.abs(x - z) < 3) ? 27 : 0), places.frog, 0.07, 0.15);
  const frog = add(make(13, 8, 13, (x, y, z) => {
    if (Math.abs(x) >= 3 && Math.abs(x) <= 5 && y <= 2 && z >= -5 && z < 2) return z < -3 ? 8 : 10;
    if (y <= 1 && Math.abs(x) >= 2 && Math.abs(x) <= 5 && z >= 2 && z <= 4) return 8;
    if ((x / 5) ** 2 + ((y - 3) / 3) ** 2 + (z / 4) ** 2 < 1) return y < 3 && z > 0 ? 11 : 27;
    if (Math.abs(x) > 1 && Math.abs(x) < 4 && z > 1 && z < 4 && y > 4) return y > 6 ? 2 : 18;
    return 0;
  }), places.frog, 0.04, 0.21);
  add(make(7, 19, 7, (x, y, z) => {
    if (y > 12) return Math.hypot(x,z) <= (y === 15 ? 2 : 1.5) ? y > 16 ? 16 : 23 : 0;
    if (Math.hypot(x, z) < (y > 10 ? 2.5 : 3.4)) return y > 3 && y < 10 && z > 0 ? y === 6 && x === 0 ? 19 : 21 : x < -1 ? 15 : 23;
    return 0;
  }), places.bottle, 0.026, 0.04, 0.7);
  const circle = batch(mushroom(), Array.from({ length: 11 }, (_, i) => ({ x: places.circle.x + Math.cos(i / 11 * Math.PI * 2) * 0.9, z: places.circle.z + Math.sin(i / 11 * Math.PI * 2) * 0.9, scale: 0.035 })), COLORS);
  meshes.push(circle);
  circle.visible = false;
  add(rock(seed + 9), { x: places.hiker.x + 0.23, z: places.hiker.z + 0.5 }, 0.065);
  add(make(15, 38, 11, (x, y, z) => {
    if (y < 11) return Math.abs(x) > 1 && Math.abs(x) < 5 && Math.abs(z) < 3 ? y < 2 ? 2 : 22 : 0;
    if (y < 22 && Math.abs(x) < 6 && Math.abs(z) < 3) return Math.floor(y / 2) % 2 ? 24 : 25;
    if (y >= 22 && y < 29 && Math.abs(x) < 5 && Math.abs(z) < 4) {
      if (z > 2 && y > 23 && y < 27) return Math.abs(x) > 1 && Math.abs(x) < 4 ? y === 25 && Math.abs(x) === 2 ? 21 : 26 : 21;
      return z < -1 && y > 23 ? 3 : 21;
    }
    if (y >= 29 && y < 34 && Math.abs(x) < 5 && Math.abs(z) < 4) return y < 31 ? 25 : 24;
    if (y >= 34 && x * x + z * z + (y - 35) ** 2 < 6) return 25;
    return 0;
  }), places.hiker, 0.04, 0, -0.15);
  const starPoints = [[0, 0], [1, 1.2], [2.6, 1.4], [3.5, 0.3], [2, -0.8], [1, 1.2], [0.7, -1.3]];
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPoints.flatMap(([x, y]) => [x, y, 0]), 3));
  const constellation = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xa8c4bf, size: 1.5, sizeAttenuation: false, depthWrite: false, transparent: true }));
  constellation.visible = false;
  sky.add(constellation);
  const reveal = createReveal(meshes);
  return {
    get amount() { return reveal.amount; },
    update(time: number, player: Point, amount: number, camera: THREE.OrthographicCamera, dt: number) {
      const progress = reveal.update(amount, dt);
      constellation.visible = progress > 0;
      constellation.material.opacity = progress;
      constellation.position.set(camera.left + (camera.right - camera.left) * 0.18, camera.top - (camera.top - camera.bottom) * 0.2, -148);
      constellation.scale.setScalar((camera.top - camera.bottom) * 0.025);
      cat.position.y = Math.sin(time * 1.7) * 0.012;
      frog.position.y = Math.hypot(player.x - places.frog.x, player.z - places.frog.z) < 3 ? Math.max(0, Math.sin(time * 4)) * 0.45 : 0;
      const near = Math.max(0, 1 - Math.hypot(player.x - places.circle.x, player.z - places.circle.z) / 3);
      (circle.material as THREE.MeshBasicMaterial).color.setRGB(1 + near, 1 + near * 0.6, 1 + near * 0.2);
    },
  };
}
