import * as THREE from "three";
import type { VoxelModel } from "./grid";
import { finish } from "./steps";
import { surfaceLayers, surfaceMesh } from "./surface";

export function solidGeometry(m: VoxelModel, palette: readonly string[]): THREE.BufferGeometry {
  return finish(solidLayers(m, palette));
}

export function* solidLayers(m: VoxelModel, palette: readonly string[]) {
  const mesh = surfaceMesh(m), colors: number[] = [];
  const rgb = palette.map((c) => new THREE.Color(c));
  yield* surfaceLayers(m, true, (f) => {
    mesh.quad(f);
    const light = f.d === 1 ? (f.sign > 0 ? 1 : 0.62) : f.d === 0 ? 0.78 : 0.92;
    const { r, g, b } = rgb[f.ink];
    for (let i = 0; i < 4; i++) colors.push(r * light, g * light, b * light);
  });
  const geometry = mesh.finish();
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
