import { createSky } from "./sky";
import { addConveyor } from "./conveyor";
import { TRACK, carryDelta, trackContact, nearTrack, trackFootprints } from "./circuit";
import { createLightPool } from "./light-pool";
import { createFireflies } from "../life/fireflies";
import { createBatch } from "../voxel/batch";
import { createReveal } from "../voxel/reveal";
import { NOTE, stoneSpots, floraSpots } from "./layout";
import { disposeScene } from "./resources";
import * as THREE from "three";
import { createLife } from "../life/index";
import { exhibitFootprints } from "../details/collection";
import { createDetails } from "../details/index";
import { pineSpots, pineObstacles } from "./trees";
import { random, type Obstacle } from "../math";
import { solidGeometry } from "../voxel/solid";
import { fill, model } from "../voxel/grid";
import { PALETTE, CHARACTER_PALETTE } from "../models/palette";
import { island } from "../models/ground";
import { pine } from "../models/pine";
import { greatTree } from "../models/oak";
import { cabin } from "../models/cabin";
import { rock } from "../models/rock";
import { lantern, sign } from "../models/props";
import { mushroom, grass } from "../models/flora";
import { characterParts, CHARACTER_SCALE, type CharacterPart } from "../models/character";
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
  const groundVoxels = island(seed);
  const ground = batch(groundVoxels, [{ x: 0, z: 0, scale: 0.44, y: -2.86 }]);
  const clouds = createClouds(ground);
  const updateBelt = addConveyor(scene);
  const treeSpots = pineSpots(rng);
  obstacles.push(...pineObstacles(treeSpots));
  const pineVoxels = pine(seed);
  const pines = batch(pineVoxels, treeSpots);
  const oakVoxels = greatTree(seed);
  const oak = batch(oakVoxels, [{ x: 2, z: -5, scale: 0.16 }]);
  const cabinVoxels = cabin();
  const cabinMesh = batch(cabinVoxels, [{ x: 10, z: -1, scale: 0.13, angle: -0.18 }]);
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
  const stones = stoneSpots(rng).filter((p) => !nearTrack(p, p.scale * 5 + 0.4) && !exhibitFootprints.some((e) => Math.hypot(p.x - e.x, p.z - e.z) < e.r + p.scale * 5));
  stones.forEach((o) => obstacles.push({ x: o.x, z: o.z, r: o.scale * 5 }));
  const rockVoxels = rock(seed);
  const rocks = batch(rockVoxels, stones);
  const lamps = [{ x: 4.4, z: 11, scale: 0.09 }, { x: -0.7, z: 3.7, scale: 0.09 }, { x: 4.2, z: -1.5, scale: 0.09 }, { x: 8, z: 1.8, scale: 0.09 }];
  const lanterns = batch(lantern(), lamps);

  const pool = createLightPool(scene);
  const pools = lamps.map((o) => pool(o.x, o.z, 5.5, "#ffcc7e", 0.42));
  pool(2, -5, 10, "#102332", 0.48);
  pool(10, -1, 6, "#122431", 0.48);
  const clearings = [...obstacles, ...exhibitFootprints, ...trackFootprints];
  const plants = floraSpots(rng, obstacles);
  const clear = (p: { x: number; z: number }) => !nearTrack(p, 0.35) && !exhibitFootprints.some((e) => Math.hypot(p.x - e.x, p.z - e.z) < e.r + 0.35);
  const flora = plants.flora.filter(clear), tufts = plants.tufts.filter(clear);
  const grassMesh = batch(grass(), tufts), mushrooms = batch(mushroom(), flora);
  const grassView = createReveal([grassMesh], 13);
  const projection = new THREE.Matrix4(), frustum = new THREE.Frustum();
  const life = createLife(seed, batch, sky, obstacles, { pines, oak, grass: grassMesh, mushrooms, flora, lamps: lanterns, pools });
  const details = createDetails(seed, batch, scene, sky, clearings, [
    { kind: "ground", mesh: ground, base: groundVoxels },
    { kind: "oak", mesh: oak, base: oakVoxels },
    { kind: "cabin", mesh: cabinMesh, base: cabinVoxels },
    { kind: "pine", mesh: pines, base: pineVoxels },
    { kind: "rock", mesh: rocks, base: rockVoxels },
    { kind: "pond", mesh: pond, base: water },
  ]);
  const walker = new THREE.Group(), parts = {} as Record<CharacterPart, THREE.Group>;
  const skin = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const { name, voxels, position, offset } of characterParts()) {
    const joint = new THREE.Group(), mesh = new THREE.Mesh(solidGeometry(voxels, CHARACTER_PALETTE), skin);
    joint.position.set(...position); mesh.position.y = offset;
    joint.add(mesh); walker.add(joint); parts[name] = joint;
  }
  walker.scale.setScalar(CHARACTER_SCALE); scene.add(walker);
  const avatar = createAvatar(walker, { head: parts.head, arms: [parts.leftArm, parts.rightArm], legs: [parts.leftLeg, parts.rightLeg] });
  const frame: Frame = { time: 0, player: { x: 0, z: 0 }, motion: 0, dt: 0 };
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: 0x101c2b, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotateX(-Math.PI / 2); shadow.position.y = 0.05; scene.add(shadow);
  const fireflies = createFireflies(scene, rng);
  return {
    scene, obstacles, walker, shadow, sky,
    carryDelta, floorHeight: (p: { x: number; z: number }) => trackContact(p) ? TRACK.height : 0,
    dispose() { details.dispose(); disposeScene(scene); },
    get detailCount() { return details.built; },
    get detailState() { return details.state; },
    setView(camera: THREE.OrthographicCamera) {
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      setSkyView(camera);
      life.setView(camera);
    },
    update(time: number, player: { x: number; z: number }, motion: number, dt: number, vertical: number, camera: THREE.OrthographicCamera) {
      frame.time = time; frame.player = player; frame.motion = motion; frame.dt = dt;
      updateBelt(dt);
      life.update(frame); clouds.update(frame); avatar.update(frame);
      grassView.update(1, 0, undefined, frustum);
      details.update(vertical, player, time, camera, dt, frustum);
      fireflies.update(frame);
      pond.position.y = Math.sin(time * 0.6) * 0.015;
    },
  };
}
