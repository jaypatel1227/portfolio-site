import { fill, model, type VoxelModel } from "../voxel/grid";

export function character(): VoxelModel {
  const m = model(15, 27, 13);
  fill(m, (x, y, z) => {
    if (y < 5) return Math.abs(z) < 3 && Math.abs(x) > 1 && Math.abs(x) < 5 ? (y < 2 ? 2 : 22) : 0;
    if (y < 15 && Math.abs(x) < 5 && Math.abs(z) < 3) return y > 12 ? 19 : 22;
    if (y > 6 && y < 15 && Math.abs(x) < 7 && Math.abs(z) < 2) return y < 9 ? 21 : 22;
    if (y >= 15 && y < 25 && Math.abs(x) < 5 && Math.abs(z) < 5) {
      if (z > 1 && y < 22) return y === 19 && Math.abs(x) > 1 && Math.abs(x) < 4 ? 2 : 21;
      return y > 22 ? 17 : 16;
    }
    if (y > 7 && y < 15 && z < -2 && z > -5 && Math.abs(x) < 4) return 16;
    return 0;
  });
  return m;
}
