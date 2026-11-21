import { model, voxel, type VoxelModel } from "./slices";

export type DetailKind = "oak" | "cabin" | "pine" | "rock" | "ground" | "pond";

export function detailModel(base: VoxelModel, seed: number, kind: DetailKind): VoxelModel {
  const m = model(base.width * 2, base.height * 2, base.depth * 2);
  for (let y = 0; y < m.height; y++) for (let z = 0; z < m.depth; z++) for (let x = 0; x < m.width; x++) {
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
      if (index === 3 || index === 4) index = y % 8 === 0 || (Math.floor(y / 8) % 2 ? x : x + 13) % 39 === 0 ? 2 : noise < 8 ? 4 : 3;
      if (index === 13 || index === 14) index = (x + Math.floor(y / 4) * 3) % 12 === 0 || y % 5 === 0 ? 13 : 14;
      if (px > 7 && px < 11 && pz < -2 && py > 22) index = y % 4 === 0 || (x + Math.floor(y / 4) * 3) % 8 === 0 ? 13 : 4;
      if (index === 17 && noise < 22) index = 18;
    } else if (kind === "rock") {
      if (Math.sin(px * 0.8 + py * 0.9 + Math.sin(pz)) > 0.94) index = 13;
      else if (py > base.height * 0.5 && noise < 32) index = noise < 12 ? 10 : 6;
    } else if (kind === "pine" && index >= 6 && index <= 8) {
      index = y % 4 === 0 ? 8 : noise < 20 ? 7 : 6;
    } else if (kind === "ground" && oy === base.height - 1) {
      if (index === 11 || index === 12) index = noise < 7 ? 13 : noise < 17 ? 12 : 11;
      else if (noise < 6) index = 10;
    } else if (kind === "pond") {
      index = Math.sin(px * 1.9 + pz * 2.1) > 0.93 ? 23 : noise < 10 ? 6 : 22;
    }
    m.cells[(y * m.depth + z) * m.width + x] = index;
  }
  return m;
}
