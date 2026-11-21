import * as THREE from "three";
import { detailModel, type DetailKind } from "./detail-models";
import { random, trailX, type Obstacle, type Point } from "./math";
import { PALETTE, rock } from "./models";
import { createSmallProps } from "./props";
import { bakeStack, fill, model, type VoxelModel } from "./slices";

interface Spot extends Point { scale: number; y?: number; angle?: number }
type Batch = (model: VoxelModel, spots: Spot[], palette?: readonly string[]) => THREE.InstancedMesh;
interface Source { kind: DetailKind; mesh: THREE.InstancedMesh; make: () => VoxelModel }

function createScenery(seed: number, batch: Batch, obstacles: Obstacle[]) {
  const rng = random(seed + 300);
  const flower = model(9, 12, 9);
  fill(flower, (x, y, z) => {
    if (y < 8) return Math.abs(x) < 0.6 && Math.abs(z) < 0.6 ? 10 : 0;
    return Math.hypot(x, z) < 3.8 && (Math.abs(x) < 1.6 || Math.abs(z) < 1.6) ? Math.abs(x) + Math.abs(z) < 2 ? 17 : 21 : 0;
  });
  const flowers: Spot[] = [];
  for (let i = 0; i < 150; i++) {
    const x = (rng() - 0.5) * 32, z = (rng() - 0.5) * 29;
    if (Math.abs(x - trailX(z)) < 1.6 || Math.hypot(x, z) > 16 || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) continue;
    flowers.push({ x, z, scale: 0.017 + rng() * 0.017, angle: rng() * 6 });
  }
  const clover = model(11, 3, 11);
  fill(clover, (x, y, z) => y < 2 && [Math.hypot(x - 2, z), Math.hypot(x + 2, z), Math.hypot(x, z - 3)].some((r) => r < 2.3) ? 10 : 0);
  const pebble = model(5, 3, 5);
  fill(pebble, (x, y, z) => x * x + z * z < 5 - y ? y > 1 ? 14 : 13 : 0);
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
  fill(footprint, (x, _y, z) => (x / 2) ** 2 + (z / 4) ** 2 < 1 ? 9 : 0);
  const reed = model(13, 30, 13);
  fill(reed, (x, y, z) => {
    if (Math.abs(z) < 0.7 && (Math.abs(x - y * 0.1) < 0.7 || y < 22 && Math.abs(x + y * 0.2) < 0.7)) return y > 24 ? 16 : 10;
    return 0;
  });
  const pad = model(19, 1, 19);
  fill(pad, (x, _y, z) => Math.hypot(x, z) < 9 && !(x > 0 && z > 0 && Math.abs(x - z) < 2) ? 10 : 0);
  const shore: Spot[] = Array.from({ length: 42 }, (_, i) => {
    const a = i / 42 * Math.PI * 2;
    return { x: -8 + Math.cos(a) * 4.4, z: 1 + Math.sin(a) * 3.25, y: 0.03, scale: 0.014 + rng() * 0.015 };
  });
  const bug = model(5, 3, 7);
  fill(bug, (x, y, z) => (x / 2) ** 2 + (z / 3) ** 2 < 1 && y < 2 ? z > 0 ? 2 : 19 : 0);
  const bugs = batch(bug, flowers.slice(0, 12).map((o) => ({ ...o, scale: 0.012 })));
  bugs.frustumCulled = false;
  const meshes = [batch(flower, flowers), batch(clover, flowers.map((o) => ({ ...o, x: o.x + 0.2, scale: 0.025 }))), batch(pebble, pebbleSpots), batch(footprint, prints), batch(reed, [{ x: -11.7, z: 2.7, scale: 0.038 }, { x: -4.8, z: -0.7, scale: 0.035 }, { x: -7, z: -2.2, scale: 0.043 }]), batch(pad, [{ x: -7.8, z: -0.5, y: 0.14, scale: 0.055 }, { x: -7.1, z: 2.2, y: 0.14, scale: 0.04 }]), batch(rock(seed + 1), shore), bugs];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(0.012, 0.012, 0.012), position = new THREE.Vector3();
  return (visible: boolean, time: number): void => {
    meshes.forEach((mesh) => { mesh.visible = visible; });
    for (let i = 0; i < bugs.count; i++) {
      const o = flowers[i];
      matrix.compose(position.set(o.x + Math.sin(time * 0.3 + i) * 0.3, 0.03, o.z + Math.cos(time * 0.4 + i) * 0.3), rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, time * 0.3 + i), scale);
      bugs.setMatrixAt(i, matrix);
    }
    bugs.instanceMatrix.needsUpdate = true;
  };
}

