import { fill, model, type VoxelModel } from "../voxel/grid";

export function mushroom(): VoxelModel {
  const m = model(11, 11, 11);
  fill(m, (x, y, z) => {
    if (y < 7 && Math.hypot(x + Number(y < 3), z) < (y === 4 || y === 0 ? 2.1 : 1.5)) return y === 4 ? 11 : 21;
    if (y >= 5 && (x / 5.3) ** 2 + (z / 5.2) ** 2 + ((y - 5) / 4.8) ** 2 < 1)
      return y === 5 ? (Math.abs(x) === Math.abs(z) ? 11 : 21) : (x + 2) ** 2 + (z - 1) ** 2 <= 1 || (x - 2) ** 2 + (z + 2) ** 2 <= 2 ? 18 : y < 7 ? 19 : 20;
    return 0;
  });
  return m;
}

export function grass(): VoxelModel {
  const m = model(9, 11, 9);
  fill(m, (x, y, z) => {
    if (Math.abs(z) < 1 && Math.abs(x - Math.floor(y * y / 35)) < (y < 4 ? 1.5 : 0.6)) return y > 7 ? 8 : 10;
    if (y < 6 && x === -2 - Math.floor(y / 3) && z === -1 - Math.floor(y / 3)) return 10;
    if (y < 8 && x === -Math.floor(y * 0.48) && z === Math.floor(y * 0.24)) return 10;
    if (y < 6 && x === Math.floor(y * 0.3) && z === -Math.floor(y * 0.5)) return 7;
    return 0;
  });
  return m;
}
