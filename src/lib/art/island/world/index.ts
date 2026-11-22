import { createSky } from "./sky";
import { createLightPool } from "./light-pool";
import { createFireflies } from "../life/fireflies";
import { createBatch } from "../voxel/batch";
import { NOTE, stoneSpots, floraSpots } from "./layout";
import { disposeScene } from "./resources";
import * as THREE from "three";
import { createLife } from "../life/index";
import { createDetails } from "../details/index";
import { pineSpots, pineObstacles } from "./trees";
import { random, type Obstacle } from "../math";
import { bakeStack } from "../voxel/bake";
import { fill, model } from "../voxel/grid";
import { PALETTE } from "../models/palette";
import { island } from "../models/ground";
import { pine } from "../models/pine";
import { greatTree } from "../models/oak";
import { cabin } from "../models/cabin";
import { rock } from "../models/rock";
import { lantern, sign } from "../models/props";
import { mushroom, grass } from "../models/flora";
import { character, CHARACTER_SCALE } from "../models/character";
import { createClouds } from "../life/clouds";
import { createAvatar } from "../life/avatar";
import type { Frame } from "../life/types";

export { HOME, NOTE } from "./layout";

export function createWorld(seed: number) {
  const scene = new THREE.Scene();
  const rng = random(seed);
  scene.background = new THREE.Color("#101b2b");
  const { sky, setView: setSkyView } = createSky(rng);
  const obstacles: Obstacle[] = [{ x: 2, z: -5, r: 1.15 }, { x: 10, z: -1, r: 2.35 }, { x: -8, z: 1, r: 4.1 }];
  const batch = createBatch(scene, PALETTE);
  const ground = batch(island(seed), [{ x: 0, z: 0, scale: 0.44, y: -2.86 }]);
  const clouds = createClouds(ground);
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
  const stones = stoneSpots(rng);
  stones.forEach((o) => obstacles.push({ x: o.x, z: o.z, r: o.scale * 5 }));
  const rocks = batch(rock(seed), stones);
  const lamps = [{ x: 4.4, z: 11, scale: 0.09 }, { x: -0.7, z: 3.7, scale: 0.09 }, { x: 4.2, z: -1.5, scale: 0.09 }, { x: 8, z: 1.8, scale: 0.09 }];
  const lanterns = batch(lantern(), lamps);

  const pool = createLightPool(scene);
  const pools = lamps.map((o) => pool(o.x, o.z, 5.5, "#ffcc7e", 0.42));
  pool(2, -5, 10, "#102332", 0.48);
  pool(10, -1, 6, "#122431", 0.48);
  const { flora, tufts } = floraSpots(rng, obstacles);
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
  const walkerBaked = bakeStack(character(), PALETTE, { topTint: 0 });
  const walker = new THREE.Mesh(walkerBaked.geometry, walkerBaked.material);
  walker.scale.setScalar(CHARACTER_SCALE); scene.add(walker);
  const avatar = createAvatar(walker);
  const frame: Frame = { time: 0, player: { x: 0, z: 0 }, motion: 0, dt: 0 };
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: 0x101c2b, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotateX(-Math.PI / 2); shadow.position.y = 0.05; scene.add(shadow);
  const fireflies = createFireflies(scene, rng);
  return {
    scene, obstacles, walker, shadow, sky,
    dispose() { details.dispose(); disposeScene(scene); },
    get detailCount() { return details.built; },
    get detailState() { return details.state; },
    setView(camera: THREE.OrthographicCamera) {
      setSkyView(camera);
      life.setView(camera);
    },
    update(time: number, player: { x: number; z: number }, motion: number, dt: number, vertical: number, camera: THREE.OrthographicCamera) {
      frame.time = time; frame.player = player; frame.motion = motion; frame.dt = dt;
      life.update(frame); clouds.update(frame); avatar.update(frame);
      details.update(vertical, player, time, camera, dt);
      fireflies.update(frame);
      pond.position.y = Math.sin(time * 0.6) * 0.015;
    },
  };
}
