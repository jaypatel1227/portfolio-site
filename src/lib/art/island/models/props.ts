import { fill, model, type VoxelModel } from "../voxel/grid";

export function lantern(): VoxelModel {
  const m = model(9, 24, 9);
  fill(m, (x, y, z) => {
    if (y < 13) return Math.abs(x) < 0.7 && Math.abs(z) < 0.7 ? 4 : 0;
    if (y < 16 || y > 21) return Math.abs(x) + Math.abs(z) < 6 - Math.abs(y - 19) * 0.4 ? 3 : 0;
    if (Math.abs(x) < 3 && Math.abs(z) < 3) return (Math.abs(x) > 1 && Math.abs(z) > 1) ? 3 : y > 19 ? 18 : 17;
    return 0;
  });
  return m;
}

export function sign(): VoxelModel {
  const m = model(21, 25, 7);
  fill(m, (x, y, z) => {
    if (y < 14 && Math.abs(x) < 1 && Math.abs(z) < 1) return 4;
    if (y >= 14 && y < 23 && Math.abs(x) < 10 && Math.abs(z) < 2) return y === 14 || y === 22 ? 3 : 16;
    return 0;
  });
  return m;
}
