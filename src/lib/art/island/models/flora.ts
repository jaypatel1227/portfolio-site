import { fill, model, type VoxelModel } from "../voxel/grid";

export function mushroom(): VoxelModel {
  const m = model(11, 11, 11);
  fill(m, (x, y, z) => {
    if (y < 7 && Math.hypot(x, z) < 1.2) return 21;
    if (y > 5 && (x / 5) ** 2 + (z / 5) ** 2 + ((y - 6) / 4) ** 2 < 1) return (x * 2 + z * 3 & 7) === 0 ? 18 : 20;
    return 0;
  });
  return m;
}

export function grass(): VoxelModel {
  const m = model(9, 11, 9);
  fill(m, (x, y, z) => {
    if (Math.abs(z) < 0.6 && (Math.abs(x) < 0.6 || y < 8 && Math.abs(x - y * 0.4) < 0.6 || y < 7 && Math.abs(x + y * 0.4) < 0.6)) return y > 7 ? 8 : 10;
    return 0;
  });
  return m;
}