export function createDetails(seed: number, batch: Batch, sky: THREE.Group, obstacles: Obstacle[], sources: Source[]) {
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), position = new THREE.Vector3();
  const entries = sources.map((source) => ({ ...source, originals: Array.from({ length: source.mesh.count }, (_, i) => { const m = new THREE.Matrix4(); source.mesh.getMatrixAt(i, m); return m; }), high: null as THREE.InstancedMesh | null }));
  let scenery: ReturnType<typeof createScenery> | null = null;
  let small: ReturnType<typeof createSmallProps> | null = null;
  let scheduled = false, detailed = false;
  let latestPlayer: Point = { x: 0, z: 0 };
  const near = (entry: typeof entries[number], matrix: THREE.Matrix4): boolean => {
    position.setFromMatrixPosition(matrix);
    return entry.kind === "ground" || Math.hypot(position.x - latestPlayer.x, position.z - latestPlayer.z) < (entry.kind === "oak" ? 12 : 9);
  };
  function build(): void {
    scheduled = false;
    if (!detailed) return;
    const entry = entries.find((e) => !e.high && e.originals.some((m) => near(e, m)));
    if (entry) {
      const baked = bakeStack(detailModel(entry.make(), seed, entry.kind), PALETTE);
      baked.geometry.scale(0.5, 0.5, 0.5);
      const baseMaterial = entry.mesh.material as THREE.MeshBasicMaterial;
      baked.material.onBeforeCompile = baseMaterial.onBeforeCompile.bind(baseMaterial);
      baked.material.customProgramCacheKey = baseMaterial.customProgramCacheKey.bind(baseMaterial);
      entry.high = new THREE.InstancedMesh(baked.geometry, baked.material, entry.originals.length);
      entry.high.count = 0; entry.high.frustumCulled = false;
      entry.mesh.parent!.add(entry.high);
    } else if (!scenery) scenery = createScenery(seed, batch, obstacles);
    else if (!small) small = createSmallProps(seed, batch, sky);
  }
  return {
    get built() { return entries.filter((e) => e.high).length; },
    update(vertical: number, player: Point, time: number, camera: THREE.OrthographicCamera) {
      detailed = vertical < 18; latestPlayer = player;
      if (detailed && !scheduled && (entries.some((e) => !e.high && e.originals.some((m) => near(e, m))) || !scenery || !small)) {
        scheduled = true;
        if ("requestIdleCallback" in window) window.requestIdleCallback(build, { timeout: 500 });
        else setTimeout(build, 0);
      }
      for (const entry of entries) {
        if (!entry.high) continue;
        let count = 0;
        entry.originals.forEach((matrix, i) => {
          const close = detailed && near(entry, matrix);
          entry.mesh.setMatrixAt(i, close ? zero : matrix);
          if (close) entry.high!.setMatrixAt(count++, matrix);
        });
        entry.high.count = count;
        entry.high.instanceMatrix.needsUpdate = true; entry.mesh.instanceMatrix.needsUpdate = true;
      }
      scenery?.(detailed, time);
      small?.update(time, player, vertical < 10, camera);
    },
  };
}
