import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function rock(seed: number): VoxelModel {
  const m = model(15, 12, 13);
  const phase = random(seed)() * 4;
  fill(m, (x, y, z) => (x / 7) ** 2 + (z / 6) ** 2 + (y / 10) ** 2 < 1 + Math.sin(x + z + phase) * 0.12 ? (y > 7 ? 15 : x < -2 ? 14 : 13) : 0);
  return m;
}
