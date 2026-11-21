/** Open gothic masonry, a shattered rose, and roof ribs exposed to the ash sky. */
import * as THREE from "three";
import { mulberry32, TAU } from "../math";
import type { Collision } from "../world";
import { CATHEDRAL } from "./layout";
import { beam, box, extrude, makeStone, pointed } from "./masonry";

function rectangle(width: number, height: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  return s;
}

function hole(shape: THREE.Shape, opening: THREE.Shape, x = 0): void {
  const points = opening.getPoints(24).map((p) => new THREE.Vector2(p.x + x, p.y)).reverse();
  shape.holes.push(new THREE.Path(points));
}

function archTrim(parent: THREE.Object3D, material: THREE.Material, width: number, height: number, x: number, y: number, z: number): void {
  const shape = pointed(width + 0.6, height + 0.35, y - 0.12);
  hole(shape, pointed(width, height, y));
  const trim = extrude(shape, 0.24, material);
  trim.position.set(x, 0, z);
  parent.add(trim);
}

export function buildCathedral(scene: THREE.Scene, seed: number, collisions: Collision[]): void {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.position.copy(CATHEDRAL);
  const stone = makeStone(seed);
  const trim = stone.clone();
  trim.color.set(0xc2bcc0);
  const timber = new THREE.MeshStandardMaterial({ color: 0x1c171a, roughness: 1 });
  const facade = new THREE.Shape();
  facade.moveTo(-7, 0);
  facade.lineTo(7, 0);
  facade.lineTo(7, 15);
  facade.lineTo(4.5, 18);
  facade.lineTo(3.6, 17.4);
  facade.lineTo(2.8, 18.8);
  facade.lineTo(2.1, 17.9);
  facade.lineTo(0, 20);
  facade.lineTo(-5, 17);
  facade.lineTo(-7, 15);
  facade.closePath();
  hole(facade, pointed(3.5, 6));
  const roseHole = new THREE.Path();
  roseHole.absarc(0, 11.1, 2.6, 0, TAU, true);
  facade.holes.push(roseHole);
  const front = extrude(facade, 1.05, stone);
  front.position.z = 6;
  group.add(front);
  archTrim(group, trim, 3.5, 6, 0, 0, 7.08);
  archTrim(group, stone, 4.6, 6.6, 0, 0, 6.98);
  box(group, stone, 0, -0.08, 8.4, 5.4, 0.18, 2.6);
  const doorway = extrude(pointed(3.4, 5.95), 0.1, new THREE.MeshBasicMaterial({ color: 0x030305 }));
  doorway.position.z = 4.5;
  group.add(doorway);

  for (const x of [-5.2, 5.2]) {
    box(group, trim, x, 0, 7.0, 0.65, 15.8, 0.65);
    box(group, stone, x, 0, 7.7, 1.15, 5.5, 2.0);
    box(group, trim, x, 5.4, 7.5, 1.35, 0.35, 1.8);
  }
  box(group, trim, 0, 7.25, 7.04, 13.2, 0.35, 0.5);
  const ring = (radius: number, tube: number, x: number, y: number): void => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 64), trim);
    mesh.position.set(x, y, 7.16);
    group.add(mesh);
  };
  ring(2.64, 0.22, 0, 11.1);
  ring(2.9, 0.12, 0, 11.1);
  ring(0.7, 0.12, 0, 11.1);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.012), side: THREE.DoubleSide }));
  glass.position.set(0, 11.1, 6.65);
  group.add(glass);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r = 2.5;
    beam(group, trim, new THREE.Vector3(Math.cos(a) * 0.7, 11.1 + Math.sin(a) * 0.7, 7.16), new THREE.Vector3(Math.cos(a) * r, 11.1 + Math.sin(a) * r, 7.16), 0.085);
    const opening = a + TAU / 24;
    ring(0.36, 0.065, Math.cos(opening) * 1.78, 11.1 + Math.sin(opening) * 1.78);
  }
  const light = new THREE.PointLight(0xff9b3a, 80, 22, 2);
  light.position.set(0, 8.2, 8.5);
  group.add(light);

  for (const side of [-1, 1]) {
    for (let bay = 0; bay < 4; bay++) {
      const z = 2 - bay * 5;
      const shape = rectangle(5, 12.8 + (bay === 3 ? -2 : 0));
      hole(shape, pointed(2.2, 7.5, 3.0));
      const wall = extrude(shape, 0.85, stone);
      wall.rotation.y = Math.PI / 2;
      wall.position.set(side * 7, 0, z);
      group.add(wall);
      const buttress = box(group, stone, side * 8.0, 0, z + 2.4, 1.8, 7.8, 1.25);
      buttress.rotation.z = side * 0.035;
      box(group, trim, side * 8, 7.5, z + 2.4, 2.0, 0.35, 1.5);
      box(group, stone, side * 7.5, 7.8, z + 2.4, 1.1, 5.3, 0.9);
      for (let k = -2; k <= 2; k++) collisions.push({ x: CATHEDRAL.x + side * 7.35, z: CATHEDRAL.z + z + k, r: 0.85 });
      collisions.push({ x: CATHEDRAL.x + side * 8, z: CATHEDRAL.z + z + 2.4, r: 1.2 });
    }
  }
  for (let bay = 0; bay < 4; bay++) {
    const z = 3 - bay * 5;
    const left = [new THREE.Vector3(-6.7, 12.8, z), new THREE.Vector3(-4.4, 16.8, z), new THREE.Vector3(0, 19.4, z)];
    const right = [new THREE.Vector3(6.7, 12.8, z), new THREE.Vector3(4.2, 17, z), new THREE.Vector3(0, 19.4, z)];
    for (const points of bay === 1 ? [left] : [left, right]) {
      const curve = new THREE.CatmullRomCurve3(points);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 6, false), trim));
    }
    if (bay !== 2) beam(group, timber, new THREE.Vector3(-6.6, 12.5, z), new THREE.Vector3(bay === 1 ? -1.5 : 6.6, 12.5, z), 0.18);
    beam(group, timber, new THREE.Vector3(-4.8, 16, z), new THREE.Vector3(-4.8, 16.3, z - 3.4), 0.1);
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute("position", new THREE.Float32BufferAttribute([
    -7, 13, -12, -1, 18.7, -12, -5, 15.2, -7,
    -7, 13, -12, -5, 15.2, -7, -7, 13, -6,
  ], 3));
  roof.computeVertexNormals();
  group.add(new THREE.Mesh(roof, new THREE.MeshStandardMaterial({ color: 0x30323b, roughness: 1, side: THREE.DoubleSide })));

  const tower = new THREE.Group();
  tower.position.set(8.2, 0, -8);
  for (let face = 0; face < 4; face++) {
    const wall = new THREE.Shape();
    wall.moveTo(-2.25, 0);
    wall.lineTo(2.25, 0);
    wall.lineTo(2.25, 25.5);
    wall.lineTo(1.6, 27.5);
    wall.lineTo(0.8, 26.2);
    wall.lineTo(-0.1, 28.2);
    wall.lineTo(-0.8, 25.5);
    wall.lineTo(-2.25, 26.5);
    wall.closePath();
    hole(wall, pointed(1.5, 5, 18.7));
    const mesh = extrude(wall, 0.65, stone);
    const side = new THREE.Group();
    mesh.position.z = 2.25;
    side.add(mesh);
    side.rotation.y = face * Math.PI / 2;
    tower.add(side);
  }
  for (const y of [7, 16.5, 24.5]) box(tower, trim, 0, y, 0, 5.2, 0.4, 5.2);
  for (const x of [-2.2, 2.2]) for (const z of [-2.2, 2.2]) box(tower, stone, x, 0, z, 0.8, 25.5, 0.8);
  group.add(tower);
  collisions.push({ x: CATHEDRAL.x + 8.2, z: CATHEDRAL.z - 8, r: 3.4 });
  for (let x = -6; x <= 6; x += 1.2) if (Math.abs(x) > 2.2) collisions.push({ x: CATHEDRAL.x + x, z: CATHEDRAL.z + 6.5, r: 0.9 });

  for (let i = 0; i < 75; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (6 + rng() * 5), z = -16 + rng() * 26;
    const size = 0.25 + rng() * 0.75;
    const rubble = box(group, stone, x, 0, z, size * 1.5, size, size * 0.8);
    rubble.rotation.set(rng() * 0.6, rng() * TAU, rng() * 0.7);
    if (size > 0.8) collisions.push({ x: CATHEDRAL.x + x, z: CATHEDRAL.z + z, r: size });
  }
  scene.add(group);
}
