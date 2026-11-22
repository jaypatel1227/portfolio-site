import { createScenery } from "./scenery";
import type { Batch } from "../voxel/batch";
import { DETAIL } from "../config";
import * as THREE from "three";
import { detailModel, type DetailKind } from "../voxel/detail";
import { type Obstacle, type Point } from "../math";
import { PALETTE } from "../models/palette";
import { createSmallProps } from "./props";
import { bakeStack } from "../voxel/bake";
import { type VoxelModel } from "../voxel/grid";
import { lodNearby, zoomReveal } from "../voxel/reveal-math";
import { createLodSwap } from "../voxel/lod";

interface Source { kind: DetailKind; mesh: THREE.InstancedMesh; make: () => VoxelModel }

export function createDetails(seed: number, batch: Batch, sky: THREE.Group, obstacles: Obstacle[], sources: Source[]) {
  const position = new THREE.Vector3();
  const entries = sources.map((source) => ({
    ...source,
    originals: Array.from({ length: source.mesh.count }, (_, i) => { const m = new THREE.Matrix4(); source.mesh.getMatrixAt(i, m); return m; }),
    high: null as THREE.InstancedMesh | null,
    nearby: Array<boolean>(source.mesh.count).fill(false),
    selected: Array<boolean>(source.mesh.count).fill(false),
    swap: null as ReturnType<typeof createLodSwap> | null,
  }));
  let scenery: ReturnType<typeof createScenery> | null = null;
  let small: ReturnType<typeof createSmallProps> | null = null;
  let scheduled = false, preloading = false, disposed = false, zoomed = false;
  let latestPlayer: Point = { x: 0, z: 0 };
  const distance = (matrix: THREE.Matrix4): number => {
    position.setFromMatrixPosition(matrix);
    return Math.hypot(position.x - latestPlayer.x, position.z - latestPlayer.z);
  };
  const radius = (entry: typeof entries[number]): number => entry.kind === "oak" ? DETAIL.oakRadius : DETAIL.nearbyRadius;
  const needed = (entry: typeof entries[number]): boolean => entry.kind === "ground" || entry.originals.some((matrix) => distance(matrix) < radius(entry) + DETAIL.distanceBand / 2);
  function build(): void {
    scheduled = false;
    if (!preloading || disposed) return;
    const entry = entries.find((e) => !e.high && needed(e));
    if (entry) {
      const baked = bakeStack(detailModel(entry.make(), seed, entry.kind), PALETTE);
      baked.geometry.scale(0.5, 0.5, 0.5);
      const baseMaterial = entry.mesh.material as THREE.MeshBasicMaterial;
      baked.material.onBeforeCompile = baseMaterial.onBeforeCompile.bind(baseMaterial);
      baked.material.customProgramCacheKey = baseMaterial.customProgramCacheKey.bind(baseMaterial);
      entry.high = new THREE.InstancedMesh(baked.geometry, baked.material, entry.originals.length);
      entry.originals.forEach((matrix, i) => entry.high!.setMatrixAt(i, matrix));
      entry.high.visible = false; entry.high.frustumCulled = false;
      entry.swap = createLodSwap(entry.mesh, entry.high, entry.originals);
      entry.mesh.parent!.add(entry.high);
    } else if (!scenery) scenery = createScenery(seed, batch, obstacles);
    else if (!small) small = createSmallProps(seed, batch, sky);
  }
  return {
    dispose() { disposed = true; },
    get built() { return entries.filter((e) => e.high).length; },
    get state() {
      return { scenery: scenery?.amount ?? 0, discoveries: small?.amount ?? 0, lod: entries.map((e) => e.selected.map(Number)) };
    },
    update(vertical: number, player: Point, time: number, camera: THREE.OrthographicCamera, dt: number) {
      preloading = vertical < DETAIL.preloadHeight; latestPlayer = player;
      zoomed = lodNearby(vertical, DETAIL.lodHeight, zoomed, DETAIL.lodBand);
      const amount = zoomReveal(vertical, DETAIL.sceneryHeight, DETAIL.sceneryBand);
      if (preloading && !scheduled && (entries.some((e) => !e.high && needed(e)) || !scenery || !small)) {
        scheduled = true;
        if ("requestIdleCallback" in window) window.requestIdleCallback(build, { timeout: 500 });
        else setTimeout(build, 0);
      }
      for (const entry of entries) {
        if (!entry.high) continue;
        entry.originals.forEach((matrix, i) => {
          entry.nearby[i] = entry.kind === "ground" || lodNearby(distance(matrix), radius(entry), entry.nearby[i], DETAIL.distanceBand);
          entry.selected[i] = zoomed && entry.nearby[i];
        });
        entry.swap!(entry.selected);
        entry.high.position.copy(entry.mesh.position);
      }
      scenery?.update(amount, time, dt);
      small?.update(time, player, zoomReveal(vertical, DETAIL.discoveryHeight, DETAIL.discoveryBand), camera, dt);
    },
  };
}
