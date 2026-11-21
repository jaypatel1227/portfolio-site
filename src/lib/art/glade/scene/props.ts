/** Grave fields, iron watchfires, deadwood and the last growth between the stones. */
import * as THREE from "three";
import { mulberry32, TAU } from "../math";
import type { Collision } from "../world";
import { CATHEDRAL, DOOR, HOME, causewayDistance } from "./layout";
import { box, makeStone, pointed } from "./masonry";

export function buildProps(scene: THREE.Scene, seed: number, heightAt: (x: number, z: number) => number, collisions: Collision[]): { fires: THREE.Vector3[]; update(time: number): void } {
  const rng = mulberry32(seed ^ 0xdead);
  const stone = makeStone(seed ^ 0x570);
  stone.color.set(0x92958d);
  const dummy = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const bark = new THREE.MeshStandardMaterial({ color: 0x18171c, roughness: 1 });
  const branches: THREE.Matrix4[] = [];
  const addBranch = (from: THREE.Vector3, to: THREE.Vector3, radius: number): void => {
    const delta = to.clone().sub(from);
    dummy.position.copy(from).add(to).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize());
    dummy.scale.set(radius, delta.length(), radius);
    dummy.updateMatrix();
    branches.push(dummy.matrix.clone());
  };
  const grow = (from: THREE.Vector3, direction: THREE.Vector3, length: number, radius: number, depth: number): void => {
    const bend = direction.clone().add(new THREE.Vector3((rng() - 0.5) * 0.9, 0.1, (rng() - 0.5) * 0.9)).normalize();
    const middle = from.clone().addScaledVector(bend, length * 0.55);
    const end = middle.clone().addScaledVector(bend.clone().add(new THREE.Vector3((rng() - 0.5) * 0.65, 0.2, (rng() - 0.5) * 0.65)).normalize(), length * 0.45);
    addBranch(from, middle, radius);
    addBranch(middle, end, radius * 0.77);
    if (depth === 0) return;
    for (let i = 0; i < 2; i++) {
      const angle = rng() * TAU;
      grow(end, new THREE.Vector3(Math.cos(angle) * 0.85 + bend.x * 0.5, 0.5 + rng() * 0.6, Math.sin(angle) * 0.85 + bend.z * 0.5).normalize(), length * (0.6 + rng() * 0.18), radius * 0.55, depth - 1);
    }
  };
  const treePositions = [[-20, 13, 1.3], [25, 10, 1.15], [-27, -22, 1.1], [35, -24, 1.3]];
  for (let i = 0; i < 25; i++) {
    const angle = rng() * TAU, radius = 28 + rng() * 42;
    treePositions.push([Math.cos(angle) * radius, Math.sin(angle) * radius - 18, 0.55 + rng() * 0.65]);
  }
  for (const [x, z, size] of treePositions) {
    if (causewayDistance(x, z) < 10 || Math.hypot(x - CATHEDRAL.x, z - CATHEDRAL.z) < 17) continue;
    const base = new THREE.Vector3(x, heightAt(x, z), z);
    grow(base, new THREE.Vector3((rng() - 0.5) * 0.3, 1, (rng() - 0.5) * 0.3), 4.5 * size, 0.55 * size, 4);
    collisions.push({ x, z, r: 0.7 * size });
  }
  const wood = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.68, 1, 1, 5), bark, branches.length);
  branches.forEach((m, i) => wood.setMatrixAt(i, m));
  scene.add(wood);

  const round = new THREE.Shape();
  round.moveTo(-0.65, 0); round.lineTo(0.65, 0); round.lineTo(0.65, 1.25);
  round.absarc(0, 1.25, 0.65, 0, Math.PI, false); round.closePath();
  const cross = new THREE.Shape();
  cross.moveTo(-0.2, 0); cross.lineTo(0.2, 0); cross.lineTo(0.2, 1.35);
  cross.lineTo(0.8, 1.35); cross.lineTo(0.8, 1.7); cross.lineTo(0.2, 1.7);
  cross.lineTo(0.2, 2.35); cross.lineTo(-0.2, 2.35); cross.lineTo(-0.2, 1.7);
  cross.lineTo(-0.8, 1.7); cross.lineTo(-0.8, 1.35); cross.lineTo(-0.2, 1.35); cross.closePath();
  const broken = new THREE.Shape();
  broken.moveTo(-0.65, 0); broken.lineTo(0.65, 0); broken.lineTo(0.65, 0.9);
  broken.lineTo(0.25, 1.1); broken.lineTo(-0.1, 0.8); broken.lineTo(-0.4, 1.2); broken.lineTo(-0.65, 1); broken.closePath();
  const shapes = [round, pointed(1.2, 2.1), cross, broken];
  const graveStone = stone.clone();
  graveStone.color.set(0xadb0a3);
  graveStone.emissiveIntensity = 0.3;
  const inscription = document.createElement("canvas"); inscription.width = 256; inscription.height = 384;
  const ink = inscription.getContext("2d")!;
  ink.fillStyle = "#676966"; ink.fillRect(0, 0, 256, 384);
  for (let i = 0; i < 2400; i++) {
    ink.fillStyle = i % 2 ? "rgba(12,17,12,0.12)" : "rgba(175,171,160,0.1)";
    ink.fillRect(rng() * 256, rng() * 384, 2 + rng() * 14, 1 + rng() * 5);
  }
  ink.strokeStyle = "#30352e"; ink.lineWidth = 3;
  ink.strokeRect(54, 110, 148, 230); ink.strokeRect(60, 116, 136, 218);
  ink.textAlign = "center"; ink.font = "17px serif";
  for (const [text, y] of [["IN MEMORIAM", 179], ["REST IN ASH", 218], ["MCDLXVII", 258]] as const) {
    ink.fillStyle = "#92928a"; ink.fillText(text, 129, y + 1);
    ink.fillStyle = "#292e2b"; ink.fillText(text, 128, y);
  }
  const graveMap = new THREE.CanvasTexture(inscription); graveMap.colorSpace = THREE.SRGBColorSpace;
  graveStone.map = graveStone.bumpMap = graveStone.emissiveMap = graveMap; graveStone.bumpScale = 0.045;
  const graves = shapes.map(s => {
    const geometry = new THREE.ExtrudeGeometry(s, { depth: 0.23, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.025, bevelSegments: 2, steps: 1 });
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 1) / 2, uv.getY(i) / 2.6);
    return new THREE.InstancedMesh(geometry, graveStone, 30);
  });
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.48, 0.115, 5, 20), graveStone, 30);
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 100; i++) {
    const t = 0.15 + rng() * 0.82, side = i % 2 ? 1 : -1;
    const x = THREE.MathUtils.lerp(HOME.x, DOOR.x, t) + side * (5.8 + rng() * 11);
    const z = THREE.MathUtils.lerp(HOME.z, DOOR.z, t) + (rng() - 0.5) * 5;
    if (Math.hypot(x - CATHEDRAL.x, z - CATHEDRAL.z) < 13) continue;
    const type = i % 4, size = 0.65 + rng() * 0.6;
    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.set((rng() - 0.5) * 0.25, (rng() - 0.5) * 0.9, (rng() - 0.5) * 0.5);
    dummy.scale.setScalar(size); dummy.updateMatrix();
    graves[type].setMatrixAt(counts[type], dummy.matrix);
    if (type === 2) {
      matrix.makeTranslation(0, 1.52, 0.16).premultiply(dummy.matrix);
      rings.setMatrixAt(counts[type], matrix);
    }
    counts[type]++;
    if (size > 0.9) collisions.push({ x, z, r: 0.7 * size });
  }
  graves.forEach((mesh, i) => { mesh.count = counts[i]; scene.add(mesh); });
  rings.count = counts[2]; scene.add(rings);

  const pillarGeo = new THREE.CylinderGeometry(0.8, 0.9, 1, 10);
  const pillars = new THREE.InstancedMesh(pillarGeo, stone, 12);
  for (let i = 0; i < 12; i++) {
    const x = CATHEDRAL.x + (i % 2 ? 1 : -1) * (10 + rng() * 5), z = CATHEDRAL.z + 10 + rng() * 11;
    const height = 0.9 + rng() * 3;
    dummy.position.set(x, heightAt(x, z) + height / 2, z);
    dummy.rotation.set(0.03, rng() * TAU, (rng() - 0.5) * 0.25);
    dummy.scale.set(1, height, 1); dummy.updateMatrix(); pillars.setMatrixAt(i, dummy.matrix);
    collisions.push({ x, z, r: 1 });
  }
  scene.add(pillars);
  const arch = new THREE.Group();
  arch.position.set(CATHEDRAL.x - 12, heightAt(CATHEDRAL.x - 12, CATHEDRAL.z + 11) + 0.45, CATHEDRAL.z + 11);
  arch.rotation.set(-Math.PI / 2 + 0.08, 0, -0.4);
  for (let i = 0; i < 10; i++) {
    if (i === 5 || i === 8) continue;
    const a = i / 10 * Math.PI;
    const block = box(arch, stone, Math.cos(a) * 3.3, Math.sin(a) * 3.3, 0, 0.95, 0.9, 0.8);
    block.rotation.z = a - Math.PI / 2;
  }
  scene.add(arch);
  for (let i = -3; i <= 3; i++) collisions.push({ x: arch.position.x + i, z: arch.position.z, r: 0.9 });

  const grassGeo = new THREE.BufferGeometry();
  const vertices: number[] = [];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, x = Math.cos(a) * 0.15, z = Math.sin(a) * 0.15;
    vertices.push(x - 0.009, 0, z, x + 0.009, 0, z, x + Math.cos(a) * 0.15, 0.18 + (i % 5) * 0.045, z + Math.sin(a) * 0.15);
  }
  grassGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); grassGeo.computeVertexNormals();
  const grass = new THREE.InstancedMesh(grassGeo, new THREE.MeshStandardMaterial({ color: 0x30372b, roughness: 1, side: THREE.DoubleSide }), 4800);
  let tufts = 0;
  for (let i = 0; i < 6500 && tufts < 4800; i++) {
    const x = -50 + rng() * 100, z = -62 + rng() * 98;
    const distance = causewayDistance(x, z);
    if ((distance < 2.8 && rng() > 0.1) || Math.hypot(x - CATHEDRAL.x, z - CATHEDRAL.z) < 10) continue;
    dummy.position.set(x, heightAt(x, z) + 0.02, z);
    dummy.rotation.set(0, rng() * TAU, 0);
    dummy.scale.setScalar(0.6 + rng() * 0.8); dummy.updateMatrix(); grass.setMatrixAt(tufts++, dummy.matrix);
  }
  grass.count = tufts; scene.add(grass);

  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const glow = ctx.createRadialGradient(32, 86, 1, 32, 70, 51);
  glow.addColorStop(0, "rgba(255,247,174,1)"); glow.addColorStop(0.2, "rgba(255,187,58,0.95)");
  glow.addColorStop(0.5, "rgba(240,65,8,0.6)"); glow.addColorStop(1, "rgba(150,20,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.moveTo(32, 3); ctx.bezierCurveTo(64, 60, 70, 122, 32, 126); ctx.bezierCurveTo(-10, 122, 14, 58, 32, 3); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  const iron = new THREE.MeshStandardMaterial({ color: 0x17151a, metalness: 0.8, roughness: 0.65 });
  const flames: { sprite: THREE.Sprite; phase: number; base: number }[] = [];
  const lights: { light: THREE.PointLight; phase: number; base: number }[] = [];
  const fires: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.13 + i * 0.15, side = i % 2 ? -1 : 1;
    const x = i === 5 ? CATHEDRAL.x - 3.5 : THREE.MathUtils.lerp(HOME.x, DOOR.x, t) + side * 4.1;
    const z = i === 5 ? CATHEDRAL.z + 9.5 : THREE.MathUtils.lerp(HOME.z, DOOR.z, t);
    const y = heightAt(x, z), group = new THREE.Group(); group.position.set(x, y, z);
    fires.push(new THREE.Vector3(x, y + 2.2, z));
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.28, 0.5, 8, 1, true), iron); bowl.position.y = 1.6; group.add(bowl);
    for (let leg = 0; leg < 3; leg++) {
      const a = leg / 3 * TAU;
      box(group, iron, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 0.12, 1.6, 0.12);
    }
    for (let bar = 0; bar < 8; bar++) {
      const a = bar / 8 * TAU;
      box(group, iron, Math.cos(a) * 0.57, 1.55, Math.sin(a) * 0.57, 0.065, 0.65, 0.065);
    }
    for (let f = 0; f < 3; f++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: f ? 0xffa83c : 0xffeab6, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sprite.position.set((f - 1) * 0.19, 2.05 + f * 0.1, 0); sprite.scale.set(0.85, 1.6, 1); group.add(sprite);
      flames.push({ sprite, phase: rng() * TAU, base: sprite.position.y });
    }
    const base = i === 5 ? 12 : 65;
    const light = new THREE.PointLight(0xff8a32, base, 13, 2); light.position.set(x, y + 2.2, z); scene.add(light); lights.push({ light, phase: i * 1.7, base });
    scene.add(group); collisions.push({ x, z, r: 0.8 });
  }
  return { fires, update(time) {
    for (const { sprite, phase, base } of flames) {
      const flicker = Math.sin(time * 11 + phase) * 0.12 + Math.sin(time * 19 + phase * 2) * 0.08;
      sprite.scale.set(0.78 - flicker * 0.5, 1.45 + flicker, 1);
      sprite.position.y = base + flicker * 0.25;
      sprite.material.opacity = 0.75 + flicker;
    }
    for (const { light, phase, base } of lights) light.intensity = base * (1 + Math.sin(time * 9 + phase) * 0.12 + Math.sin(time * 17 + phase) * 0.07);
  } };
}
