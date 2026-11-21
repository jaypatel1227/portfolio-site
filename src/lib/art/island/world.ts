import * as THREE from "three";
import { createLife } from "./life";
import { createDetails } from "./details";
import { pineSpots, pineObstacles } from "./trees";
import { random, trailX, type Obstacle } from "./math";
import { bakeStack, fill, model, pixelTexture, type VoxelModel } from "./slices";
import { PALETTE, island, pine, greatTree, cabin, rock, lantern, mushroom, grass, sign, character } from "./models";

export const HOME = { x: trailX(12), z: 12 };
export const NOTE = { x: 2, z: -2.7 };

export function createWorld(seed: number) {
  const scene = new THREE.Scene();
  const rng = random(seed);
  scene.background = new THREE.Color("#101b2b");
  const sky = new THREE.Group();
  const moonArt = document.createElement("canvas"); moonArt.width = moonArt.height = 32;
  const moonCtx = moonArt.getContext("2d")!;
  for (let y = -15; y <= 15; y++) for (let x = -15; x <= 15; x++) {
    if (x * x + y * y > 225) continue;
    moonCtx.fillStyle = x * x + y * y > 185 ? "#789795" : (x - 5) ** 2 + (y + 3) ** 2 < 22 || (x + 7) ** 2 + (y - 5) ** 2 < 9 ? "#a5bcb1" : "#dce0b7";
    moonCtx.fillRect(16 + x, 16 + y, 1, 1);
  }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTexture(moonArt), depthWrite: false }));
  sky.add(moon);
  const starSpots = Array.from({ length: 95 }, () => ({ x: rng(), y: rng() * 0.44 }));
  const starPositions = new Float32Array(starSpots.length * 3);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  sky.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x7d969e, size: 1, sizeAttenuation: false, depthWrite: false })));
  const obstacles: Obstacle[] = [{ x: 2, z: -5, r: 1.15 }, { x: 10, z: -1, r: 2.35 }, { x: -8, z: 1, r: 4.1 }];
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  interface Spot { x: number; z: number; scale: number; y?: number; angle?: number; sy?: number }
  function batch(voxels: VoxelModel, spots: Spot[], palette: readonly string[] = PALETTE): THREE.InstancedMesh {
    const baked = bakeStack(voxels, palette);
    const mesh = new THREE.InstancedMesh(baked.geometry, baked.material, spots.length);
    spots.forEach((spot, i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, spot.angle ?? 0);
      matrix.compose(p.set(spot.x, spot.y ?? 0, spot.z), q, s.set(spot.scale, spot.sy ?? spot.scale, spot.scale));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
    return mesh;
  }
  const ground = batch(island(seed), [{ x: 0, z: 0, scale: 0.44, y: -2.86 }]);
  const treeSpots = pineSpots(rng);
  obstacles.push(...pineObstacles(treeSpots));
  const pines = batch(pine(seed), treeSpots);
  const oak = batch(greatTree(seed), [{ x: 2, z: -5, scale: 0.16 }]);
  const cabinMesh = batch(cabin(), [{ x: 10, z: -1, scale: 0.13, angle: -0.18 }]);
  batch(sign(), [{ x: -0.6, z: 8, scale: 0.085, angle: -0.3 }]);
  const board = model(16, 15, 3);
  fill(board, (x, y) => Math.abs(x) > 6 || y < 2 || y > 12 ? 3 : 21);
  batch(board, [{ x: NOTE.x, z: NOTE.z + 0.3, scale: 0.085, y: 1.05 }]);

  const shore = model(41, 5, 31);
  fill(shore, (x, y, z) => (x / 20) ** 2 + (z / 15) ** 2 < 1 && ((x / 17) ** 2 + (z / 12) ** 2 > 1 || y < 2) ? y > 2 ? 14 : 13 : 0);
  batch(shore, [{ x: -8, z: 1, scale: 0.25, y: -0.85 }]);
  const water = model(35, 2, 25);
  fill(water, (x, y, z) => (x / 17) ** 2 + (z / 12) ** 2 < 1 ? (Math.sin(x * 0.8 + z * 0.4) > 0.92 ? 23 : 22) : 0);
  const pond = batch(water, [{ x: -8, z: 1, scale: 0.25, y: -0.32 }]);
  const stones: Spot[] = [{ x: -4, z: 10, scale: 0.12 }, { x: 5, z: 8, scale: 0.09 }, { x: -1, z: -3, scale: 0.1 }, { x: 6, z: -8, scale: 0.12 }];
  for (let i = 0; i < 26; i++) {
    const angle = rng() * Math.PI * 2, r = 11 + rng() * 7;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r * 0.85;
    stones.push({ x, z, scale: 0.045 + rng() * 0.065, angle: rng() * 6 });
  }
  stones.forEach((o) => obstacles.push({ x: o.x, z: o.z, r: o.scale * 5 }));
  const rocks = batch(rock(seed), stones);
  const lamps = [{ x: 4.4, z: 11, scale: 0.09 }, { x: -0.7, z: 3.7, scale: 0.09 }, { x: 4.2, z: -1.5, scale: 0.09 }, { x: 8, z: 1.8, scale: 0.09 }];
  const lanterns = batch(lantern(), lamps);

  function pool(x: number, z: number, size: number, color: string, opacity: number) {
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
  }
  const pools = lamps.map((o) => pool(o.x, o.z, 5.5, "#ffcc7e", 0.42));
  pool(2, -5, 10, "#102332", 0.48);
  pool(10, -1, 6, "#122431", 0.48);
  const flora: Spot[] = [], tufts: Spot[] = [];
  for (let i = 0; i < 420; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
    if (z > -4 && Math.abs(x - trailX(z)) < 1.6 || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) continue;
    tufts.push({ x, z, scale: 0.045 + rng() * 0.035, angle: rng() * Math.PI * 2 });
    if (i % 6 === 0) flora.push({ x: x + 0.3, z, scale: 0.045 + rng() * 0.035 });
  }
  const grassMesh = batch(grass(), tufts), mushrooms = batch(mushroom(), flora);
  const life = createLife(seed, batch, sky, obstacles, { pines, oak, grass: grassMesh, mushrooms, flora, lamps: lanterns, pools });
  const details = createDetails(seed, batch, sky, obstacles, [
    { kind: "ground", mesh: ground, make: () => island(seed) },
    { kind: "oak", mesh: oak, make: () => greatTree(seed) },
    { kind: "cabin", mesh: cabinMesh, make: cabin },
    { kind: "pine", mesh: pines, make: () => pine(seed) },
    { kind: "rock", mesh: rocks, make: () => rock(seed) },
    { kind: "pond", mesh: pond, make: () => water },
  ]);
  const walkerBaked = bakeStack(character(), PALETTE);
  const walker = new THREE.Mesh(walkerBaked.geometry, walkerBaked.material);
  walker.scale.setScalar(0.063); scene.add(walker);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: 0x101c2b, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotateX(-Math.PI / 2); shadow.position.y = 0.05; scene.add(shadow);
  const points = new Float32Array(65 * 3);
  const origins = Array.from({ length: 65 }, () => ({ x: (rng() - 0.5) * 26, z: (rng() - 0.5) * 23, y: 0.4 + rng() * 2.5 }));
  const flies = new THREE.BufferGeometry();
  flies.setAttribute("position", new THREE.BufferAttribute(points, 3));
  scene.add(new THREE.Points(flies, new THREE.PointsMaterial({ color: 0xffdda2, size: 1.6, sizeAttenuation: false })));
  let idle = 0;
  return {
    scene, obstacles, walker, shadow, oak, sky,
    get detailCount() { return details.built; },
    setView(camera: THREE.OrthographicCamera) {
      const width = camera.right - camera.left, height = camera.top - camera.bottom;
      moon.position.set(camera.left + width * 0.8, camera.top - height * 0.13, -150);
      moon.scale.setScalar(height * 0.08);
      starSpots.forEach((star, i) => starPositions.set([camera.left + star.x * width, camera.top - star.y * height, -155], i * 3));
      starGeometry.attributes.position.needsUpdate = true;
      starGeometry.computeBoundingSphere();
      life.setView(camera);
    },
    update(time: number, player: { x: number; z: number }, motion: number, dt: number, vertical: number, camera: THREE.OrthographicCamera) {
      life.update(time, player, motion, dt);
      details.update(vertical, player, time, camera);
      idle = motion > 0.1 ? 0 : idle + dt;
      const gather = THREE.MathUtils.clamp((idle - 2) / 5, 0, 0.85);
      origins.forEach((o, i) => {
        const blend = i < 24 ? gather : 0;
        points.set([THREE.MathUtils.lerp(o.x, player.x + Math.sin(i * 2 + time * 0.6) * 1.6, blend) + Math.sin(time * 0.4 + i) * 0.35,
          o.y + Math.sin(time * 0.7 + i) * 0.2, THREE.MathUtils.lerp(o.z, player.z + Math.cos(i * 2 + time * 0.5) * 1.6, blend) + Math.cos(time * 0.3 + i) * 0.35], i * 3);
      });
      flies.attributes.position.needsUpdate = true;
      flies.computeBoundingSphere();
      pond.position.y = Math.sin(time * 0.6) * 0.015;
    },
  };
}
