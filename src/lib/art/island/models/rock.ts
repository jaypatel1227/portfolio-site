import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function rock(seed: number): VoxelModel {
  const m = model(15, 12, 13);
  const phase = random(seed)() * 4;
  fill(m, (x, y, z) => {
    const cap = 9 - Math.max(0, x * 0.67 + z * 0.25, -x * 0.83 + z * 0.53, -z * 0.95);
    if (Math.abs(x) + Math.abs(z) * 0.8 > 8.5 || y > cap + Math.sin(phase + z * 0.4) * 0.7 || x + y + z * 0.45 > 10) return 0;
    const seam = y + x * 0.41 - z * 0.2 - phase - 2;
    if (Math.abs(seam) < 0.55 && z > -3) return 15;
    return x + y + z * 0.45 > 8.5 || y >= 7 ? 14 : seam < -1 && x < 0 ? 12 : 13;
  });
  return m;
}
