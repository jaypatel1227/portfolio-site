import { fill, model, type VoxelModel } from "../voxel/grid";

export function lantern(): VoxelModel {
  const m = model(9, 24, 9);
  fill(m, (x, y, z) => {
    const r = Math.max(Math.abs(x), Math.abs(z));
    if (y < 3) return r < 2.5 - y * 0.3 ? 13 : 0;
    if (y < 13) return r < (y < 5 || y === 11 ? 1.5 : 1) ? y < 5 ? 13 : 4 : 0;
    if (y < 16 || y > 21) return r <= (y > 21 ? 4 - (y - 22) * 2 : y - 12) ? y === 15 ? 16 : 3 : 0;
    if (r === 3 && (Math.abs(x) === Math.abs(z) || y === 16)) return 3;
    if (r < 3) return y < 18 && r < 2 || y === 19 && x === 0 ? 18 : y <= 19 ? 17 : 16;
    return 0;
  });
  return m;
}

export function sign(): VoxelModel {
  const m = model(21, 25, 7);
  fill(m, (x, y, z) => {
    if (y < 20 && Math.abs(x) <= 1 && z >= -2 && z <= -1) return x < 0 ? 3 : 4;
    if (y >= 14 && y < 23 && x > -10 && x <= 10 - Math.abs(y - 18) && Math.abs(z) < 2)
      return z === 1 && (x === -7 || x === 3) && y === 18 ? 13 : y === 15 || y === 21 ? 4 : 16;
    return 0;
  });
  return m;
}
