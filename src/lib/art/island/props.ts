import * as THREE from "three";
import { random, type Point } from "./math";
import { PALETTE, mushroom, rock } from "./models";
import { fill, model, type VoxelModel } from "./slices";

const COLORS = [...PALETTE, "#c94c54", "#f1ead8", "#273d50", "#79a66a"];
export function smallPlaces(seed: number) {
  const rng = random(seed + 819);
  return {
    mailbox: { x: 12.2, z: 1.2 }, snail: { x: -10.4, z: -3.6 }, ring: { x: -8.9, z: 2.1 },
    carving: { x: 2.4, z: -4.08 }, cat: { x: 10.5, z: 2.14 }, door: { x: 3.1, z: -3.18 },
    boot: { x: -2.4, z: 9.1 }, camp: { x: 8.1, z: -6.0 }, frog: { x: -10.2, z: 0.5 },
    bottle: { x: -4.7, z: -1.4 }, circle: { x: -8.1, z: -7.1 },
    hiker: { x: -6.4 + rng() * 0.6, z: -9.5 + rng() * 0.5 },
  };
}

export function createSmallProps(seed: number, batch: (m: VoxelModel, spots: { x: number; z: number; scale: number; y?: number; angle?: number }[], palette?: readonly string[]) => THREE.InstancedMesh, sky: THREE.Group) {
  const places = smallPlaces(seed), meshes: THREE.InstancedMesh[] = [];
  const make = (width: number, height: number, depth: number, sample: (x: number, y: number, z: number) => number) => {
    const m = model(width, height, depth); fill(m, sample); return m;
  };
  function add(m: VoxelModel, at: Point, size: number, y = 0, angle = 0) {
    const mesh = batch(m, [{ ...at, scale: size, y, angle }], COLORS); mesh.visible = false; mesh.frustumCulled = false; meshes.push(mesh); return mesh;
  }
  add(make(17, 25, 13, (x, y, z) => {
    if (y < 12) return Math.abs(x) < 1 && Math.abs(z) < 1 ? 4 : 0;
    if (Math.abs(x) < 7 && Math.abs(z) < 5 && y < 22 - Math.abs(x) * 0.3) return z > 3 ? 2 : 22;
    return x > 6 && x < 8 && y > 16 && y < 23 && z > 0 && z < 4 ? 24 : 0;
  }), places.mailbox, 0.045);
  add(make(17, 9, 9, (x, y, z) => {
    if (y < 3 && Math.abs(x) < 8 && Math.abs(z) < 2) return 11;
    if ((x / 4) ** 2 + ((y - 5) / 4) ** 2 + (z / 3) ** 2 < 1) return Math.floor(Math.hypot(x, y - 5) * 1.5) % 3 === 0 ? 3 : 17;
    return x > 5 && x < 7 && Math.abs(z) > 1 && Math.abs(z) < 3 && y < 6 ? y > 3 ? 2 : 11 : 0;
  }), places.snail, 0.025);
  const trail = make(3, 1, 3, (x, _y, z) => Math.abs(x) + Math.abs(z) < 2 ? 23 : 0);
  const trailSpots = Array.from({ length: 18 }, (_, i) => ({ x: places.snail.x - i * 0.06, z: places.snail.z + Math.sin(i * 0.3) * 0.08, scale: 0.013, y: 0.04 }));
  const trailMesh = batch(trail, trailSpots, COLORS); trailMesh.visible = false; meshes.push(trailMesh);
  add(make(15, 3, 15, (x, y, z) => Math.abs(Math.hypot(x, z) - 5) < 1.2 ? y > 1 ? 18 : 16 : 0), places.ring, 0.025, 0.14);
  const letters = ["10001110", "10001001", "10001110", "10001000", "11101000"];
  add(make(19, 17, 1, (x, y) => {
    const row = Math.floor((14 - y) / 2), col = Math.floor((x + 8) / 2);
    return row >= 0 && row < 5 && col >= 0 && col < 8 && letters[row][col] === "1" ? 2 : 3;
  }), places.carving, 0.039, 2.0);
  add(make(45, 12, 24, (x, y, z) => {
    if (y === 5 || y === 6) return Math.floor(x) % 7 === 0 ? 3 : 4;
    if (Math.abs(x) > 19 && Math.abs(z) > 8) return 3;
    return 0;
  }), { x: 10, z: 1.3 }, 0.08);
  const cat = add(make(21, 11, 15, (x, y, z) => {
    if ((x / 9) ** 2 + ((y - 4) / 5) ** 2 + (z / 6) ** 2 < 1) return x % 4 === 0 ? 3 : 16;
    if (x > 3 && x < 9 && z > 0 && z < 5 && y < 9) return y === 6 && z > 3 ? 2 : 16;
    return x > 4 && x < 9 && Math.abs(z - 2) > 1 && y > 7 ? 16 : 0;
  }), places.cat, 0.033, 0.05);
  add(make(17, 17, 5, (x, y, z) => {
    if (y > 13 - Math.abs(x) * 0.5) return 0;
    if (Math.abs(x) < 4 && y < 10 && z > 0) return x === 2 && y === 5 ? 18 : 2;
    return 4;
  }), places.door, 0.035, 0.04);
  add(make(15, 14, 9, (x, y, z) => y < 4 && Math.abs(x) < 7 && Math.abs(z) < 4 || y < 13 && x < 1 && x > -5 && Math.abs(z) < 3 ? y < 2 ? 2 : 3 : 0), places.boot, 0.035, 0.02, 0.7);
  const fire = add(make(21, 21, 21, (x, y, z) => {
    const r = Math.hypot(x, z);
    if (y < 3 && r > 7 && r < 10) return 13;
    if (y < 5 && (Math.abs(x) < 2 || Math.abs(z) < 2) && r < 7) return 3;
    return y > 3 && r < (20 - y) * 0.24 && y < 18 + Math.sin(x * 3 + z) * 2 ? y > 10 ? 18 : 24 : 0;
  }), places.camp, 0.045);
  add(make(23, 25, 5, (x, y, z) => {
    if (Math.abs(x - y * 0.42 + 4) < 0.7 && Math.abs(z) < 1) return 4;
    return y > 17 && y < 24 && x > 1 && x < 8 && Math.abs(z) < 2 ? 25 : 0;
  }), { x: places.camp.x + 0.6, z: places.camp.z + 0.3 }, 0.035);
  add(make(23, 1, 23, (x, _y, z) => Math.hypot(x, z) < 11 && !(x > 0 && z > 0 && Math.abs(x - z) < 3) ? 27 : 0), places.frog, 0.07, 0.15);
  const frog = add(make(13, 8, 13, (x, y, z) => {
    if ((x / 5) ** 2 + ((y - 3) / 3) ** 2 + (z / 4) ** 2 < 1) return 27;
    if (Math.abs(x) > 1 && Math.abs(x) < 4 && z > 1 && z < 4 && y > 4) return y > 6 ? 2 : 18;
    return 0;
  }), places.frog, 0.04, 0.21);
  add(make(7, 19, 7, (x, y, z) => {
    if (y > 12) return Math.abs(x) < 1.5 && Math.abs(z) < 1.5 ? y > 16 ? 16 : 23 : 0;
    if (Math.hypot(x, z) < 3) return y > 3 && y < 10 && z > 0 ? 21 : 23;
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
      return 21;
    }
    if (y >= 29 && y < 34 && Math.abs(x) < 5 && Math.abs(z) < 4) return y < 31 ? 25 : 24;
    if (y >= 34 && x * x + z * z + (y - 35) ** 2 < 6) return 25;
    return 0;
  }), places.hiker, 0.04, 0, -0.15);
  const starPoints = [[0, 0], [1, 1.2], [2.6, 1.4], [3.5, 0.3], [2, -0.8], [1, 1.2], [0.7, -1.3]];
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPoints.flatMap(([x, y]) => [x, y, 0]), 3));
  const constellation = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xa8c4bf, size: 1.5, sizeAttenuation: false, depthWrite: false }));
  constellation.visible = false;
  sky.add(constellation);
  return {
    update(time: number, player: Point, visible: boolean, camera: THREE.OrthographicCamera) {
      for (const mesh of meshes) mesh.visible = visible;
      constellation.visible = visible;
      constellation.position.set(camera.left + (camera.right - camera.left) * 0.18, camera.top - (camera.top - camera.bottom) * 0.2, -148);
      constellation.scale.setScalar((camera.top - camera.bottom) * 0.025);
      cat.position.y = Math.sin(time * 1.7) * 0.012;
      frog.position.y = Math.hypot(player.x - places.frog.x, player.z - places.frog.z) < 3 ? Math.max(0, Math.sin(time * 4)) * 0.45 : 0;
      (fire.material as THREE.MeshBasicMaterial).color.setScalar(1.05 + Math.sin(time * 11) * 0.16);
      const near = Math.max(0, 1 - Math.hypot(player.x - places.circle.x, player.z - places.circle.z) / 3);
      (circle.material as THREE.MeshBasicMaterial).color.setRGB(1 + near, 1 + near * 0.6, 1 + near * 0.2);
    },
  };
}
