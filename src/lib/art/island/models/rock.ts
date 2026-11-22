import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function rock(seed: number): VoxelModel {
  const m = model(15, 12, 13);
  const phase = random(seed)() * 4;
  fill(m, (x, y, z) => {
    const cap = 9 - Math.max(0, x * 0.67 + z * 0.25, -x * 0.83 + z * 0.53, -z * 0.95);
    if (Math.abs(x) + Math.abs(z) * 0.8 > 8.5 || y > cap + Math.sin(phase + z * 0.4) * 0.7) return 0;
    if (Math.abs(y + x * 0.41 - z * 0.2 - phase - 2) < 0.5) return 12;
    return y > 6 ? 15 : x - z < -2 ? 14 : 13;
  });
  return m;
}
