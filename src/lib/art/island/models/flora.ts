import { fill, model, type VoxelModel } from "../voxel/grid";

export function mushroom(): VoxelModel {
  const m = model(11, 11, 11);
  fill(m, (x, y, z) => {
    if (y < 7 && Math.hypot(x, z) < (y === 4 ? 2.1 : 1.3)) return 21;
    if (y > 5 && (x / 5) ** 2 + (z / 5) ** 2 + ((y - 6) / 4) ** 2 < 1)
      return y === 6 ? 19 : (x + 2) ** 2 + (z - 1) ** 2 <= 2 || (x - 2) ** 2 + (z + 2) ** 2 <= 1 ? 18 : 20;
    return 0;
  });
  return m;
}

export function grass(): VoxelModel {
  const m = model(9, 11, 9);
  fill(m, (x, y, z) => {
    if (Math.abs(z) < 1 && Math.abs(x - Math.floor(y * y / 48)) < (y < 5 ? 1.6 : 0.6)) return y > 7 ? 8 : 10;
    if (y < 8 && x === -Math.floor(y * 0.48) && z === Math.floor(y * 0.24)) return 10;
    if (y < 6 && x === Math.floor(y * 0.3) && z === -Math.floor(y * 0.5)) return 7;
    return 0;
  });
  return m;
}
