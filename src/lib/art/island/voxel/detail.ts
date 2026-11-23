import { model, type VoxelModel } from "./grid";
import { finish } from "./steps";

export type DetailKind = "oak" | "cabin" | "pine" | "rock" | "ground" | "pond";

export function detailModel(base: VoxelModel, seed: number, kind: DetailKind): VoxelModel {
  return finish(detailLayers(base, seed, kind));
}

export function* detailLayers(base: VoxelModel, seed: number, kind: DetailKind) {
  const bw = base.width, bh = base.height, bd = base.depth;
  const mw = bw * 2, md = bd * 2;
  const m = model(mw, bh * 2, md);
  const cells = m.cells, bcells = base.cells;
  const halfW = (mw - 1) / 2, halfD = (md - 1) / 2;
  const rockCutoff = bh * 0.48;
  const groundTop = bh - 1;
  const rowStride = mw, layerStride = mw * md;
  for (let oy = 0; oy < bh; oy++) {
    const y0 = oy * 2;
    const fastCopy = kind === "ground" && oy !== groundTop;
    for (let oz = 0; oz < bd; oz++) {
      if ((oz & 7) === 0) yield;
      const z0 = oz * 2;
      const bRow = (oy * bd + oz) * bw;
      for (let ox = 0; ox < bw; ox++) {
        const baseIndex = bcells[bRow + ox];
        if (!baseIndex) continue;
        const x0 = ox * 2;
        const canFastCopy =
          fastCopy ||
          (kind === "oak" && baseIndex !== 3 && baseIndex !== 4) ||
          (kind === "pine" && baseIndex !== 7) ||
          (kind === "pond" && baseIndex !== 22);
        if (canFastCopy) {
          const i00 = y0 * layerStride + z0 * rowStride + x0;
          const i01 = i00 + rowStride;
          const i10 = i00 + layerStride;
          const i11 = i10 + rowStride;
          cells[i00] = baseIndex; cells[i00 + 1] = baseIndex;
          cells[i01] = baseIndex; cells[i01 + 1] = baseIndex;
          cells[i10] = baseIndex; cells[i10 + 1] = baseIndex;
          cells[i11] = baseIndex; cells[i11 + 1] = baseIndex;
          continue;
        }
        for (let dy = 0; dy < 2; dy++) {
          const y = y0 + dy, py = y / 2;
          const yOff = y * layerStride;
          const hy = Math.imul(y + 3, 19349663);
          for (let dz = 0; dz < 2; dz++) {
            const z = z0 + dz, pz = (z - halfD) / 2;
            const yzOff = yOff + z * rowStride;
            const hz = hy ^ Math.imul(z, 83492791);
            for (let dx = 0; dx < 2; dx++) {
              const x = x0 + dx, px = (x - halfW) / 2;
              let index = baseIndex;
              const noise = ((Math.imul(x + seed, 73856093) ^ hz) >>> 0) % 101;
              if (kind === "oak") {
                const groove = Math.sin(Math.atan2(pz, px - Math.sin(py * 0.06) * 3) * 19 + Math.sin(py * 0.18));
                index = groove > 0.72 ? 2 : groove < -0.5 ? 4 : 3;
                const knot = ((px - 2) / 1.7) ** 2 + ((py - 28) / 2.6) ** 2;
                if (pz > 2 && knot < 1.4) index = knot < 0.25 ? 2 : knot < 0.8 ? 4 : 2;
                const hollow = (px / 2.1) ** 2 + ((py - 16) / 4.5) ** 2;
                if (pz > 2 && hollow < 1) index = pz > 3 ? 0 : 2;
                if (py < 7 && noise < 13) index = 10;
              } else if (kind === "cabin") {
                if (index === 3 && py < 18 && y % 8 === 0 && Math.abs(px) < 11) index = 2;
                if (index === 13 && py >= 18 && (z + Math.floor(y / 6) * 7) % 17 === 0 && y % 6 > 0) index = 12;
                if (px >= 6 && px <= 12 && pz >= -8 && pz <= -2 && py >= 24 && py < 32) index = y % 6 === 0 || (x + z + Math.floor(y / 6) * 4) % 12 === 0 ? 13 : 4;
                if (index === 17 && noise < 22) index = 18;
              } else if (kind === "rock") {
                if (py > rockCutoff) {
                  const lichen = Math.sin(px * 0.53 + pz * 0.3) + Math.cos(pz * 0.88 - py * 0.35);
                  if (lichen > 1.15 + noise * 0.002) index = lichen > 1.65 ? 8 : 10;
                }
              } else if (kind === "pine") {
                if ((x + 2 * z + Math.floor(py)) % 11 === 0 && noise < 70) index = 8;
              } else if (kind === "ground") {
                if (index === 11 || index === 12) { if (noise < 4) index = 13; }
                else if (noise < 6) index = 10;
              } else if (kind === "pond") {
                if (Math.sin(pz * 1.8 + Math.cos(px * 0.45) * 0.8) > 0.94 && Math.cos(px * 0.7 + pz) > 0.4) index = 23;
              }
              cells[yzOff + x] = index;
            }
          }
        }
      }
    }
  }
  return m;
}
