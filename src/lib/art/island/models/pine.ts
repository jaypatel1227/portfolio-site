import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function pine(seed: number): VoxelModel {
  const m = model(23, 47, 23);
  const phase = random(seed)() * 7;
  fill(m, (x, y, z) => {
    const radius = Math.hypot(x, z), angle = Math.atan2(z, x);
    const bough = Math.cos(angle * 5 + phase + Math.floor((y - 7) / 8) * 1.8);
    const tier = (y - 7) % 8, width = (1 - (y - 7) / 41) * 10.7 - tier * 0.39;
    if (y >= 7 && radius < width + bough * Math.min(1.3, width * 0.18)) {
      return tier < 2 && bough > 0.05 && radius > width - 1.2 ? 8 : tier > 5 || bough > 0.65 ? 7 : 6;
    }
    return y < 24 && radius < 1.6 + Math.max(0, 3 - y) * 0.52 ? (x < 0 ? 4 : 3) : 0;
  });
  return m;
}
