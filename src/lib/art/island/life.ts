import * as THREE from "three";
import { fish, fox, owl, rabbit } from "./creatures";
import { critterTarget, cycle, fishJump } from "./life-math";
import { movePlayer, random, type Obstacle, type Point } from "./math";
import { fill, model, type VoxelModel } from "./slices";

interface Spot extends Point { scale: number; y?: number; angle?: number; sy?: number }
type Batch = (model: VoxelModel, spots: Spot[]) => THREE.InstancedMesh;

export function createLife(seed: number, batch: Batch, sky: THREE.Group, obstacles: Obstacle[], plants: { pines: THREE.InstancedMesh; oak: THREE.InstancedMesh; grass: THREE.InstancedMesh; mushrooms: THREE.InstancedMesh; flora: Spot[]; lamps: THREE.InstancedMesh; pools: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] }) {
  const rng = random(seed + 741);
  const clock = { value: 0 };
  function wind(mesh: THREE.InstancedMesh, height: number, amplitude: number): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.stackTime = clock;
      shader.vertexShader = `uniform float stackTime;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
        float layer = floor(max(position.y, 0.0) + 0.5) / ${height.toFixed(1)};
        float gust = sin(stackTime * 1.4 + instanceMatrix[3].x * 0.2 + instanceMatrix[3].z * 0.3);
        transformed.x += gust * layer * layer * ${amplitude.toFixed(1)};
        transformed.z += cos(stackTime + instanceMatrix[3].z * 0.2) * layer * layer * ${amplitude.toFixed(1)} * 0.4;
      `);
    };
    material.customProgramCacheKey = () => `stack-wind-${height}-${amplitude}`;
    mesh.frustumCulled = false;
  }
  wind(plants.pines, 47, 2.2); wind(plants.oak, 83, 1.1); wind(plants.grass, 11, 2.4);

  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const color = new THREE.Color();
  function instance(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, size: number, angle = 0, sy = size): void {
    rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
    matrix.compose(position.set(x, y, z), rotation, scale.set(size, sy, size));
    mesh.setMatrixAt(i, matrix);
  }
  function moving(mesh: THREE.InstancedMesh): THREE.InstancedMesh {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; return mesh;
  }
  const puff = model(7, 5, 7);
  fill(puff, (x, y, z) => (x / 3) ** 2 + ((y - 2) / 2.5) ** 2 + (z / 3) ** 2 < 1 ? y > 2 ? 14 : 13 : 0);
  const smoke = moving(batch(puff, Array.from({ length: 8 }, () => ({ x: 11, z: -1.4, scale: 0 }))));
  const leaf = model(5, 1, 7);
  fill(leaf, (x, _y, z) => (x / 2.5) ** 2 + (z / 3.5) ** 2 < 1 ? x < 0 ? 16 : 19 : 0);
  const leafOrigins = Array.from({ length: 18 }, () => ({ x: 2 + (rng() - 0.5) * 9, z: -5 + (rng() - 0.5) * 7, phase: rng() * 8 }));
  const leaves = moving(batch(leaf, leafOrigins.map((o) => ({ ...o, scale: 0.055 }))));
  const ring = model(23, 1, 23);
  fill(ring, (x, _y, z) => Math.hypot(x, z) > 9.5 && Math.hypot(x, z) < 11 ? 23 : 0);
  const ripples = moving(batch(ring, [{ x: -8, z: 1, scale: 0.1 }, { x: -8, z: 1, scale: 0.1 }]));
  const jumpingFish = moving(batch(fish(), [{ x: -8, z: 1, scale: 0.065 }]));
  const foxMesh = moving(batch(fox(), [{ x: 7, z: 5, scale: 0.075 }]));
  const rabbits = moving(batch(rabbit(), [{ x: -3, z: 7, scale: 0.05 }, { x: 6, z: -4, scale: 0.055 }]));
  const animals = [
    { mesh: foxMesh, index: 0, home: { x: 7, z: 5 }, x: 7, z: 5, size: 0.075, phase: rng() * 7, angle: 0 },
    { mesh: rabbits, index: 0, home: { x: -3, z: 7 }, x: -3, z: 7, size: 0.05, phase: rng() * 7, angle: 0 },
    { mesh: rabbits, index: 1, home: { x: 6, z: -4 }, x: 6, z: -4, size: 0.055, phase: rng() * 7, angle: 0 },
  ];
  batch(owl(false), [{ x: 4, z: -3.2, y: 5, scale: 0.08 }]);
  const owlHead = moving(batch(owl(true), [{ x: 4, z: -3.2, y: 5.9, scale: 0.08 }]));
  const owlBlink = moving(batch(owl(true, true), [{ x: 4, z: -3.2, y: 5.9, scale: 0.08 }]));
  const dustModel = model(5, 3, 5);
  fill(dustModel, (x, y, z) => Math.abs(x) + Math.abs(z) < 3 - y * 0.5 ? 11 : 0);
  const dust = moving(batch(dustModel, Array.from({ length: 12 }, () => ({ x: 0, z: 0, scale: 0 }))));
  const footsteps = Array.from({ length: 12 }, () => ({ x: 0, z: 0, born: -100, angle: rng() * 6 }));
  let nextDust = 0, lastStep = -1;
  const shootingGeometry = new THREE.BufferGeometry();
  const shootingPositions = new Float32Array(12 * 3);
  shootingGeometry.setAttribute("position", new THREE.BufferAttribute(shootingPositions, 3));
  const shootingStar = new THREE.Points(shootingGeometry, new THREE.PointsMaterial({ color: 0xc0e8db, size: 1.7, sizeAttenuation: false, depthWrite: false }));
  shootingStar.frustumCulled = false; sky.add(shootingStar);
  let skyLeft = -20, skyTop = 16, skyWidth = 40, skyHeight = 32;
  return {
    setView(camera: THREE.OrthographicCamera) {
      skyLeft = camera.left; skyTop = camera.top; skyWidth = camera.right - camera.left; skyHeight = camera.top - camera.bottom;
    },
    update(time: number, player: Point, motion: number, dt: number) {
      clock.value = time;
      for (let i = 0; i < 8; i++) {
        const t = cycle(time * 0.18 + i / 8, 1);
        instance(smoke, i, 11.25 + t * 0.9 + Math.sin(time + i) * 0.12, 4.3 + t * 3.4, -1.4 + t * 0.2, Math.sin(t * Math.PI) * (0.07 + t * 0.14), i);
      }
      leafOrigins.forEach((o, i) => {
        const t = cycle(time + o.phase, 8);
        instance(leaves, i, o.x + Math.sin(t * 8 + i) * 0.9 + t, 0.1 + (1 - t) * 7.5, o.z + Math.cos(t * 7 + i) * 0.6, 0.055, time * 0.7 + i);
      });
      const jump = cycle(time + 2, 9) * 9;
      jumpingFish.visible = jump < 1.6;
      instance(jumpingFish, 0, -9 + Math.min(jump / 1.6, 1) * 2, -0.25 + fishJump(time + 2), 1, 0.075, 0.3);
      for (let i = 0; i < 2; i++) {
        const t = cycle(time + 2 - 1.6 - i * 0.45, 9) * 9;
        instance(ripples, i, -7, 0.14, 1, t < 2.2 ? 0.035 + t * 0.07 : 0);
      }
      animals.forEach((animal, i) => {
        const target = critterTarget(time, animal.home, animal.phase, player);
        const blend = dt === 0 ? 1 : 1 - Math.exp(-dt * (target.scared ? 3 : 0.8));
        const dx = (target.x - animal.x) * blend, dz = (target.z - animal.z) * blend;
        const next = movePlayer(animal, { x: dx, z: dz }, obstacles, 16);
        if (Math.hypot(dx, dz) > 0.001) animal.angle = Math.atan2(dx, dz) - (i === 0 ? Math.PI / 2 : 0);
        animal.x = next.x; animal.z = next.z;
        const hop = Math.max(0, Math.sin(time * (target.scared ? 13 : 5) + animal.phase));
        instance(animal.mesh, animal.index, animal.x, i === 0 ? hop * 0.06 : hop * (target.scared ? 0.55 : 0.18), animal.z, animal.size, animal.angle);
      });
      const turn = THREE.MathUtils.clamp(Math.atan2(player.x - 4, player.z + 3.2), -1.4, 1.4);
      instance(owlHead, 0, 4, 5.9, -3.2, 0.08, turn);
      instance(owlBlink, 0, 4, 5.9, -3.2, 0.08, turn);
      owlBlink.visible = cycle(time, 5.7) < 0.035; owlHead.visible = !owlBlink.visible;
      plants.pools.forEach((pool, i) => { pool.material.opacity = 0.38 + Math.sin(time * 7 + i * 3) * 0.025 + Math.sin(time * 13 + i) * 0.015; });
      (plants.lamps.material as THREE.MeshBasicMaterial).color.setScalar(0.96 + Math.sin(time * 9) * 0.08);
      plants.flora.forEach((o, i) => {
        const near = Math.max(0, 1 - Math.hypot(o.x - player.x, o.z - player.z) / 1.9);
        const pulse = near * (0.8 + Math.sin(time * 6 + i) * 0.2);
        instance(plants.mushrooms, i, o.x, 0, o.z, o.scale * (1 + pulse * 0.3), 0, o.scale * (1 - pulse * 0.5));
        plants.mushrooms.setColorAt(i, color.setRGB(1 + pulse * 1.5, 1 + pulse * 0.7, 1 + pulse * 0.2));
      });
      if (motion > 0.3 && dt > 0 && Math.floor(time * 9) !== lastStep) {
        lastStep = Math.floor(time * 9);
        const foot = footsteps[nextDust++ % footsteps.length];
        foot.x = player.x; foot.z = player.z; foot.born = time;
      }
      footsteps.forEach((foot, i) => {
        const t = (time - foot.born) / 0.7;
        instance(dust, i, foot.x + Math.cos(foot.angle) * t * 0.3, 0.08 + t * 0.25, foot.z + Math.sin(foot.angle) * t * 0.3, t >= 0 && t < 1 ? (1 - t) * 0.05 : 0);
      });
      const streak = cycle(time + seed % 11, 19) * 19;
      shootingStar.visible = streak < 1.1;
      for (let i = 0; i < 12; i++) {
        const t = streak - i * 0.012;
        shootingPositions.set([skyLeft + skyWidth * (0.85 - t * 0.5), skyTop - skyHeight * (0.045 + t * 0.27), -149], i * 3);
      }
      shootingGeometry.attributes.position.needsUpdate = true;
      for (const mesh of [smoke, leaves, ripples, jumpingFish, foxMesh, rabbits, owlHead, owlBlink, dust, plants.mushrooms]) mesh.instanceMatrix.needsUpdate = true;
      if (plants.mushrooms.instanceColor) plants.mushrooms.instanceColor.needsUpdate = true;
    },
  };
}
