import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function pine(seed: number): VoxelModel {
  const m = model(23, 47, 23);
  const phase = random(seed)() * 7;
  fill(m, (x, y, z) => {
    const radius = Math.hypot(x, z), angle = Math.atan2(z, x);
    const tier = Math.floor((y - 6) / 8), t = (y - 6) % 8;
    const lobe = Math.cos(angle * 5 + phase + tier * 1.9);
    const spread = (1 - (y - 6) / 42) * 10.8;
    const width = spread * (0.89 + lobe * 0.14) - t * Math.min(0.42, spread * 0.06);
    if (y >= 6 && radius < width && !(t === 0 && radius > width * 0.68 && lobe < -0.2)) {
      return lobe > 0.55 && radius > width * 0.77 && t < 4 ? 8 : lobe > -0.1 && t < 6 ? 7 : 6;
    }
    return y < 24 && radius < 1.6 + Math.max(0, 3 - y) * 0.52 ? (x < 0 ? 4 : 3) : 0;
  });
  return m;
}
