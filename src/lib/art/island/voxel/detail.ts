import { model, voxel, type VoxelModel } from "./grid";
import { finish } from "./steps";

export type DetailKind = "oak" | "cabin" | "pine" | "rock" | "ground" | "pond";

export function detailModel(base: VoxelModel, seed: number, kind: DetailKind): VoxelModel {
  return finish(detailLayers(base, seed, kind));
}

export function* detailLayers(base: VoxelModel, seed: number, kind: DetailKind) {
  const m = model(base.width * 2, base.height * 2, base.depth * 2);
  for (let y = 0; y < m.height; y++) for (let z = 0; z < m.depth; z++) for (let x = 0; x < m.width; x++) {
    if (!x && z % 16 === 0) yield;
    const ox = Math.floor(x / 2), oy = Math.floor(y / 2), oz = Math.floor(z / 2);
    let index = voxel(base, ox, oy, oz);
    if (!index) continue;
    const px = (x - (m.width - 1) / 2) / 2, pz = (z - (m.depth - 1) / 2) / 2, py = y / 2;
    const noise = ((Math.imul(x + seed, 73856093) ^ Math.imul(y + 3, 19349663) ^ Math.imul(z, 83492791)) >>> 0) % 101;
    if (kind === "oak" && (index === 3 || index === 4)) {
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
      const lichen = Math.sin(px * 0.53 + pz * 0.3) + Math.cos(pz * 0.88 - py * 0.35);
      if (py > base.height * 0.48 && lichen > 1.15 + noise * 0.002) index = lichen > 1.65 ? 8 : 10;
    } else if (kind === "pine" && index >= 6 && index <= 8) {
      if (index === 7 && (x + 2 * z + Math.floor(py)) % 11 === 0 && noise < 70) index = 8;
    } else if (kind === "ground" && oy === base.height - 1) {
      if (index === 11 || index === 12) { if (noise < 4) index = 13; }
      else if (noise < 6) index = 10;
    } else if (kind === "pond" && index === 22) {
      if (Math.sin(pz * 1.8 + Math.cos(px * 0.45) * 0.8) > 0.94 && Math.cos(px * 0.7 + pz) > 0.4) index = 23;
    }
    m.cells[(y * m.depth + z) * m.width + x] = index;
  }
  return m;
}
