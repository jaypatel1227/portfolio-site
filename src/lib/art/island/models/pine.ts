import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function pine(seed: number): VoxelModel {
  const m = model(23, 47, 23);
  const phase = random(seed)() * 7;
  fill(m, (x, y, z) => {
    const radius = Math.hypot(x, z);
    const tier = (y - 7) % 8;
    const width = (1 - (y - 6) / 42) * 11 - tier * 0.42;
    if (y > 6 && radius < width + Math.sin(Math.atan2(z, x) * 6 + phase) * 0.6) {
      return y % 8 > 5 ? 8 : 6 + ((Math.floor(x / 3) + Math.floor(z / 3) + Math.floor(y / 3) & 3) === 0 ? 1 : 0);
    }
    return y < 24 && radius < 1.6 ? (x < 0 ? 4 : 3) : 0;
  });
  return m;
}
