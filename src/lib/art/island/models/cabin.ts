import { fill, model, type VoxelModel } from "../voxel/grid";

export function cabin(): VoxelModel {
  const m = model(35, 34, 31);
  fill(m, (x, y, z) => {
    if (y < 19 && Math.abs(x) < 13 && Math.abs(z) < 11) {
      if (z > 9 && x < -2 && x > -8 && y < 14) return 2;
      if (z > 9 && x > 3 && x < 9 && y > 6 && y < 13) return y === 9 || x === 6 ? 3 : 17;
      return y % 4 === 0 ? 4 : 3;
    }
    if (y >= 19 && Math.abs(x) < 18 - (y - 19) && Math.abs(z) < 15) return y % 3 === 0 ? 14 : 13;
    if (x > 7 && x < 11 && z < -2 && z > -7 && y > 22) return y % 3 === 0 ? 15 : 13;
    return 0;
  });
  return m;
}
