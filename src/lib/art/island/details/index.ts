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

interface Source { kind: DetailKind; mesh: THREE.InstancedMesh; make: () => VoxelModel }

export function createDetails(seed: number, batch: Batch, sky: THREE.Group, obstacles: Obstacle[], sources: Source[]) {
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), position = new THREE.Vector3();
  const entries = sources.map((source) => ({ ...source, originals: Array.from({ length: source.mesh.count }, (_, i) => { const m = new THREE.Matrix4(); source.mesh.getMatrixAt(i, m); return m; }), high: null as THREE.InstancedMesh | null }));
  let scenery: ReturnType<typeof createScenery> | null = null;
  let small: ReturnType<typeof createSmallProps> | null = null;
  let scheduled = false, detailed = false, disposed = false;
  let latestPlayer: Point = { x: 0, z: 0 };
  const near = (entry: typeof entries[number], matrix: THREE.Matrix4): boolean => {
    position.setFromMatrixPosition(matrix);
    return entry.kind === "ground" || Math.hypot(position.x - latestPlayer.x, position.z - latestPlayer.z) < (entry.kind === "oak" ? DETAIL.oakRadius : DETAIL.nearbyRadius);
  };
  function build(): void {
    scheduled = false;
    if (!detailed || disposed) return;
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
    dispose() { disposed = true; },
    get built() { return entries.filter((e) => e.high).length; },
    update(vertical: number, player: Point, time: number, camera: THREE.OrthographicCamera) {
      detailed = vertical < DETAIL.sceneryHeight; latestPlayer = player;
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
      small?.update(time, player, vertical < DETAIL.discoveryHeight, camera);
    },
  };
}
