import { random, trailX } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function island(seed: number): VoxelModel {
  const m = model(97, 7, 89);
  const rng = random(seed);
  fill(m, (x, y, z) => {
    if ((x / (46 - (6 - y) * 0.7)) ** 2 + (z / (42 - (6 - y) * 0.7)) ** 2 > 1 + Math.sin(x * 0.4 + z * 0.3) * 0.035) return 0;
    if (y < 6) return y % 3 === 0 ? 2 : 3;
    const wx = x * 0.44, wz = z * 0.44;
    if (Math.abs(wx - trailX(wz)) < 1.2 && wz > -4) return rng() < 0.3 ? 12 : 11;
    return rng() < 0.2 ? 10 : 9;
  });
  return m;
}
