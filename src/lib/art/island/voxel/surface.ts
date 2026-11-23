import * as THREE from "three";
import type { VoxelModel } from "./grid";

export interface Face {
  d: number; sign: number; layer: number; i: number; j: number; w: number; h: number; ink: number;
}

/** Maximal coplanar rectangles. Textured faces can share a quad across palette changes. */
export function* surfaceLayers(m: VoxelModel, byColor: boolean, emit: (face: Face) => void) {
  const dims = [m.width, m.height, m.depth], stride = [1, m.width * m.depth, m.width];
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, w = dims[u], h = dims[v];
    const mask = new Uint8Array(w * h);
    for (const sign of [-1, 1]) for (let layer = 0; layer < dims[d]; layer++) {
      yield;
      const edge = layer + sign < 0 || layer + sign >= dims[d], step = sign * stride[d];
      let hasAny = false;
      for (let j = 0; j < h; j++) {
        let n = layer * stride[d] + j * stride[v];
        const row = j * w;
        for (let i = 0; i < w; i++, n += stride[u]) {
          const c = m.cells[n];
          const v_ = c && (edge || !m.cells[n + step]) ? byColor ? c : 1 : 0;
          mask[row + i] = v_;
          if (v_) hasAny = true;
        }
      }
      if (!hasAny) continue;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ink = mask[j * w + i];
        if (!ink) continue;
        let a = 1, b = 1;
        while (i + a < w && mask[j * w + i + a] === ink) a++;
        rows: while (j + b < h) {
          for (let k = 0; k < a; k++) if (mask[(j + b) * w + i + k] !== ink) break rows;
          b++;
        }
        for (let k = 0; k < b; k++) mask.fill(0, (j + k) * w + i, (j + k) * w + i + a);
        emit({ d, sign, layer, i, j, w: a, h: b, ink });
      }
    }
  }
}

export function surfaceMesh(m: VoxelModel) {
  const positions: number[] = [], indices: number[] = [];
  const origin = [-m.width / 2, -0.5, -m.depth / 2], p = [0, 0, 0];
  return {
    quad({ d, sign, layer, i, j, w, h }: Face) {
      const u = (d + 1) % 3, v = (d + 2) % 3, first = positions.length / 3;
      p[d] = origin[d] + layer + Number(sign > 0);
      for (let k = 0; k < 4; k++) {
        p[u] = origin[u] + i + (k === 1 || k === 2 ? w : 0);
        p[v] = origin[v] + j + (k >= 2 ? h : 0);
        positions.push(p[0], p[1], p[2]);
      }
      const b = first + (sign > 0 ? 1 : 3), c = first + 2, e = first + (sign > 0 ? 3 : 1);
      indices.push(first, b, c, first, c, e);
    },
    finish() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      return geometry;
    },
  };
}
