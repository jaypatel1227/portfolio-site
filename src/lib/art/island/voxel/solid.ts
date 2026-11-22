import * as THREE from "three";
import { voxel, type VoxelModel } from "./grid";
import { finish } from "./steps";

/** Merge equal-color rectangles on exposed faces. Rigid parts need no slice atlas. */
export function solidGeometry(m: VoxelModel, palette: readonly string[]): THREE.BufferGeometry {
  return finish(solidLayers(m, palette));
}

export function* solidLayers(m: VoxelModel, palette: readonly string[]) {
  const dims = [m.width, m.height, m.depth], origin = [-m.width / 2, -0.5, -m.depth / 2];
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const rgb = palette.map((c) => new THREE.Color(c));
  for (let d = 0; d < 3; d++) for (const sign of [-1, 1]) {
    const u = (d + 1) % 3, v = (d + 2) % 3, w = dims[u], h = dims[v];
    const mask = new Uint8Array(w * h), p = [0, 0, 0];
    const light = d === 1 ? (sign > 0 ? 1 : 0.62) : d === 0 ? 0.78 : 0.92;
    for (let layer = 0; layer < dims[d]; layer++) {
      yield;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        p[d] = layer; p[u] = i; p[v] = j;
        const c = voxel(m, p[0], p[1], p[2]);
        p[d] += sign;
        mask[j * w + i] = c && !voxel(m, p[0], p[1], p[2]) ? c : 0;
      }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const c = mask[j * w + i];
        if (!c) continue;
        let a = 1, b = 1;
        while (i + a < w && mask[j * w + i + a] === c) a++;
        rows: while (j + b < h) {
          for (let k = 0; k < a; k++) if (mask[(j + b) * w + i + k] !== c) break rows;
          b++;
        }
        for (let k = 0; k < b; k++) mask.fill(0, (j + k) * w + i, (j + k) * w + i + a);
        const start = positions.length / 3;
        for (const [du, dv] of [[0, 0], [a, 0], [a, b], [0, b]]) {
          p[d] = origin[d] + layer + (sign > 0 ? 1 : 0);
          p[u] = origin[u] + i + du; p[v] = origin[v] + j + dv;
          positions.push(p[0], p[1], p[2]);
          colors.push(rgb[c].r * light, rgb[c].g * light, rgb[c].b * light);
        }
        for (const k of sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) indices.push(start + k);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}
