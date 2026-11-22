import { fill, model, type VoxelModel } from "../voxel/grid";

export const CHARACTER_HEAD = 24;
export const CHARACTER_SCALE = 1.575 / 32;

export function character(): VoxelModel {
  const m = model(16, 32, 8);
  fill(m, (x, y, z) => {
    if (y < 12) return Math.abs(x) < 4 && Math.abs(z) < 2 ? (y < 2 ? 31 : Math.abs(x) < 1 ? 33 : 30) : 0;
    if (y < CHARACTER_HEAD && Math.abs(z) < 2) {
      if (Math.abs(x) < 4) return 29;
      return y >= 20 ? 29 : 24;
    }
    if (y >= CHARACTER_HEAD && Math.abs(x) < 4) {
      if (y >= 30 || z < -2 || Math.abs(x) > 2.5 && y >= 28) return 25;
      if (z > 2.5) {
        if (y === 29 && x < -1) return 25;
        if (y === 28 && Math.abs(x) > 1 && Math.abs(x) < 3) return Math.abs(x) < 2 ? 28 : 27;
        if (y === 27 && Math.abs(x) < 1) return 32;
        if (y < 27 && Math.abs(x) < 2) return y === 25 && Math.abs(x) < 1 ? 32 : 26;
      }
      return 24;
    }
    return 0;
  });
  return m;
}
